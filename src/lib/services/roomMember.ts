import { randomBytes } from "crypto";

import {
  AnonymousApprovalMode,
  MemberRole,
  RoomParticipantRole,
  RoomParticipantSource,
  RoomStatus,
  type Prisma,
  type Room,
  type RoomAnonymousProfile,
  type RoomSession,
  type Workspace,
} from "@prisma/client";

import { findMemberByWorkspaceAndUserId } from "@/lib/prisma/member";
import { findRoomById } from "@/lib/prisma/room";
import { findWorkspaceById } from "@/lib/prisma/workspace";
import {
  createAnonymousProfile,
  createRoomParticipant,
  createRoomSession,
  findAnonymousProfileByToken,
  findRoomParticipantByAnonymousProfileId,
  findRoomParticipantByUserId,
  findRoomSessionByConnectionId,
  listActiveParticipantIds,
  listRoomParticipantsWithSessions,
  markRoomSessionDisconnected,
  reconnectRoomSession,
  updateAnonymousProfile,
  updateRoomParticipant,
  updateRoomSessionHeartbeat,
} from "@/lib/prisma/roomMember";
import type {
  RoomParticipantWithActiveSessions,
  RoomParticipantWithRelations,
} from "@/lib/prisma/roomMember";

const DISPLAY_NAME_MIN_LENGTH = 2;
const DISPLAY_NAME_MAX_LENGTH = 48;

export type RoomMemberServiceErrorCode =
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "LIMIT_REACHED"
  | "CONFLICT";

export class RoomMemberServiceError extends Error {
  constructor(
    message: string,
    public readonly code: RoomMemberServiceErrorCode,
    public readonly field?: "displayName",
  ) {
    super(message);
    this.name = "RoomMemberServiceError";
  }
}

export type MemberJoinInput = {
  kind: "MEMBER";
  roomId: string;
  userId: string;
  connectionId: string;
  clientInfo?: Prisma.JsonValue;
};

export type AnonymousJoinInput = {
  kind: "ANONYMOUS";
  roomId: string;
  displayName: string;
  connectionId: string;
  slugToken?: string | null;
  clientInfo?: Prisma.JsonValue;
};

export type JoinRoomInput = MemberJoinInput | AnonymousJoinInput;

export type JoinRoomResult = {
  room: Room;
  participant: RoomParticipantWithRelations;
  session: RoomSession;
  mode: JoinRoomInput["kind"];
  isNewParticipant: boolean;
  workspaceRole?: MemberRole;
  profile?: RoomAnonymousProfile;
};

export type LeaveRoomInput = {
  roomId: string;
  connectionId: string;
};

function ensureRoomAvailable(room: Room): Room {
  if (room.status !== RoomStatus.ACTIVE) {
    throw new RoomMemberServiceError("Комната недоступна для подключения.", "FORBIDDEN");
  }

  return room;
}

async function fetchRoomContext(roomId: string): Promise<{ room: Room; workspace: Workspace }> {
  const room = await findRoomById(roomId);

  if (!room) {
    throw new RoomMemberServiceError("Комната не найдена.", "NOT_FOUND");
  }

  const workspace = await findWorkspaceById(room.workspaceId);

  if (!workspace) {
    throw new RoomMemberServiceError("Рабочая область не найдена.", "NOT_FOUND");
  }

  return { room: ensureRoomAvailable(room), workspace };
}

function mapMemberRoleToParticipantRole(role: MemberRole, isOwner: boolean): RoomParticipantRole {
  if (isOwner || role === MemberRole.ADMIN) {
    return RoomParticipantRole.HOST;
  }

  if (role === MemberRole.EDITOR) {
    return RoomParticipantRole.COLLABORATOR;
  }

  return RoomParticipantRole.VIEWER;
}

function normalizeDisplayName(raw: string): string {
  const value = raw.trim();

  if (value.length < DISPLAY_NAME_MIN_LENGTH) {
    throw new RoomMemberServiceError(
      `Имя должно содержать минимум ${DISPLAY_NAME_MIN_LENGTH} символа(-ов).`,
      "VALIDATION_ERROR",
      "displayName",
    );
  }

  if (value.length > DISPLAY_NAME_MAX_LENGTH) {
    throw new RoomMemberServiceError(
      `Имя не может превышать ${DISPLAY_NAME_MAX_LENGTH} символов.`,
      "VALIDATION_ERROR",
      "displayName",
    );
  }

  return value;
}

function generateSlugToken(): string {
  return randomBytes(12).toString("base64url");
}

async function ensureMemberAccess(
  workspace: Workspace,
  room: Room,
  userId: string,
): Promise<{ role: MemberRole; isOwner: boolean }> {
  if (workspace.ownerId === userId) {
    return { role: MemberRole.ADMIN, isOwner: true };
  }

  const membership = await findMemberByWorkspaceAndUserId(room.workspaceId, userId);

  if (!membership) {
    throw new RoomMemberServiceError(
      "Вы не являетесь участником этой рабочей области.",
      "FORBIDDEN",
    );
  }

  return { role: membership.role, isOwner: false };
}

