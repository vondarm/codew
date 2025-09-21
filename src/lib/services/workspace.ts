import type { Workspace } from "@prisma/client";
import { MemberRole, Prisma } from "@prisma/client";

import {
  deleteWorkspace as deleteWorkspaceRecord,
  findWorkspaceById,
  findWorkspaceBySlug,
  findWorkspacesByMember,
  updateWorkspace as updateWorkspaceRecord,
  updateWorkspaceOwner,
} from "@/lib/prisma/workspace";
import { prisma } from "@/lib/prisma";
import { slugify, withSlugFallback } from "@/lib/utils/slugify";

const NAME_MIN_LENGTH = 3;
const NAME_MAX_LENGTH = 80;
const SLUG_MAX_LENGTH = 64;

type WorkspaceField = "name" | "slug";

export class WorkspaceError extends Error {
  constructor(
    message: string,
    public readonly code: "NOT_FOUND" | "FORBIDDEN" | "VALIDATION_ERROR" | "UNKNOWN",
    public readonly field?: WorkspaceField,
  ) {
    super(message);
    this.name = "WorkspaceError";
  }
}

function normalizeName(rawName: string): string {
  const trimmed = rawName.trim();

  if (trimmed.length < NAME_MIN_LENGTH) {
    throw new WorkspaceError(
      `Название должно содержать минимум ${NAME_MIN_LENGTH} символа(-ов).`,
      "VALIDATION_ERROR",
      "name",
    );
  }

  if (trimmed.length > NAME_MAX_LENGTH) {
    throw new WorkspaceError(
      `Название не может превышать ${NAME_MAX_LENGTH} символов.`,
      "VALIDATION_ERROR",
      "name",
    );
  }

  return trimmed;
}

function prepareSlugCandidate(name: string, slugInput?: string | null): string {
  const base = slugify(slugInput && slugInput.length > 0 ? slugInput : name);
  const withFallback = withSlugFallback(base);

  if (withFallback.length > SLUG_MAX_LENGTH) {
    return withFallback.slice(0, SLUG_MAX_LENGTH);
  }

  return withFallback;
}

async function ensureUniqueSlug(candidate: string, currentWorkspaceId?: string): Promise<string> {
  let slug = candidate;
  let attempt = 1;

  while (true) {
    const existing = await findWorkspaceBySlug(slug);

    if (!existing || existing.id === currentWorkspaceId) {
      return slug;
    }

    attempt += 1;
    const suffix = `-${attempt}`;
    const baseLength = Math.max(0, SLUG_MAX_LENGTH - suffix.length);
    slug = `${candidate.slice(0, baseLength)}${suffix}`;
  }
}

function mapPrismaError(error: unknown, slug?: string): WorkspaceError {
  if (error instanceof WorkspaceError) {
    return error;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002" && slug) {
      return new WorkspaceError(
        "Рабочая область с таким slug уже существует. Выберите другое значение.",
        "VALIDATION_ERROR",
        "slug",
      );
    }
  }

  return new WorkspaceError(
    "Произошла неизвестная ошибка при работе с рабочими областями.",
    "UNKNOWN",
  );
}

export type WorkspaceSummary = Pick<
  Workspace,
  "id" | "name" | "slug" | "ownerId" | "createdAt" | "updatedAt"
> & {
  role: MemberRole;
};

export async function listWorkspaces(ownerId: string): Promise<WorkspaceSummary[]> {
  const workspaces = await findWorkspacesByMember(ownerId);

  return workspaces.map((workspace) => ({
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    ownerId: workspace.ownerId,
    createdAt: workspace.createdAt,
    updatedAt: workspace.updatedAt,
    role: workspace.currentRole,
  }));
}

async function assertWorkspaceOwnership(workspaceId: string, ownerId: string): Promise<Workspace> {
  const workspace = await findWorkspaceById(workspaceId);

  if (!workspace) {
    throw new WorkspaceError("Рабочая область не найдена.", "NOT_FOUND");
  }

  if (workspace.ownerId !== ownerId) {
    throw new WorkspaceError("У вас нет прав для выполнения этого действия.", "FORBIDDEN");
  }

  return workspace;
}

export async function createWorkspace(
  ownerId: string,
  input: { name: string; slug?: string | null },
): Promise<Workspace> {
  const name = normalizeName(input.name);
  const slugCandidate = prepareSlugCandidate(name, input.slug);
  const slug = await ensureUniqueSlug(slugCandidate);

  try {
    return await prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          name,
          slug,
          owner: { connect: { id: ownerId } },
        },
      });

      await tx.member.create({
        data: {
          workspaceId: workspace.id,
          userId: ownerId,
          invitedById: ownerId,
          role: MemberRole.ADMIN,
        },
      });

      return workspace;
    });
  } catch (error) {
    throw mapPrismaError(error, slug);
  }
}

export async function updateWorkspace(
  ownerId: string,
  workspaceId: string,
  input: { name: string; slug?: string | null },
): Promise<Workspace> {
  const existing = await assertWorkspaceOwnership(workspaceId, ownerId);

  const name = normalizeName(input.name);
  const slugCandidate = prepareSlugCandidate(name, input.slug ?? existing.slug);
  const slug = await ensureUniqueSlug(slugCandidate, existing.id);

  try {
    return await updateWorkspaceRecord(existing.id, {
      name,
      slug,
    });
  } catch (error) {
    throw mapPrismaError(error, slug);
  }
}

export async function deleteWorkspace(ownerId: string, workspaceId: string): Promise<void> {
  const existing = await assertWorkspaceOwnership(workspaceId, ownerId);

  await deleteWorkspaceRecord(existing.id);
}

export async function getWorkspace(ownerId: string, workspaceId: string): Promise<Workspace> {
  return assertWorkspaceOwnership(workspaceId, ownerId);
}

export async function transferWorkspaceOwnership(
  workspaceId: string,
  newOwnerId: string,
): Promise<void> {
  await updateWorkspaceOwner(workspaceId, newOwnerId);
}
