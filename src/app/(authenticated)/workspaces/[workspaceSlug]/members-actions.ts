"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth";
import { changeRole, inviteMember, MemberServiceError, removeMember } from "@/lib/services/member";
import { findWorkspaceById } from "@/lib/prisma/workspace";
import { ROUTES } from "@/routes";
import { MemberRole } from "@prisma/client";
import { MembersActionState } from "@/app/(authenticated)/workspaces/[workspaceSlug]/members-action-state";

async function revalidateWorkspaceMembers(workspaceId: string) {
  const workspace = await findWorkspaceById(workspaceId);

  if (workspace) {
    revalidatePath(ROUTES.workspace(workspace.slug));
  }
}

function buildErrorState(error: unknown, fallbackMessage: string): MembersActionState {
  if (error instanceof MemberServiceError) {
    const fieldErrors = error.field ? { [error.field]: error.message } : undefined;
    const message = error.field ? undefined : error.message;

    return {
      status: "error",
      message,
      fieldErrors,
    };
  }

  console.error(error);

  return {
    status: "error",
    message: fallbackMessage,
  };
}

function parseRole(rawRole: FormDataEntryValue | null): MemberRole | null {
  if (typeof rawRole !== "string") {
    return null;
  }

  return Object.values(MemberRole).includes(rawRole as MemberRole) ? (rawRole as MemberRole) : null;
}

export async function inviteMemberAction(
  _prevState: MembersActionState,
  formData: FormData,
): Promise<MembersActionState> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      status: "error",
      message: "Требуется аутентификация.",
    };
  }

  const workspaceIdValue = formData.get("workspaceId");
  const emailValue = formData.get("email");
  const roleValue = formData.get("role");

  const workspaceId = typeof workspaceIdValue === "string" ? workspaceIdValue : "";
  const email = typeof emailValue === "string" ? emailValue : "";
  const role = parseRole(roleValue);

  if (!workspaceId) {
    return {
      status: "error",
      message: "Рабочая область не указана.",
    };
  }

  if (!role) {
    return {
      status: "error",
      fieldErrors: { role: "Выберите роль участника." },
    };
  }

  try {
    await inviteMember({ workspaceId, inviterId: user.id, email, role });
    await revalidateWorkspaceMembers(workspaceId);

    return {
      status: "success",
      message: "Пользователь добавлен в рабочую область.",
    };
  } catch (error) {
    return buildErrorState(error, "Не удалось пригласить участника. Попробуйте позже.");
  }
}

export async function changeMemberRoleAction(
  _prevState: MembersActionState,
  formData: FormData,
): Promise<MembersActionState> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      status: "error",
      message: "Требуется аутентификация.",
    };
  }

  const workspaceIdValue = formData.get("workspaceId");
  const memberIdValue = formData.get("memberId");
  const roleValue = formData.get("role");

  const workspaceId = typeof workspaceIdValue === "string" ? workspaceIdValue : "";
  const memberId = typeof memberIdValue === "string" ? memberIdValue : "";
  const role = parseRole(roleValue);

  if (!workspaceId || !memberId) {
    return {
      status: "error",
      message: "Недостаточно данных для изменения роли.",
    };
  }

  if (!role) {
    return {
      status: "error",
      fieldErrors: { role: "Выберите роль участника." },
    };
  }

  try {
    await changeRole({ workspaceId, actorId: user.id, memberId, role });
    await revalidateWorkspaceMembers(workspaceId);

    return {
      status: "success",
      message: "Роль обновлена.",
    };
  } catch (error) {
    return buildErrorState(error, "Не удалось изменить роль участника.");
  }
}

export async function removeMemberAction(
  _prevState: MembersActionState,
  { workspaceId, memberId }: { workspaceId: string; memberId: string },
): Promise<MembersActionState> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      status: "error",
      message: "Требуется аутентификация.",
    };
  }

  try {
    await removeMember({ workspaceId, actorId: user.id, memberId });
    await revalidateWorkspaceMembers(workspaceId);

    return {
      status: "success",
      message: "Участник удалён из рабочей области.",
    };
  } catch (error) {
    return buildErrorState(error, "Не удалось удалить участника.");
  }
}
