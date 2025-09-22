import type { Prisma, Room } from "@prisma/client";
import { RoomStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type RoomWithWorkspace = Prisma.RoomGetPayload<{ include: { workspace: true } }>;

type TransactionClient = Prisma.TransactionClient;

type ClientLike = typeof prisma | TransactionClient;

function resolveClient(client?: TransactionClient): ClientLike {
  return client ?? prisma;
}

export async function createRoomRecord(
  data: Prisma.RoomCreateArgs["data"],
  client?: TransactionClient,
): Promise<Room> {
  const db = resolveClient(client);

  return db.room.create({ data });
}

export async function findRoomsByWorkspace(
  workspaceId: string,
  client?: TransactionClient,
): Promise<Room[]> {
  const db = resolveClient(client);

  return db.room.findMany({
    where: { workspaceId },
    orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
  });
}

export async function findRoomBySlug(
  slug: string,
  client?: TransactionClient,
): Promise<RoomWithWorkspace | null> {
  const db = resolveClient(client);

  return db.room.findUnique({
    where: { slug },
    include: { workspace: true },
  });
}

export async function findRoomById(id: string, client?: TransactionClient): Promise<Room | null> {
  const db = resolveClient(client);

  return db.room.findUnique({ where: { id } });
}

export async function updateRoomRecord(
  id: string,
  data: Prisma.RoomUpdateArgs["data"],
  client?: TransactionClient,
): Promise<Room> {
  const db = resolveClient(client);

  return db.room.update({ where: { id }, data });
}

export async function closeRoomRecord(
  id: string,
  data?: Prisma.RoomUpdateArgs["data"],
  client?: TransactionClient,
): Promise<Room> {
  const db = resolveClient(client);
  const now = new Date();

  return db.room.update({
    where: { id },
    data: {
      ...(data ?? {}),
      status: RoomStatus.CLOSED,
      closedAt: now,
      archivedAt: data?.archivedAt ?? now,
    },
  });
}

export async function regenerateRoomSlug(
  id: string,
  slug: string,
  client?: TransactionClient,
): Promise<Room> {
  const db = resolveClient(client);

  return db.room.update({
    where: { id },
    data: { slug },
  });
}
