import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { MemberRole, TemplateLanguage } from "@prisma/client";

import { getCurrentUser } from "@/lib/auth";
import { findWorkspaceById } from "@/lib/prisma/workspace";
import { findMemberByWorkspaceAndUserId } from "@/lib/prisma/member";
import {
  listTemplates,
  serializeTemplateForClient,
  type SerializedTemplate,
} from "@/lib/services/template";
import { ROUTES } from "@/routes";

import TemplatesClient from "./templates-client";

export const metadata: Metadata = {
  title: "Шаблоны кода рабочей области — CodeW",
  description: "Создавайте и переиспользуйте шаблоны кода внутри команды.",
};

type WorkspaceTemplatesPageParams = {
  workspaceId: string;
};

type PageProps = {
  params: Promise<WorkspaceTemplatesPageParams>;
};

export default async function WorkspaceTemplatesPage({ params }: PageProps) {
  const { workspaceId } = await params;

  const user = await getCurrentUser();

  if (!user) {
    redirect(ROUTES.signin({ callbackUrl: ROUTES.workspaceTemplates(workspaceId) }));
  }

  const workspace = await findWorkspaceById(workspaceId);

  if (!workspace) {
    notFound();
  }

  const isOwner = workspace.ownerId === user.id;

  let role: MemberRole = MemberRole.ADMIN;

  if (!isOwner) {
    const membership = await findMemberByWorkspaceAndUserId(workspace.id, user.id);

    if (!membership) {
      notFound();
    }

    role = membership.role;
  }

  const canManage = role === MemberRole.ADMIN || role === MemberRole.EDITOR;

  const templates = await listTemplates(user.id, workspace.id);
  const serialized: SerializedTemplate[] = templates.map((template) =>
    serializeTemplateForClient(template, { includeHiddenDescription: canManage }),
  );

  return (
    <TemplatesClient
      workspace={{ id: workspace.id, name: workspace.name, slug: workspace.slug }}
      templates={serialized}
      canManage={canManage}
      languageOptions={Object.values(TemplateLanguage)}
      currentUser={{
        id: user.id,
        name: user.name ?? null,
        email: user.email ?? null,
        image: user.image ?? null,
        role,
      }}
    />
  );
}
