import type { Prisma, Template, TemplateLanguage } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type TemplateWithAuthor = Prisma.TemplateGetPayload<{ include: { createdBy: true } }>;

type TransactionClient = Prisma.TransactionClient;

type ClientLike = typeof prisma | TransactionClient;

function resolveClient(client?: TransactionClient): ClientLike {
  return client ?? prisma;
}

export async function createTemplate(
  data: Prisma.TemplateCreateArgs["data"],
  client?: TransactionClient,
): Promise<Template> {
  const db = resolveClient(client);

  return db.template.create({ data });
}

export async function updateTemplate(
  id: string,
  data: Prisma.TemplateUpdateArgs["data"],
  client?: TransactionClient,
): Promise<Template> {
  const db = resolveClient(client);

  return db.template.update({ where: { id }, data });
}

export async function deleteTemplate(id: string, client?: TransactionClient): Promise<Template> {
  const db = resolveClient(client);

  return db.template.delete({ where: { id } });
}

export async function findTemplatesByWorkspace(
  workspaceId: string,
  options?: { language?: TemplateLanguage },
  client?: TransactionClient,
): Promise<Template[]> {
  const db = resolveClient(client);

  return db.template.findMany({
    where: {
      workspaceId,
      ...(options?.language ? { language: options.language } : {}),
    },
    orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
  });
}

export async function findTemplateById(
  id: string,
  client?: TransactionClient,
): Promise<Template | null> {
  const db = resolveClient(client);

  return db.template.findUnique({ where: { id } });
}
