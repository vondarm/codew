import { MemberRole, Prisma, RoomStatus, type Room, type Workspace } from "@prisma/client";

import {
  closeRoomRecord,
  createRoomRecord,
  findRoomById,
  findRoomBySlug,
  findRoomsByWorkspace,
  openRoomRecord,
  regenerateRoomSlug as regenerateRoomSlugRecord,
  updateRoomRecord,
} from "@/lib/prisma/room";
import { findWorkspaceById } from "@/lib/prisma/workspace";
import { findMemberByWorkspaceAndUserId } from "@/lib/prisma/member";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils/slugify";

const NAME_MIN_LENGTH = 3;
const NAME_MAX_LENGTH = 120;
const SLUG_MAX_LENGTH = 64;
const CODE_MAX_LENGTH = 20000;

type RoomField = "name" | "slug" | "code";

type RoomErrorCode = "NOT_FOUND" | "FORBIDDEN" | "VALIDATION_ERROR" | "UNKNOWN";

export class RoomError extends Error {
  constructor(
    message: string,
    public readonly code: RoomErrorCode,
    public readonly field?: RoomField,
  ) {
    super(message);
    this.name = "RoomError";
  }
}

function normalizeName(rawName: string): string {
  const value = rawName.trim();

  if (value.length < NAME_MIN_LENGTH) {
    throw new RoomError(
      `Название должно содержать минимум ${NAME_MIN_LENGTH} символа(-ов).`,
      "VALIDATION_ERROR",
      "name",
    );
  }

  if (value.length > NAME_MAX_LENGTH) {
    throw new RoomError(
      `Название не может превышать ${NAME_MAX_LENGTH} символов.`,
      "VALIDATION_ERROR",
      "name",
    );
  }

  return value;
}

function normalizeCode(rawCode?: string | null): string {
  const normalized = (rawCode ?? "").replace(/\r\n/g, "\n");

  if (normalized.length > CODE_MAX_LENGTH) {
    throw new RoomError(
      `Содержимое не может превышать ${CODE_MAX_LENGTH} символов.`,
      "VALIDATION_ERROR",
      "code",
    );
  }

  return normalized;
}

function normalizeBoolean(raw: unknown): boolean {
  if (typeof raw === "string") {
    return raw === "true" || raw === "on" || raw === "1";
  }

  return Boolean(raw);
}

function withRoomSlugFallback(slug: string): string {
  if (slug.length >= 3) {
    return slug;
  }

  const base = slug.length > 0 ? `${slug}-room` : "room";
  return base.slice(0, SLUG_MAX_LENGTH);
}

function prepareSlugCandidate(slugInput?: string | null): string | null {
  if (!slugInput) {
    return null;
  }

  const trimmed = slugInput.trim();

  if (trimmed.length === 0) {
    return null;
  }

  const base = slugify(trimmed);
  const withFallback = withRoomSlugFallback(base);

  if (withFallback.length > SLUG_MAX_LENGTH) {
    return withFallback.slice(0, SLUG_MAX_LENGTH);
  }

  return withFallback;
}

type WorkspaceAccess = { workspace: Workspace; role: MemberRole };

type RoomAccess = WorkspaceAccess & { room: Room };

async function ensureWorkspaceAccess(
  workspaceId: string,
  userId: string,
): Promise<WorkspaceAccess> {
  const workspace = await findWorkspaceById(workspaceId);

  if (!workspace) {
    throw new RoomError("Рабочая область не найдена.", "NOT_FOUND");
  }

  if (workspace.ownerId === userId) {
    return { workspace, role: MemberRole.ADMIN };
  }

  const membership = await findMemberByWorkspaceAndUserId(workspaceId, userId);

  if (!membership) {
    throw new RoomError("Вы не являетесь участником этой рабочей области.", "FORBIDDEN");
  }

  return { workspace, role: membership.role };
}

async function ensureCanManageRooms(workspaceId: string, userId: string): Promise<WorkspaceAccess> {
  const access = await ensureWorkspaceAccess(workspaceId, userId);

  if (access.role === MemberRole.VIEWER) {
    throw new RoomError("Недостаточно прав для управления комнатами.", "FORBIDDEN");
  }

  return access;
}

async function ensureRoomAccess(roomId: string, userId: string): Promise<RoomAccess> {
  const room = await findRoomById(roomId);

  if (!room) {
    throw new RoomError("Комната не найдена.", "NOT_FOUND");
  }

  const access = await ensureWorkspaceAccess(room.workspaceId, userId);

  return { ...access, room };
}

