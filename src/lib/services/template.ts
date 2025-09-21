import {
  MemberRole,
  Prisma,
  TemplateLanguage,
  type Template,
  type Workspace,
} from "@prisma/client";

import {
  createTemplate as createTemplateRecord,
  deleteTemplate as deleteTemplateRecord,
  findTemplateById,
  findTemplatesByWorkspace,
  updateTemplate as updateTemplateRecord,
} from "@/lib/prisma/template";
import { findWorkspaceById } from "@/lib/prisma/workspace";
import { findMemberByWorkspaceAndUserId } from "@/lib/prisma/member";

const NAME_MIN_LENGTH = 3;
const NAME_MAX_LENGTH = 120;
const DESCRIPTION_MAX_LENGTH = 500;
const HIDDEN_DESCRIPTION_MAX_LENGTH = 1000;
const CONTENT_MAX_LENGTH = 20000;

export type TemplateField = "name" | "description" | "hiddenDescription" | "language" | "content";

type TemplateErrorCode = "NOT_FOUND" | "FORBIDDEN" | "VALIDATION_ERROR" | "UNKNOWN";

export class TemplateError extends Error {
  constructor(
    message: string,
    public readonly code: TemplateErrorCode,
    public readonly field?: TemplateField,
  ) {
    super(message);
    this.name = "TemplateError";
  }
}

function normalizeName(rawName: string): string {
  const value = rawName.trim();

  if (value.length < NAME_MIN_LENGTH) {
    throw new TemplateError(
      `Название должно содержать минимум ${NAME_MIN_LENGTH} символа(-ов).`,
      "VALIDATION_ERROR",
      "name",
    );
  }

  if (value.length > NAME_MAX_LENGTH) {
    throw new TemplateError(
      `Название не может превышать ${NAME_MAX_LENGTH} символов.`,
      "VALIDATION_ERROR",
      "name",
    );
  }

  return value;
}

function normalizeDescription(rawDescription?: string | null): string | null {
  if (rawDescription == null) {
    return null;
  }

  const value = rawDescription.trim();

  if (value.length === 0) {
    return null;
  }

  if (value.length > DESCRIPTION_MAX_LENGTH) {
    throw new TemplateError(
      `Описание не может превышать ${DESCRIPTION_MAX_LENGTH} символов.`,
      "VALIDATION_ERROR",
      "description",
    );
  }

  return value;
}

function normalizeHiddenDescription(rawHiddenDescription?: string | null): string | null {
  if (rawHiddenDescription == null) {
    return null;
  }

  const value = rawHiddenDescription.trim();

  if (value.length === 0) {
    return null;
  }

  if (value.length > HIDDEN_DESCRIPTION_MAX_LENGTH) {
    throw new TemplateError(
      `Скрытое описание не может превышать ${HIDDEN_DESCRIPTION_MAX_LENGTH} символов.`,
      "VALIDATION_ERROR",
      "hiddenDescription",
    );
  }

  return value;
}

function normalizeLanguage(rawLanguage: TemplateLanguage | string): TemplateLanguage {
  if (Object.values(TemplateLanguage).includes(rawLanguage as TemplateLanguage)) {
    return rawLanguage as TemplateLanguage;
  }

  throw new TemplateError("Выберите язык шаблона.", "VALIDATION_ERROR", "language");
}

function normalizeContent(rawContent?: string | null): string {
  const normalized = (rawContent ?? "").replace(/\r\n/g, "\n");

  if (normalized.length > CONTENT_MAX_LENGTH) {
    throw new TemplateError(
      `Содержимое не может превышать ${CONTENT_MAX_LENGTH} символов.`,
      "VALIDATION_ERROR",
      "content",
    );
  }

  return normalized;
}

type WorkspaceAccess = { workspace: Workspace; role: MemberRole };

async function ensureWorkspaceAccess(
  workspaceId: string,
  userId: string,
): Promise<WorkspaceAccess> {
  const workspace = await findWorkspaceById(workspaceId);

  if (!workspace) {
    throw new TemplateError("Рабочая область не найдена.", "NOT_FOUND");
  }

  if (workspace.ownerId === userId) {
    return { workspace, role: MemberRole.ADMIN };
  }

  const membership = await findMemberByWorkspaceAndUserId(workspaceId, userId);

  if (!membership) {
    throw new TemplateError("Вы не являетесь участником этой рабочей области.", "FORBIDDEN");
  }

  return { workspace, role: membership.role };
}

