import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { MemberRole } from "@prisma/client";

import { getCurrentUser } from "@/lib/auth";
import { listMembers } from "@/lib/services/member";
import { findMemberByWorkspaceAndUserId } from "@/lib/prisma/member";
import { findWorkspaceById } from "@/lib/prisma/workspace";
import { ROUTES } from "@/routes";

import MembersClient from "./members-client";

export const metadata: Metadata = {
  title: "Участники рабочей области — CodeW",
  description: "Управление ролями и участниками рабочей области.",
};

type WorkspacePageParams = {
  workspaceId: string;
};

type PageProps = {
  params: WorkspacePageParams;
};

export default async function WorkspaceMembersPage({ params }: PageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect(ROUTES.signin({ callbackUrl: ROUTES.workspace(params.workspaceId) }));
  }

  const workspace = await findWorkspaceById(params.workspaceId);

  if (!workspace) {
    notFound();
  }

  const membership = await findMemberByWorkspaceAndUserId(workspace.id, user.id);

  if (!membership || membership.role !== MemberRole.ADMIN) {
    notFound();
  }

  const members = await listMembers(workspace.id);

  const serializedMembers = members.map((member) => ({
    id: member.id,
    role: member.role,
    createdAt: member.createdAt.toISOString(),
    isOwner: member.userId === workspace.ownerId,
    user: {
      id: member.user.id,
      name: member.user.name ?? null,
      email: member.user.email ?? null,
      image: member.user.image ?? null,
    },
  }));

  return (
    <MembersClient
      workspace={{ id: workspace.id, name: workspace.name, slug: workspace.slug }}
      members={serializedMembers}
      currentUser={{
        id: user.id,
        name: user.name ?? null,
        email: user.email ?? null,
        image: user.image ?? null,
      }}
    />
  );
}