async function ensureAnonymousAllowed(room: Room) {
  if (room.requiresMemberAccount) {
    throw new RoomMemberServiceError(
      "Анонимные подключения запрещены в этой комнате.",
      "FORBIDDEN",
    );
  }

  if (!room.allowAnonymousJoin) {
    throw new RoomMemberServiceError("Комната не принимает анонимных участников.", "FORBIDDEN");
  }

  if (room.anonymousApprovalMode === AnonymousApprovalMode.MANUAL) {
    throw new RoomMemberServiceError(
      "Для этой комнаты требуется ручное подтверждение анонимов.",
      "FORBIDDEN",
    );
  }
}

async function upsertParticipantForMember(
  room: Room,
  workspace: Workspace,
  userId: string,
  activeParticipantIds: string[],
): Promise<{ participant: RoomParticipantWithRelations; role: MemberRole; isNew: boolean }> {
  const { role, isOwner } = await ensureMemberAccess(workspace, room, userId);
  const targetRole = mapMemberRoleToParticipantRole(role, isOwner);
  const existing = await findRoomParticipantByUserId(room.id, userId);

  if (!existing) {
    if (room.maxParticipants && activeParticipantIds.length >= room.maxParticipants) {
      throw new RoomMemberServiceError("Превышен лимит участников комнаты.", "LIMIT_REACHED");
    }

    const created = await createRoomParticipant({
      room: { connect: { id: room.id } },
      user: { connect: { id: userId } },
      role: targetRole,
      source: RoomParticipantSource.WORKSPACE_MEMBER,
    });

    return { participant: created, role, isNew: true };
  }

  if (existing.role !== targetRole) {
    const updated = await updateRoomParticipant(existing.id, { role: targetRole });
    return { participant: updated, role, isNew: false };
  }

  return { participant: existing, role, isNew: false };
}

async function upsertParticipantForAnonymous(
  room: Room,
  displayName: string,
  slugToken: string | null | undefined,
  activeParticipantIds: string[],
): Promise<{
  participant: RoomParticipantWithRelations;
  profile: RoomAnonymousProfile;
  isNew: boolean;
}> {
  await ensureAnonymousAllowed(room);

  let profile = slugToken ? await findAnonymousProfileByToken(room.id, slugToken) : null;

  if (!profile) {
    if (room.maxParticipants && activeParticipantIds.length >= room.maxParticipants) {
      throw new RoomMemberServiceError("Превышен лимит участников комнаты.", "LIMIT_REACHED");
    }

    profile = await createAnonymousProfile({
      room: { connect: { id: room.id } },
      displayName,
      slugToken: slugToken ?? generateSlugToken(),
    });
  }

  const updateData: Prisma.RoomAnonymousProfileUpdateArgs["data"] = { lastUsedAt: new Date() };

  if (profile.displayName !== displayName) {
    Object.assign(updateData, { displayName });
  }

  profile = await updateAnonymousProfile(profile.id, updateData);

  let participant = await findRoomParticipantByAnonymousProfileId(room.id, profile.id);

  if (!participant) {
    if (room.maxParticipants && activeParticipantIds.length >= room.maxParticipants) {
      throw new RoomMemberServiceError("Превышен лимит участников комнаты.", "LIMIT_REACHED");
    }

    participant = await createRoomParticipant({
      room: { connect: { id: room.id } },
      anonymousProfile: { connect: { id: profile.id } },
      role: RoomParticipantRole.GUEST,
      source: RoomParticipantSource.ANONYMOUS,
    });

    return { participant, profile, isNew: true };
  }

  return { participant, profile, isNew: false };
}

async function ensureCapacity(
  room: Room,
  participantId: string,
  activeParticipantIds: string[],
): Promise<void> {
  if (!room.maxParticipants) {
    return;
  }

  if (activeParticipantIds.length < room.maxParticipants) {
    return;
  }

  if (activeParticipantIds.includes(participantId)) {
    return;
  }

  throw new RoomMemberServiceError("Превышен лимит участников комнаты.", "LIMIT_REACHED");
}

async function ensureSessionForParticipant(
  room: Room,
  participant: RoomParticipantWithRelations,
  connectionId: string,
  clientInfo?: Prisma.JsonValue,
): Promise<RoomSession> {
  const existingSession = await findRoomSessionByConnectionId(connectionId);

  if (existingSession) {
    if (existingSession.participantId !== participant.id || existingSession.roomId !== room.id) {
      throw new RoomMemberServiceError(
        "Соединение уже используется другим участником.",
        "CONFLICT",
      );
    }

    return reconnectRoomSession(existingSession.id, clientInfo ?? undefined);
  }

  return createRoomSession({
    room: { connect: { id: room.id } },
    participant: { connect: { id: participant.id } },
    connectionId,
    clientInfo: clientInfo ?? undefined,
  });
}