async function ensureCanManageTemplates(
  workspaceId: string,
  userId: string,
): Promise<WorkspaceAccess> {
  const access = await ensureWorkspaceAccess(workspaceId, userId);

  if (access.role === MemberRole.VIEWER) {
    throw new TemplateError("Недостаточно прав для управления шаблонами.", "FORBIDDEN");
  }

  // TODO: дополнить проверку, когда появится расширенное управление ролями шаблонов.
  return access;
}

function mapPrismaError(error: unknown): TemplateError {
  if (error instanceof TemplateError) {
    return error;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return new TemplateError(
        "Шаблон с таким названием уже существует в рабочей области.",
        "VALIDATION_ERROR",
        "name",
      );
    }

    if (error.code === "P2025") {
      return new TemplateError("Шаблон не найден.", "NOT_FOUND");
    }
  }

  return new TemplateError("Произошла ошибка при работе с шаблонами.", "UNKNOWN");
}

export type TemplateInput = {
  name: string;
  description?: string | null;
  hiddenDescription?: string | null;
  language: TemplateLanguage | string;
  content?: string | null;
};

export type SerializedTemplate = {
  id: string;
  workspaceId: string;
  createdById: string;
  name: string;
  description: string | null;
  hiddenDescription: string | null;
  language: TemplateLanguage;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export function serializeTemplateForClient(
  template: Template,
  options?: { includeHiddenDescription?: boolean },
): SerializedTemplate {
  return {
    id: template.id,
    workspaceId: template.workspaceId,
    createdById: template.createdById,
    name: template.name,
    description: template.description ?? null,
    hiddenDescription: options?.includeHiddenDescription
      ? (template.hiddenDescription ?? null)
      : null,
    language: template.language,
    content: template.content,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  };
}

export async function listTemplates(
  userId: string,
  workspaceId: string,
  options?: { language?: TemplateLanguage | string | null },
): Promise<Template[]> {
  const access = await ensureWorkspaceAccess(workspaceId, userId);
  const language = options?.language ? normalizeLanguage(options.language) : undefined;

  return findTemplatesByWorkspace(access.workspace.id, language ? { language } : undefined);
}

export async function getTemplate(
  userId: string,
  workspaceId: string,
  templateId: string,
): Promise<Template> {
  await ensureWorkspaceAccess(workspaceId, userId);

  const template = await findTemplateById(templateId);

  if (!template || template.workspaceId !== workspaceId) {
    throw new TemplateError("Шаблон не найден.", "NOT_FOUND");
  }

  return template;
}

export async function createTemplate(
  userId: string,
  workspaceId: string,
  input: TemplateInput,
): Promise<Template> {
  const access = await ensureCanManageTemplates(workspaceId, userId);
  const name = normalizeName(input.name);
  const description = normalizeDescription(input.description ?? null);
  const hiddenDescription = normalizeHiddenDescription(input.hiddenDescription ?? null);
  const language = normalizeLanguage(input.language);
  const content = normalizeContent(input.content);

  try {
    return await createTemplateRecord({
      name,
      description,
      hiddenDescription,
      language,
      content,
      workspace: { connect: { id: access.workspace.id } },
      createdBy: { connect: { id: userId } },
    });
  } catch (error) {
    throw mapPrismaError(error);
  }
}

export async function updateTemplate(
  userId: string,
  workspaceId: string,
  templateId: string,
  input: TemplateInput,
): Promise<Template> {
  const template = await findTemplateById(templateId);

  if (!template || template.workspaceId !== workspaceId) {
    throw new TemplateError("Шаблон не найден.", "NOT_FOUND");
  }

  await ensureCanManageTemplates(workspaceId, userId);

  const name = normalizeName(input.name);
  const description = normalizeDescription(input.description ?? null);
  const hiddenDescription = normalizeHiddenDescription(input.hiddenDescription ?? null);
  const language = normalizeLanguage(input.language);
  const content = normalizeContent(input.content);

  try {
    return await updateTemplateRecord(template.id, {
      name,
      description,
      hiddenDescription,
      language,
      content,
    });
  } catch (error) {
    throw mapPrismaError(error);
  }
}

export async function deleteTemplate(
  userId: string,
  workspaceId: string,
  templateId: string,
): Promise<void> {
  const template = await findTemplateById(templateId);

  if (!template || template.workspaceId !== workspaceId) {
    throw new TemplateError("Шаблон не найден.", "NOT_FOUND");
  }

  await ensureCanManageTemplates(workspaceId, userId);

  try {
    await deleteTemplateRecord(template.id);
  } catch (error) {
    throw mapPrismaError(error);
  }
}
