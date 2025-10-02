import type { Prisma, RoomAnonymousProfile, RoomSession } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const baseParticipantInclude = {
  user: true,
  anonymousProfile: true,
} satisfies Prisma.RoomParticipantInclude;

const participantWithSessionsInclude = {
  ...baseParticipantInclude,
  sessions: {
    where: { disconnectedAt: null },
    orderBy: { connectedAt: "desc" as const },
  },
} satisfies Prisma.RoomParticipantInclude;

const sessionWithParticipantInclude = {
  participant: {
    include: baseParticipantInclude,
  },
  room: true,
} satisfies Prisma.RoomSessionInclude;

export type RoomParticipantWithRelations = Prisma.RoomParticipantGetPayload<{
  include: typeof baseParticipantInclude;
}>;

export type RoomParticipantWithActiveSessions = Prisma.RoomParticipantGetPayload<{
  include: typeof participantWithSessionsInclude;
}>;

export type RoomSessionWithParticipant = Prisma.RoomSessionGetPayload<{
  include: typeof sessionWithParticipantInclude;
}>;

type TransactionClient = Prisma.TransactionClient;
type ClientLike = typeof prisma | TransactionClient;

function resolveClient(client?: TransactionClient): ClientLike {
  return client ?? prisma;
}

export async function findRoomParticipantByUserId(
  roomId: string,
  userId: string,
  client?: TransactionClient,
): Promise<RoomParticipantWithRelations | null> {
  const db = resolveClient(client);

  return db.roomParticipant.findFirst({
    where: { roomId, userId },
    include: baseParticipantInclude,
  });
}

export async function findRoomParticipantByAnonymousProfileId(
  roomId: string,
  anonymousProfileId: string,
  client?: TransactionClient,
): Promise<RoomParticipantWithRelations | null> {
  const db = resolveClient(client);

  return db.roomParticipant.findFirst({
    where: { roomId, anonymousProfileId },
    include: baseParticipantInclude,
  });
}

export async function createRoomParticipant(
  data: Prisma.RoomParticipantCreateArgs["data"],
  client?: TransactionClient,
): Promise<RoomParticipantWithRelations> {
  const db = resolveClient(client);

  return db.roomParticipant.create({
    data,
    include: baseParticipantInclude,
  });
}

export async function updateRoomParticipant(
  id: string,
  data: Prisma.RoomParticipantUpdateArgs["data"],
  client?: TransactionClient,
): Promise<RoomParticipantWithRelations> {
  const db = resolveClient(client);

  return db.roomParticipant.update({
    where: { id },
    data,
    include: baseParticipantInclude,
  });
}

export async function listRoomParticipantsWithSessions(
  roomId: string,
  client?: TransactionClient,
): Promise<RoomParticipantWithActiveSessions[]> {
  const db = resolveClient(client);

  return db.roomParticipant.findMany({
    where: { roomId },
    include: participantWithSessionsInclude,
    orderBy: [{ user: { name: "asc" } }, { createdAt: "asc" }],
  });
}

export async function listActiveParticipantIds(
  roomId: string,
  client?: TransactionClient,
): Promise<string[]> {
  const db = resolveClient(client);

  const rows = await db.roomSession.findMany({
    where: { roomId, disconnectedAt: null },
    select: { participantId: true },
  });

  const unique = new Set(rows.map((row) => row.participantId));
  return Array.from(unique.values());
}

export async function findAnonymousProfileByToken(
  roomId: string,
  slugToken: string,
  client?: TransactionClient,
): Promise<RoomAnonymousProfile | null> {
  const db = resolveClient(client);

  return db.roomAnonymousProfile.findFirst({
    where: { roomId, slugToken },
  });
}

export async function createAnonymousProfile(
  data: Prisma.RoomAnonymousProfileCreateArgs["data"],
  client?: TransactionClient,
): Promise<RoomAnonymousProfile> {
  const db = resolveClient(client);

  return db.roomAnonymousProfile.create({ data });
}

export async function updateAnonymousProfile(
  id: string,
  data: Prisma.RoomAnonymousProfileUpdateArgs["data"],
  client?: TransactionClient,
): Promise<RoomAnonymousProfile> {
  const db = resolveClient(client);

  return db.roomAnonymousProfile.update({
    where: { id },
    data,
  });
}

export async function findRoomSessionByConnectionId(
  connectionId: string,
  client?: TransactionClient,
): Promise<RoomSession | null> {
  const db = resolveClient(client);

  return db.roomSession.findUnique({ where: { connectionId } });
}

export async function findRoomSessionWithParticipant(
  connectionId: string,
  client?: TransactionClient,
): Promise<RoomSessionWithParticipant | null> {
  const db = resolveClient(client);

  return db.roomSession.findUnique({
    where: { connectionId },
    include: sessionWithParticipantInclude,
  });
}

export async function createRoomSession(
  data: Prisma.RoomSessionCreateArgs["data"],
  client?: TransactionClient,
): Promise<RoomSession> {
  const db = resolveClient(client);

  return db.roomSession.create({ data });
}

export async function updateRoomSession(
  id: string,
  data: Prisma.RoomSessionUpdateArgs["data"],
  client?: TransactionClient,
): Promise<RoomSession> {
  const db = resolveClient(client);

  return db.roomSession.update({
    where: { id },
    data,
  });
}

export async function reconnectRoomSession(
  id: string,
  clientInfo?: Prisma.RoomSessionUpdateArgs["data"]["clientInfo"],
  client?: TransactionClient,
): Promise<RoomSession> {
  return updateRoomSession(
    id,
    {
      disconnectedAt: null,
      lastPingAt: new Date(),
      ...(clientInfo !== undefined ? { clientInfo } : {}),
    },
    client,
  );
}

export async function markRoomSessionDisconnected(
  id: string,
  client?: TransactionClient,
): Promise<RoomSession> {
  return updateRoomSession(
    id,
    {
      disconnectedAt: new Date(),
      lastPingAt: new Date(),
    },
    client,
  );
}

export async function updateRoomSessionHeartbeat(
  id: string,
  client?: TransactionClient,
): Promise<RoomSession> {
  return updateRoomSession(
    id,
    {
      lastPingAt: new Date(),
    },
    client,
  );
}
