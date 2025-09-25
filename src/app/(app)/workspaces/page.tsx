import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { listWorkspaces } from "@/lib/services/workspace";

import { ROUTES } from "@/routes";

import WorkspacesClient from "./workspaces-client";

export const metadata: Metadata = {
  title: "Рабочие области — CodeW",
  description: "Создание и управление рабочими областями команды.",
};

export default async function WorkspacesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect(ROUTES.signin({ callbackUrl: ROUTES.workspaces }));
  }

  const workspaces = await listWorkspaces(user.id);

  const serialized = workspaces.map((workspace) => ({
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    createdAt: workspace.createdAt.toISOString(),
    updatedAt: workspace.updatedAt.toISOString(),
    role: workspace.role,
    isOwner: workspace.ownerId === user.id,
  }));

  return (
    <WorkspacesClient
      workspaces={serialized}
      currentUser={{
        id: user.id,
        name: user.name ?? null,
        email: user.email ?? null,
        image: user.image ?? null,
      }}
    />
  );
}
