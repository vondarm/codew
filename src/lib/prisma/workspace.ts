import type { Prisma, Workspace } from "@prisma/client";
import type { MemberRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function createWorkspace(
  data: Prisma.WorkspaceCreateArgs["data"],
): Promise<Workspace> {
  return prisma.workspace.create({ data });
}

export async function findWorkspaceById(id: string): Promise<Workspace | null> {
  return prisma.workspace.findUnique({ where: { id } });
}

export async function findWorkspaceBySlug(slug: string): Promise<Workspace | null> {
  return prisma.workspace.findUnique({ where: { slug } });
}

export async function findWorkspacesByOwner(ownerId: string): Promise<Workspace[]> {
  return prisma.workspace.findMany({
    where: { ownerId },
    orderBy: { createdAt: "asc" },
  });
}

export type WorkspaceWithRole = Workspace & { currentRole: MemberRole };

export async function findWorkspacesByMember(userId: string): Promise<WorkspaceWithRole[]> {
  const memberships = await prisma.member.findMany({
    where: { userId },
    include: { workspace: true },
    orderBy: [{ workspace: { createdAt: "asc" } }],
  });

  return memberships.map((membership) => ({
    ...membership.workspace,
    currentRole: membership.role,
  }));
}

export async function updateWorkspace(
  id: string,
  data: Prisma.WorkspaceUpdateArgs["data"],
): Promise<Workspace> {
  return prisma.workspace.update({ where: { id }, data });
}

export async function deleteWorkspace(id: string): Promise<Workspace> {
  return prisma.workspace.delete({ where: { id } });
}

export async function updateWorkspaceOwner(id: string, ownerId: string): Promise<Workspace> {
  return prisma.workspace.update({
    where: { id },
    data: { ownerId },
  });
}
