import { MemberRole } from "@prisma/client";

import {
  countWorkspaceAdmins,
  createMember,
  deleteMemberById,
  findFirstAdmin,
  findMemberById,
  findMemberByWorkspaceAndUserId,
  findMembersByWorkspaceId,
  findUserByEmail,
  updateMemberRole,
  type MemberWithUser,
} from "@/lib/prisma/member";
import { findWorkspaceById, updateWorkspaceOwner } from "@/lib/prisma/workspace";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

export type MemberField = "email" | "role";

export type MemberServiceErrorCode =
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "USER_NOT_FOUND"
  | "ALREADY_MEMBER"
  | "LAST_ADMIN";

export class MemberServiceError extends Error {
  constructor(
    message: string,
    public readonly code: MemberServiceErrorCode,
    public readonly field?: MemberField,
  ) {
    super(message);
    this.name = "MemberServiceError";
  }
}

function normalizeEmail(rawEmail: string): string {
  const trimmed = rawEmail.trim();

  if (!trimmed) {
    throw new MemberServiceError("Укажите адрес электронной почты.", "VALIDATION_ERROR", "email");
  }

  const normalized = trimmed.toLowerCase();

  if (!EMAIL_REGEX.test(normalized)) {
    throw new MemberServiceError("Введите корректный email-адрес.", "VALIDATION_ERROR", "email");
  }

  return normalized;
}

function assertValidRole(role: MemberRole): MemberRole {
  if (!Object.values(MemberRole).includes(role)) {
    throw new MemberServiceError("Выберите допустимую роль участника.", "VALIDATION_ERROR", "role");
  }

  return role;
}

async function ensureWorkspaceExists(workspaceId: string) {
  const workspace = await findWorkspaceById(workspaceId);

  if (!workspace) {
    throw new MemberServiceError("Рабочая область не найдена.", "NOT_FOUND");
  }

  return workspace;
}

async function ensureAdminMembership(workspaceId: string, userId: string) {
  const membership = await findMemberByWorkspaceAndUserId(workspaceId, userId);

  if (!membership) {
    throw new MemberServiceError("Вы не являетесь участником рабочей области.", "FORBIDDEN");
  }

  if (membership.role !== MemberRole.ADMIN) {
    throw new MemberServiceError("Только администраторы могут управлять участниками.", "FORBIDDEN");
  }

  return membership;
}

async function ensureCanRemoveAdmin(workspaceId: string) {
  const adminCount = await countWorkspaceAdmins(workspaceId);

  if (adminCount <= 1) {
    throw new MemberServiceError(
      "Нельзя удалить или понизить последнего администратора рабочей области.",
      "LAST_ADMIN",
    );
  }
}

async function chooseNewOwner(
  workspaceId: string,
  currentOwnerId: string,
  actorUserId: string,
): Promise<string> {
  if (actorUserId !== currentOwnerId) {
    return actorUserId;
  }

  const candidate = await findFirstAdmin(workspaceId, currentOwnerId);

  if (!candidate) {
    throw new MemberServiceError(
      "Не удалось определить нового администратора для рабочей области.",
      "LAST_ADMIN",
    );
  }

  return candidate.userId;
}

export async function listMembers(workspaceId: string): Promise<MemberWithUser[]> {
  return findMembersByWorkspaceId(workspaceId);
}

export async function inviteMember(input: {
  workspaceId: string;
  inviterId: string;
  email: string;
  role: MemberRole;
}): Promise<MemberWithUser> {
  const { workspaceId, inviterId } = input;
  const email = normalizeEmail(input.email);
  const role = assertValidRole(input.role);

  const workspace = await ensureWorkspaceExists(workspaceId);
  await ensureAdminMembership(workspaceId, inviterId);

  const user = await findUserByEmail(email);

  if (!user) {
    throw new MemberServiceError(
      "Пользователь с указанным email не найден.",
      "USER_NOT_FOUND",
      "email",
    );
  }

  const existingMember = await findMemberByWorkspaceAndUserId(workspaceId, user.id);

  if (existingMember) {
    throw new MemberServiceError(
      "Пользователь уже состоит в этой рабочей области.",
      "ALREADY_MEMBER",
    );
  }

  return createMember({
    workspace: { connect: { id: workspace.id } },
    user: { connect: { id: user.id } },
    invitedBy: { connect: { id: inviterId } },
    role,
  });
}

export async function changeRole(input: {
  workspaceId: string;
  actorId: string;
  memberId: string;
  role: MemberRole;
}): Promise<MemberWithUser> {
  const { workspaceId, actorId, memberId } = input;
  const role = assertValidRole(input.role);

  const workspace = await ensureWorkspaceExists(workspaceId);
  const actor = await ensureAdminMembership(workspaceId, actorId);
  const member = await findMemberById(memberId);

  if (!member || member.workspaceId !== workspaceId) {
    throw new MemberServiceError("Участник не найден.", "NOT_FOUND");
  }

  if (member.role === role) {
    return member;
  }

  if (member.role === MemberRole.ADMIN && role !== MemberRole.ADMIN) {
    await ensureCanRemoveAdmin(workspaceId);
  }

  const updated = await updateMemberRole(member.id, role);

  if (member.userId === workspace.ownerId && role !== MemberRole.ADMIN) {
    const newOwnerId = await chooseNewOwner(workspaceId, member.userId, actor.userId);
    await updateWorkspaceOwner(workspaceId, newOwnerId);
  }

  return updated;
}

export async function removeMember(input: {
  workspaceId: string;
  actorId: string;
  memberId: string;
}): Promise<MemberWithUser> {
  const { workspaceId, actorId, memberId } = input;

  const workspace = await ensureWorkspaceExists(workspaceId);
  const actor = await ensureAdminMembership(workspaceId, actorId);
  const member = await findMemberById(memberId);

  if (!member || member.workspaceId !== workspaceId) {
    throw new MemberServiceError("Участник не найден.", "NOT_FOUND");
  }

  if (member.role === MemberRole.ADMIN) {
    await ensureCanRemoveAdmin(workspaceId);
  }

  const removed = await deleteMemberById(member.id);

  if (member.userId === workspace.ownerId) {
    const newOwnerId = await chooseNewOwner(workspaceId, member.userId, actor.userId);
    await updateWorkspaceOwner(workspaceId, newOwnerId);
  }

  return removed;
}
