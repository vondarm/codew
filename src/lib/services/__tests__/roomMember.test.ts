import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AnonymousApprovalMode,
  MemberRole,
  RoomParticipantRole,
  RoomParticipantSource,
  RoomStatus,
  type Member,
  type Room,
  type RoomAnonymousProfile,
  type RoomParticipant,
  type RoomSession,
  type User,
  type Workspace,
} from "@prisma/client";

vi.mock("@/lib/prisma/room", () => ({
  findRoomById: vi.fn(),
}));

vi.mock("@/lib/prisma/workspace", () => ({
  findWorkspaceById: vi.fn(),
}));

vi.mock("@/lib/prisma/member", () => ({
  findMemberByWorkspaceAndUserId: vi.fn(),
}));

vi.mock("@/lib/prisma/roomMember", () => ({
  createAnonymousProfile: vi.fn(),
  createRoomParticipant: vi.fn(),
  createRoomSession: vi.fn(),
  findAnonymousProfileByToken: vi.fn(),
  findRoomParticipantByAnonymousProfileId: vi.fn(),
  findRoomParticipantByUserId: vi.fn(),
  findRoomSessionByConnectionId: vi.fn(),
  listActiveParticipantIds: vi.fn(),
  listRoomParticipantsWithSessions: vi.fn(),
  markRoomSessionDisconnected: vi.fn(),
  reconnectRoomSession: vi.fn(),
  updateAnonymousProfile: vi.fn(),
  updateRoomParticipant: vi.fn(),
  updateRoomSessionHeartbeat: vi.fn(),
}));

import {
  heartbeat,
  joinRoom,
  leaveRoom,
  listRoomParticipants,
  RoomMemberServiceError,
} from "../roomMember";
import * as roomRepo from "@/lib/prisma/room";
import * as workspaceRepo from "@/lib/prisma/workspace";
import * as memberRepo from "@/lib/prisma/member";
import * as roomMemberRepo from "@/lib/prisma/roomMember";

const mockedRoomRepo = vi.mocked(roomRepo);
const mockedWorkspaceRepo = vi.mocked(workspaceRepo);
const mockedMemberRepo = vi.mocked(memberRepo);
const mockedRoomMemberRepo = vi.mocked(roomMemberRepo);

