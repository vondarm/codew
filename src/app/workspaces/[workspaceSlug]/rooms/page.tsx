import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { MemberRole } from "@prisma/client";

import { getCurrentUser } from "@/lib/auth";
import { findWorkspaceBySlug } from "@/lib/prisma/workspace";
import { findMemberByWorkspaceAndUserId } from "@/lib/prisma/member";
import { listRoomsForWorkspace } from "@/lib/services/room";
import { ROUTES } from "@/routes";

import RoomsClient from "./rooms-client";

export const metadata: Metadata = {
  title: "Комнаты интервью рабочей области — CodeW",
  description:
    "Создавайте комнаты интервью, управляйте доступом и делитесь ссылками с кандидатами.",
};

type WorkspaceRoomsPageParams = {
  workspaceSlug: string;
};

type PageProps = {
  params: Promise<WorkspaceRoomsPageParams>;
};

export default async function WorkspaceRoomsPage({ params }: PageProps) {
  const { workspaceSlug } = await params;

  const user = await getCurrentUser();

  if (!user) {
    redirect(ROUTES.signin({ callbackUrl: ROUTES.workspaceRooms(workspaceSlug) }));
  }

  const workspace = await findWorkspaceBySlug(workspaceSlug);

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

  const canManage = role !== MemberRole.VIEWER;

  const rooms = await listRoomsForWorkspace(user.id, workspace.id);

  return (
    <RoomsClient
      workspace={{ id: workspace.id, name: workspace.name, slug: workspace.slug }}
      rooms={rooms}
      canManage={canManage}
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