export async function joinRoom(input: JoinRoomInput): Promise<JoinRoomResult> {
  const { room, workspace } = await fetchRoomContext(input.roomId);
  const activeParticipantIds = await listActiveParticipantIds(room.id);

  if (input.kind === "MEMBER") {
    const { participant, role, isNew } = await upsertParticipantForMember(
      room,
      workspace,
      input.userId,
      activeParticipantIds,
    );

    await ensureCapacity(room, participant.id, activeParticipantIds);

    const session = await ensureSessionForParticipant(
      room,
      participant,
      input.connectionId,
      input.clientInfo,
    );

    return {
      room,
      participant,
      session,
      mode: input.kind,
      workspaceRole: role,
      isNewParticipant: isNew,
    };
  }

  const displayName = normalizeDisplayName(input.displayName);
  const { participant, profile, isNew } = await upsertParticipantForAnonymous(
    room,
    displayName,
    input.slugToken,
    activeParticipantIds,
  );

  await ensureCapacity(room, participant.id, activeParticipantIds);

  const session = await ensureSessionForParticipant(
    room,
    participant,
    input.connectionId,
    input.clientInfo,
  );

  return {
    room,
    participant,
    session,
    mode: input.kind,
    profile,
    isNewParticipant: isNew,
  };
}

export async function leaveRoom(input: LeaveRoomInput): Promise<RoomSession> {
  const session = await findRoomSessionByConnectionId(input.connectionId);

  if (!session || session.roomId !== input.roomId) {
    throw new RoomMemberServiceError("Сессия подключения не найдена.", "NOT_FOUND");
  }

  if (session.disconnectedAt) {
    return session;
  }

  return markRoomSessionDisconnected(session.id);
}

export async function heartbeat(connectionId: string): Promise<RoomSession | null> {
  const session = await findRoomSessionByConnectionId(connectionId);

  if (!session || session.disconnectedAt) {
    return null;
  }

  return updateRoomSessionHeartbeat(session.id);
}

export async function listRoomParticipants(
  roomId: string,
): Promise<RoomParticipantWithActiveSessions[]> {
  return listRoomParticipantsWithSessions(roomId);
}

export type SerializedRoomParticipant = {
  id: string;
  roomId: string;
  role: RoomParticipantRole;
  source: RoomParticipantSource;
  displayName: string;
  isAnonymous: boolean;
  isOnline: boolean;
  connectedClients: number;
  lastSeenAt: string | null;
  joinedAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string | null;
    email: string | null;
  };
  anonymousProfile?: {
    id: string;
    displayName: string;
  };
};

function resolveParticipantDisplayName(participant: RoomParticipantWithRelations): string {
  if (participant.user) {
    return participant.user.name ?? participant.user.email ?? "Участник";
  }

  if (participant.anonymousProfile) {
    return participant.anonymousProfile.displayName;
  }

  return "Неизвестный участник";
}

function resolveParticipantLastSeen(
  participant: RoomParticipantWithRelations,
  sessions: readonly RoomSession[],
): Date | null {
  if (sessions.length > 0) {
    const [primary] = sessions;
    return primary.lastPingAt ?? primary.connectedAt;
  }

  return participant.updatedAt;
}

export function serializeParticipantWithSessions(
  participant: RoomParticipantWithRelations,
  sessions: readonly RoomSession[],
): SerializedRoomParticipant {
  const activeSessions = sessions.filter((session) => !session.disconnectedAt);
  const isOnline = activeSessions.length > 0;
  const lastSeenDate = resolveParticipantLastSeen(participant, activeSessions);

  return {
    id: participant.id,
    roomId: participant.roomId,
    role: participant.role,
    source: participant.source,
    displayName: resolveParticipantDisplayName(participant),
    isAnonymous: participant.source === RoomParticipantSource.ANONYMOUS,
    isOnline,
    connectedClients: activeSessions.length,
    lastSeenAt: lastSeenDate ? lastSeenDate.toISOString() : null,
    joinedAt: participant.createdAt.toISOString(),
    updatedAt: participant.updatedAt.toISOString(),
    user: participant.user
      ? {
          id: participant.user.id,
          name: participant.user.name,
          email: participant.user.email,
        }
      : undefined,
    anonymousProfile: participant.anonymousProfile
      ? {
          id: participant.anonymousProfile.id,
          displayName: participant.anonymousProfile.displayName,
        }
      : undefined,
  };
}

export function serializeRoomParticipantsForClient(
  participants: RoomParticipantWithActiveSessions[],
): SerializedRoomParticipant[] {
  return participants.map((participant) =>
    serializeParticipantWithSessions(participant, participant.sessions),
  );
}

export function serializeParticipantFromJoin(result: JoinRoomResult): SerializedRoomParticipant {
  return serializeParticipantWithSessions(result.participant, [result.session]);
}
