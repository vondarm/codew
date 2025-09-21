import type { Member, Prisma, User } from "@prisma/client";
import { MemberRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type MemberWithUser = Prisma.MemberGetPayload<{ include: { user: true } }>;

type TransactionClient = Prisma.TransactionClient;

type ClientLike = typeof prisma | TransactionClient;

function resolveClient(client?: TransactionClient): ClientLike {
  return client ?? prisma;
}

export async function findMembersByWorkspaceId(
  workspaceId: string,
  client?: TransactionClient,
): Promise<MemberWithUser[]> {
  const db = resolveClient(client);

  return db.member.findMany({
    where: { workspaceId },
    include: { user: true },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  });
}

export async function findMemberByWorkspaceAndUserId(
  workspaceId: string,
  userId: string,
  client?: TransactionClient,
): Promise<Member | null> {
  const db = resolveClient(client);

  return db.member.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId,
      },
    },
  });
}

export async function findMemberById(
  memberId: string,
  client?: TransactionClient,
): Promise<MemberWithUser | null> {
  const db = resolveClient(client);

  return db.member.findUnique({
    where: { id: memberId },
    include: { user: true },
  });
}

export async function createMember(
  data: Prisma.MemberCreateArgs["data"],
  client?: TransactionClient,
): Promise<MemberWithUser> {
  const db = resolveClient(client);

  return db.member.create({
    data,
    include: { user: true },
  });
}

export async function updateMemberRole(
  memberId: string,
  role: MemberRole,
  client?: TransactionClient,
): Promise<MemberWithUser> {
  const db = resolveClient(client);

  return db.member.update({
    where: { id: memberId },
    data: { role },
    include: { user: true },
  });
}

export async function deleteMemberById(
  memberId: string,
  client?: TransactionClient,
): Promise<MemberWithUser> {
  const db = resolveClient(client);

  return db.member.delete({
    where: { id: memberId },
    include: { user: true },
  });
}

export async function countWorkspaceAdmins(
  workspaceId: string,
  client?: TransactionClient,
): Promise<number> {
  const db = resolveClient(client);

  return db.member.count({
    where: { workspaceId, role: MemberRole.ADMIN },
  });
}

export async function findFirstAdmin(
  workspaceId: string,
  excludeUserId?: string,
  client?: TransactionClient,
): Promise<MemberWithUser | null> {
  const db = resolveClient(client);

  return db.member.findFirst({
    where: {
      workspaceId,
      role: MemberRole.ADMIN,
      ...(excludeUserId ? { userId: { not: excludeUserId } } : {}),
    },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function findUserByEmail(
  email: string,
  client?: TransactionClient,
): Promise<User | null> {
  const db = resolveClient(client);

  return db.user.findFirst({
    where: {
      email,
    },
  });
}