function mapPrismaError(error: unknown): RoomError {
  if (error instanceof RoomError) {
    return error;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      const target = error.meta?.target;
      const targetValue = Array.isArray(target) ? target.join(",") : String(target ?? "");

      if (targetValue.includes("slug")) {
        return new RoomError(
          "Комната с таким slug уже существует. Попробуйте сгенерировать другой.",
          "VALIDATION_ERROR",
          "slug",
        );
      }

      if (targetValue.includes("workspaceId") && targetValue.includes("name")) {
        return new RoomError(
          "Комната с таким названием уже существует в рабочей области.",
          "VALIDATION_ERROR",
          "name",
        );
      }
    }

    if (error.code === "P2025") {
      return new RoomError("Комната не найдена.", "NOT_FOUND");
    }
  }

  return new RoomError("Произошла ошибка при работе с комнатами.", "UNKNOWN");
}

export type RoomInput = {
  name: string;
  slug?: string | null;
  allowAnonymousView?: boolean;
  allowAnonymousEdit?: boolean;
  allowAnonymousJoin?: boolean;
  code?: string | null;
};

export type RoomUpdateInput = {
  name: string;
  allowAnonymousView?: boolean;
  allowAnonymousEdit?: boolean;
  allowAnonymousJoin?: boolean;
  code?: string | null;
};