const workspace: Workspace = {
  id: "workspace-1",
  name: "Команда",
  slug: "komanda",
  ownerId: "user-1",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const member: Member = {
  id: "member-1",
  workspaceId: workspace.id,
  userId: "user-2",
  invitedById: null,
  role: MemberRole.EDITOR,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const room: Room = {
  id: "room-1",
  workspaceId: workspace.id,
  createdById: workspace.ownerId,
  name: "Алгоритмы",
  slug: "algoritmy",
  status: RoomStatus.ACTIVE,
  allowAnonymousView: false,
  allowAnonymousEdit: false,
  allowAnonymousJoin: true,
  requiresMemberAccount: false,
  anonymousApprovalMode: AnonymousApprovalMode.AUTO,
  maxParticipants: null,
  code: "",
  archivedAt: null,
  closedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const user: User = {
  id: member.userId,
  name: "Редактор",
  email: "editor@example.com",
  emailVerified: null,
  image: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const baseParticipant: RoomParticipant = {
  id: "participant-1",
  roomId: room.id,
  userId: member.userId,
  anonymousProfileId: null,
  role: RoomParticipantRole.COLLABORATOR,
  source: RoomParticipantSource.WORKSPACE_MEMBER,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const participantWithUser = {
  ...baseParticipant,
  user,
  anonymousProfile: null,
};

const activeSession: RoomSession = {
  id: "session-1",
  roomId: room.id,
  participantId: baseParticipant.id,
  connectionId: "conn-1",
  clientInfo: null,
  connectedAt: new Date(),
  disconnectedAt: null,
  lastPingAt: new Date(),
};

describe("RoomMemberService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedWorkspaceRepo.findWorkspaceById.mockResolvedValue(workspace);
    mockedRoomRepo.findRoomById.mockResolvedValue(room);
    mockedMemberRepo.findMemberByWorkspaceAndUserId.mockResolvedValue(member);
    mockedRoomMemberRepo.findRoomParticipantByUserId.mockResolvedValue(null);
    mockedRoomMemberRepo.listActiveParticipantIds.mockResolvedValue([]);
    mockedRoomMemberRepo.createRoomParticipant.mockResolvedValue(participantWithUser);
    mockedRoomMemberRepo.createRoomSession.mockResolvedValue(activeSession);
    mockedRoomMemberRepo.findRoomSessionByConnectionId.mockResolvedValue(null);
    mockedRoomMemberRepo.updateRoomParticipant.mockResolvedValue(participantWithUser);
    mockedRoomMemberRepo.listRoomParticipantsWithSessions.mockResolvedValue([]);
  });

  it("joins room as workspace member", async () => {
    const result = await joinRoom({
      kind: "MEMBER",
      roomId: room.id,
      userId: member.userId,
      connectionId: "conn-1",
    });

    expect(result.mode).toBe("MEMBER");
    expect(result.participant.id).toBe(participantWithUser.id);
    expect(result.workspaceRole).toBe(member.role);
    expect(mockedRoomMemberRepo.createRoomParticipant).toHaveBeenCalled();
    expect(mockedRoomMemberRepo.createRoomSession).toHaveBeenCalledWith({
      room: { connect: { id: room.id } },
      participant: { connect: { id: participantWithUser.id } },
      connectionId: "conn-1",
      clientInfo: undefined,
    });
  });

  it("prevents joining closed room", async () => {
    mockedRoomRepo.findRoomById.mockResolvedValue({ ...room, status: RoomStatus.CLOSED });

    await expect(
      joinRoom({
        kind: "MEMBER",
        roomId: room.id,
        userId: member.userId,
        connectionId: "conn-1",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" } satisfies Partial<RoomMemberServiceError>);
  });

  it("reuses existing session on reconnect", async () => {
    mockedRoomMemberRepo.findRoomParticipantByUserId.mockResolvedValue(participantWithUser);
    mockedRoomMemberRepo.listActiveParticipantIds.mockResolvedValue([participantWithUser.id]);
    mockedRoomMemberRepo.findRoomSessionByConnectionId.mockResolvedValue(activeSession);

    const session = { ...activeSession, disconnectedAt: null };
    mockedRoomMemberRepo.reconnectRoomSession.mockResolvedValue(session);

    const result = await joinRoom({
      kind: "MEMBER",
      roomId: room.id,
      userId: member.userId,
      connectionId: activeSession.connectionId,
    });

    expect(result.session).toEqual(session);
    expect(mockedRoomMemberRepo.reconnectRoomSession).toHaveBeenCalledWith(
      activeSession.id,
      undefined,
    );
    expect(mockedRoomMemberRepo.createRoomSession).not.toHaveBeenCalled();
  });

  it("creates anonymous participant when allowed", async () => {
    const profile: RoomAnonymousProfile = {
      id: "anon-1",
      roomId: room.id,
      displayName: "Гость",
      slugToken: "anon-token",
      createdAt: new Date(),
      lastUsedAt: new Date(),
    };

    mockedRoomMemberRepo.findAnonymousProfileByToken.mockResolvedValue(null);
    mockedRoomMemberRepo.createAnonymousProfile.mockResolvedValue(profile);
    mockedRoomMemberRepo.updateAnonymousProfile.mockResolvedValue(profile);
    mockedRoomMemberRepo.findRoomParticipantByAnonymousProfileId.mockResolvedValue(null);

    const anonymousParticipant: RoomParticipant = {
      id: "participant-2",
      roomId: room.id,
      userId: null,
      anonymousProfileId: profile.id,
      role: RoomParticipantRole.GUEST,
      source: RoomParticipantSource.ANONYMOUS,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockedRoomMemberRepo.createRoomParticipant.mockResolvedValue({
      ...anonymousParticipant,
      user: null,
      anonymousProfile: profile,
    });

    mockedRoomMemberRepo.createRoomSession.mockResolvedValue({
      ...activeSession,
      participantId: anonymousParticipant.id,
    });

    const result = await joinRoom({
      kind: "ANONYMOUS",
      roomId: room.id,
      displayName: "  Гость  ",
      connectionId: "conn-2",
    });

    expect(result.mode).toBe("ANONYMOUS");
    expect(result.profile?.id).toBe(profile.id);
    expect(mockedRoomMemberRepo.createAnonymousProfile).toHaveBeenCalled();
  });

  it("marks session as disconnected when leaving", async () => {
    mockedRoomMemberRepo.findRoomSessionByConnectionId.mockResolvedValue(activeSession);
    const disconnected = { ...activeSession, disconnectedAt: new Date() };
    mockedRoomMemberRepo.markRoomSessionDisconnected.mockResolvedValue(disconnected);

    const result = await leaveRoom({
      roomId: room.id,
      connectionId: activeSession.connectionId,
    });

    expect(result.disconnectedAt).toBeInstanceOf(Date);
    expect(mockedRoomMemberRepo.markRoomSessionDisconnected).toHaveBeenCalledWith(activeSession.id);
  });

  it("returns null heartbeat for unknown session", async () => {
    mockedRoomMemberRepo.findRoomSessionByConnectionId.mockResolvedValue(null);

    const result = await heartbeat("missing");

    expect(result).toBeNull();
  });

  it("delegates presence listing to repository", async () => {
    mockedRoomMemberRepo.listRoomParticipantsWithSessions.mockResolvedValue([
      { ...participantWithUser, sessions: [activeSession] },
    ]);

    const participants = await listRoomParticipants(room.id);

    expect(participants).toHaveLength(1);
    expect(mockedRoomMemberRepo.listRoomParticipantsWithSessions).toHaveBeenCalledWith(room.id);
  });
});
