"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth";
import {
  WorkspaceError,
  createWorkspace,
  deleteWorkspace,
  updateWorkspace,
} from "@/lib/services/workspace";

export type WorkspaceActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Partial<Record<"name" | "slug", string>>;
};

function buildErrorState(error: unknown, fallbackMessage: string): WorkspaceActionState {
  if (error instanceof WorkspaceError) {
    const fieldErrors = error.field ? { [error.field]: error.message } : undefined;
    const message = error.code === "UNKNOWN" ? fallbackMessage : error.message;

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

export async function createWorkspaceAction(
  _prevState: WorkspaceActionState,
  formData: FormData,
): Promise<WorkspaceActionState> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      status: "error",
      message: "Требуется аутентификация.",
    };
  }

  const rawName = formData.get("name");
  const rawSlug = formData.get("slug");

  const name = typeof rawName === "string" ? rawName : "";
  const slugInput = typeof rawSlug === "string" ? rawSlug : undefined;
  const slug = slugInput && slugInput.trim().length > 0 ? slugInput : undefined;

  try {
    await createWorkspace(user.id, { name, slug });
    revalidatePath("/workspaces");

    return {
      status: "success",
      message: "Рабочая область создана.",
    };
  } catch (error) {
    return buildErrorState(error, "Не удалось создать рабочую область. Попробуйте ещё раз.");
  }
}

export async function updateWorkspaceAction(
  _prevState: WorkspaceActionState,
  formData: FormData,
): Promise<WorkspaceActionState> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      status: "error",
      message: "Требуется аутентификация.",
    };
  }

  const workspaceIdValue = formData.get("workspaceId");
  const rawName = formData.get("name");
  const rawSlug = formData.get("slug");

  const workspaceId = typeof workspaceIdValue === "string" ? workspaceIdValue : "";
  const name = typeof rawName === "string" ? rawName : "";
  const slugInput = typeof rawSlug === "string" ? rawSlug : undefined;
  const slug = slugInput && slugInput.trim().length > 0 ? slugInput : undefined;

  if (!workspaceId) {
    return {
      status: "error",
      message: "Идентификатор рабочей области не указан.",
    };
  }

  try {
    await updateWorkspace(user.id, workspaceId, { name, slug });
    revalidatePath("/workspaces");

    return {
      status: "success",
      message: "Изменения сохранены.",
    };
  } catch (error) {
    return buildErrorState(error, "Не удалось обновить рабочую область. Попробуйте ещё раз.");
  }
}

export async function deleteWorkspaceAction(workspaceId: string): Promise<WorkspaceActionState> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      status: "error",
      message: "Требуется аутентификация.",
    };
  }

  if (!workspaceId) {
    return {
      status: "error",
      message: "Идентификатор рабочей области не указан.",
    };
  }

  try {
    await deleteWorkspace(user.id, workspaceId);
    revalidatePath("/workspaces");

    return {
      status: "success",
      message: "Рабочая область удалена.",
    };
  } catch (error) {
    return buildErrorState(error, "Не удалось удалить рабочую область. Попробуйте ещё раз.");
  }
}