export type SerializedRoom = {
  id: string;
  workspaceId: string;
  createdById: string;
  name: string;
  slug: string;
  status: RoomStatus;
  allowAnonymousView: boolean;
  allowAnonymousEdit: boolean;
  allowAnonymousJoin: boolean;
  code: string;
  archivedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RoomDetails = {
  room: SerializedRoom;
  workspace: Workspace;
  role: MemberRole | null;
  access: "ANONYMOUS" | "MEMBER";
};

export function serializeRoomForClient(room: Room): SerializedRoom {
  return {
    id: room.id,
    workspaceId: room.workspaceId,
    createdById: room.createdById,
    name: room.name,
    slug: room.slug,
    status: room.status,
    allowAnonymousView: room.allowAnonymousView,
    allowAnonymousEdit: room.allowAnonymousEdit,
    allowAnonymousJoin: room.allowAnonymousJoin,
    code: room.code,
    archivedAt: room.archivedAt ? room.archivedAt.toISOString() : null,
    closedAt: room.closedAt ? room.closedAt.toISOString() : null,
    createdAt: room.createdAt.toISOString(),
    updatedAt: room.updatedAt.toISOString(),
  };
}

export async function listRoomsForWorkspace(
  userId: string,
  workspaceId: string,
): Promise<SerializedRoom[]> {
  const access = await ensureWorkspaceAccess(workspaceId, userId);
  const rooms = await findRoomsByWorkspace(access.workspace.id);

  return rooms.map(serializeRoomForClient);
}

function applySlugSuffix(base: string, suffix: string): string {
  const trimmedBase = base.slice(0, Math.max(1, SLUG_MAX_LENGTH - suffix.length));
  return `${trimmedBase}${suffix}`;
}

function buildRandomSuffix(): string {
  const raw = Math.random().toString(36).substring(2, 8);
  const value = raw && raw.length > 0 ? raw : Date.now().toString(36).slice(-4);

  return `-${value}`;
}

function buildRandomSlug(): string {
  return applySlugSuffix("room", buildRandomSuffix());
}

export async function generateUniqueSlug(
  _name: string,
  options?: { slug?: string | null; currentRoomId?: string; forceRegenerate?: boolean },
  client?: Prisma.TransactionClient,
): Promise<string> {
  const customCandidate = prepareSlugCandidate(options?.slug);
  const hasCustomSlug = customCandidate !== null;
  const forceRegenerate = options?.forceRegenerate ?? false;
  const shouldUseRandom = !hasCustomSlug || forceRegenerate;

  let candidate = hasCustomSlug ? customCandidate : buildRandomSlug();
  let attempt = 0;

  while (true) {
    const existing = await findRoomBySlug(candidate, client);

    if (!existing) {
      return candidate;
    }

    if (existing.id === options?.currentRoomId && !forceRegenerate) {
      return candidate;
    }

    attempt += 1;
    if (shouldUseRandom) {
      candidate = buildRandomSlug();
    } else {
      const suffix = `-${attempt + 1}`;
      candidate = applySlugSuffix(customCandidate!, suffix);
    }
  }
}

export async function createRoom(
  userId: string,
  workspaceId: string,
  input: RoomInput,
): Promise<SerializedRoom> {
  const access = await ensureCanManageRooms(workspaceId, userId);
  const name = normalizeName(input.name);
  const code = normalizeCode(input.code);
  const allowAnonymousView = normalizeBoolean(input.allowAnonymousView);
  const allowAnonymousEdit = normalizeBoolean(input.allowAnonymousEdit);
  const allowAnonymousJoin = normalizeBoolean(input.allowAnonymousJoin);

  try {
    const room = await prisma.$transaction(async (tx) => {
      const slug = await generateUniqueSlug(name, { slug: input.slug }, tx);

      return createRoomRecord(
        {
          name,
          slug,
          code,
          allowAnonymousView,
          allowAnonymousEdit,
          allowAnonymousJoin,
          workspace: { connect: { id: access.workspace.id } },
          createdBy: { connect: { id: userId } },
        },
        tx,
      );
    });

    return serializeRoomForClient(room);
  } catch (error) {
    throw mapPrismaError(error);
  }
}

export async function updateRoom(
  userId: string,
  roomId: string,
  input: RoomUpdateInput,
): Promise<SerializedRoom> {
  const access = await ensureRoomAccess(roomId, userId);

  if (access.role === MemberRole.VIEWER) {
    throw new RoomError("Недостаточно прав для изменения настроек комнаты.", "FORBIDDEN");
  }

  const name = normalizeName(input.name);
  const code = normalizeCode(input.code);
  const allowAnonymousView = normalizeBoolean(input.allowAnonymousView);
  const allowAnonymousEdit = normalizeBoolean(input.allowAnonymousEdit);
  const allowAnonymousJoin = normalizeBoolean(input.allowAnonymousJoin);

  try {
    const room = await updateRoomRecord(access.room.id, {
      name,
      code,
      allowAnonymousView,
      allowAnonymousEdit,
      allowAnonymousJoin,
    });

    return serializeRoomForClient(room);
  } catch (error) {
    throw mapPrismaError(error);
  }
}

export async function closeRoom(userId: string, roomId: string): Promise<SerializedRoom> {
  const access = await ensureRoomAccess(roomId, userId);

  if (access.role === MemberRole.VIEWER) {
    throw new RoomError("Недостаточно прав для закрытия комнаты.", "FORBIDDEN");
  }

  try {
    const room = await closeRoomRecord(access.room.id, {
      allowAnonymousEdit: false,
      allowAnonymousJoin: false,
    });

    return serializeRoomForClient(room);
  } catch (error) {
    throw mapPrismaError(error);
  }
}

export async function openRoom(userId: string, roomId: string): Promise<SerializedRoom> {
  const access = await ensureRoomAccess(roomId, userId);

  if (access.role === MemberRole.VIEWER) {
    throw new RoomError("Недостаточно прав для открытия комнаты.", "FORBIDDEN");
  }

  if (access.room.status === RoomStatus.ACTIVE) {
    throw new RoomError("Комната уже открыта.", "FORBIDDEN");
  }

  try {
    const room = await openRoomRecord(access.room.id, {
      allowAnonymousJoin: access.room.allowAnonymousJoin,
      allowAnonymousEdit: access.room.allowAnonymousEdit,
    });

    return serializeRoomForClient(room);
  } catch (error) {
    throw mapPrismaError(error);
  }
}

export async function regenerateRoomSlug(userId: string, roomId: string): Promise<SerializedRoom> {
  const access = await ensureRoomAccess(roomId, userId);

  if (access.role === MemberRole.VIEWER) {
    throw new RoomError("Недостаточно прав для изменения ссылки комнаты.", "FORBIDDEN");
  }

  try {
    const room = await prisma.$transaction(async (tx) => {
      const slug = await generateUniqueSlug(
        access.room.name,
        { currentRoomId: access.room.id, forceRegenerate: true },
        tx,
      );

      return regenerateRoomSlugRecord(access.room.id, slug, tx);
    });

    return serializeRoomForClient(room);
  } catch (error) {
    throw mapPrismaError(error);
  }
}

export async function getRoom(
  roomSlug: string,
  options?: { userId?: string | null },
): Promise<RoomDetails> {
  const record = await findRoomBySlug(roomSlug);

  if (!record) {
    throw new RoomError("Комната не найдена.", "NOT_FOUND");
  }

  const room = record;
  const workspace = record.workspace;
  const userId = options?.userId ?? null;

  if (!userId) {
    if (!room.allowAnonymousView) {
      throw new RoomError("Доступ к комнате ограничен.", "FORBIDDEN");
    }

    return {
      room: serializeRoomForClient(room),
      workspace,
      role: null,
      access: "ANONYMOUS",
    };
  }

  if (workspace.ownerId === userId) {
    return {
      room: serializeRoomForClient(room),
      workspace,
      role: MemberRole.ADMIN,
      access: "MEMBER",
    };
  }

  const membership = await findMemberByWorkspaceAndUserId(workspace.id, userId);

  if (!membership) {
    throw new RoomError("Вы не являетесь участником этой рабочей области.", "FORBIDDEN");
  }

  return {
    room: serializeRoomForClient(room),
    workspace,
    role: membership.role,
    access: "MEMBER",
  };
}
