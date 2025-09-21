import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { listWorkspaces } from "@/lib/services/workspace";

import WorkspacesClient from "./workspaces-client";

export const metadata: Metadata = {
  title: "Рабочие области — CodeW",
  description: "Создание и управление рабочими областями команды.",
};

export default async function WorkspacesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent("/workspaces")}`);
  }

  const workspaces = await listWorkspaces(user.id);

  const serialized = workspaces.map((workspace) => ({
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    createdAt: workspace.createdAt.toISOString(),
    updatedAt: workspace.updatedAt.toISOString(),
  }));

  return <WorkspacesClient workspaces={serialized} />;
}
