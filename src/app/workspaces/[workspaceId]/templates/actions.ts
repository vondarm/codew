"use server";

import { revalidatePath } from "next/cache";
import { TemplateLanguage } from "@prisma/client";

import { getCurrentUser } from "@/lib/auth";
import {
  TemplateError,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from "@/lib/services/template";
import type { TemplateActionState } from "./template-action-state";
import { ROUTES } from "@/routes";

function buildErrorState(error: unknown, fallbackMessage: string): TemplateActionState {
  if (error instanceof TemplateError) {
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

function parseLanguage(raw: FormDataEntryValue | null): TemplateLanguage | null {
  if (typeof raw !== "string") {
    return null;
  }

  return Object.values(TemplateLanguage).includes(raw as TemplateLanguage)
    ? (raw as TemplateLanguage)
    : null;
}

export async function createTemplateAction(
  _prevState: TemplateActionState,
  formData: FormData,
): Promise<TemplateActionState> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      status: "error",
      message: "Требуется аутентификация.",
    };
  }

  const workspaceIdValue = formData.get("workspaceId");
  const nameValue = formData.get("name");
  const descriptionValue = formData.get("description");
  const hiddenDescriptionValue = formData.get("hiddenDescription");
  const languageValue = parseLanguage(formData.get("language"));
  const contentValue = formData.get("content");

  const workspaceId = typeof workspaceIdValue === "string" ? workspaceIdValue : "";
  const name = typeof nameValue === "string" ? nameValue : "";
  const description = typeof descriptionValue === "string" ? descriptionValue : "";
  const hiddenDescription =
    typeof hiddenDescriptionValue === "string" ? hiddenDescriptionValue : "";
  const content = typeof contentValue === "string" ? contentValue : "";

  if (!workspaceId) {
    return {
      status: "error",
      message: "Рабочая область не указана.",
    };
  }

  if (!languageValue) {
    return {
      status: "error",
      fieldErrors: { language: "Выберите язык шаблона." },
    };
  }

  try {
    await createTemplate(user.id, workspaceId, {
      name,
      description,
      hiddenDescription,
      language: languageValue,
      content,
    });

    revalidatePath(ROUTES.workspaceTemplates(workspaceId));

    return {
      status: "success",
      message: "Шаблон создан.",
    };
  } catch (error) {
    return buildErrorState(error, "Не удалось создать шаблон. Попробуйте позже.");
  }
}

export async function updateTemplateAction(
  _prevState: TemplateActionState,
  formData: FormData,
): Promise<TemplateActionState> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      status: "error",
      message: "Требуется аутентификация.",
    };
  }

  const workspaceIdValue = formData.get("workspaceId");
  const templateIdValue = formData.get("templateId");
  const nameValue = formData.get("name");
  const descriptionValue = formData.get("description");
  const hiddenDescriptionValue = formData.get("hiddenDescription");
  const languageValue = parseLanguage(formData.get("language"));
  const contentValue = formData.get("content");

  const workspaceId = typeof workspaceIdValue === "string" ? workspaceIdValue : "";
  const templateId = typeof templateIdValue === "string" ? templateIdValue : "";
  const name = typeof nameValue === "string" ? nameValue : "";
  const description = typeof descriptionValue === "string" ? descriptionValue : "";
  const hiddenDescription =
    typeof hiddenDescriptionValue === "string" ? hiddenDescriptionValue : "";
  const content = typeof contentValue === "string" ? contentValue : "";

  if (!workspaceId || !templateId) {
    return {
      status: "error",
      message: "Недостаточно данных для обновления шаблона.",
    };
  }

  if (!languageValue) {
    return {
      status: "error",
      fieldErrors: { language: "Выберите язык шаблона." },
    };
  }

  try {
    await updateTemplate(user.id, workspaceId, templateId, {
      name,
      description,
      hiddenDescription,
      language: languageValue,
      content,
    });

    revalidatePath(ROUTES.workspaceTemplates(workspaceId));

    return {
      status: "success",
      message: "Шаблон обновлён.",
    };
  } catch (error) {
    return buildErrorState(error, "Не удалось обновить шаблон.");
  }
}

export async function deleteTemplateAction(
  _prevState: TemplateActionState,
  formData: FormData,
): Promise<TemplateActionState> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      status: "error",
      message: "Требуется аутентификация.",
    };
  }

  const workspaceIdValue = formData.get("workspaceId");
  const templateIdValue = formData.get("templateId");

  const workspaceId = typeof workspaceIdValue === "string" ? workspaceIdValue : "";
  const templateId = typeof templateIdValue === "string" ? templateIdValue : "";

  if (!workspaceId || !templateId) {
    return {
      status: "error",
      message: "Недостаточно данных для удаления шаблона.",
    };
  }

  try {
    await deleteTemplate(user.id, workspaceId, templateId);
    revalidatePath(ROUTES.workspaceTemplates(workspaceId));

    return {
      status: "success",
      message: "Шаблон удалён.",
    };
  } catch (error) {
    return buildErrorState(error, "Не удалось удалить шаблон.");
  }
}
