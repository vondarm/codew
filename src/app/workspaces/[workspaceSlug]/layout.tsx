import type { ReactNode } from "react";

import { Box, Divider, type SxProps, type Theme, Toolbar } from "@mui/material";

import { getCurrentUser } from "@/lib/auth";
import { findMemberByWorkspaceAndUserId } from "@/lib/prisma/member";
import { findWorkspaceBySlug } from "@/lib/prisma/workspace";
import { HeaderWorkspace } from "@/app/workspaces/_components/header-workspace";
import { HeaderUserMenu } from "@/app/workspaces/_components/header-user-menu";
import { NavigationTabs } from "@/app/workspaces/[workspaceSlug]/NavigationTabs";
import { WorkspaceSummary } from "@/lib/services/workspace";

type AuthenticatedLayoutParams = {
  workspaceSlug?: string | string[];
};

type AuthenticatedLayoutProps = {
  children: ReactNode;
  params: Promise<AuthenticatedLayoutParams>;
};

async function resolveWorkspaceFromSlug(
  workspaceSlug: string,
  userId?: string,
): Promise<WorkspaceSummary | null> {
  const workspace = await findWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    return null;
  }

  const membership = userId ? await findMemberByWorkspaceAndUserId(workspace.id, userId) : null;

  return {
    ...workspace,
    role: membership?.role || "VIEWER", //TODO "AVOID"
  };
}

async function resolveWorkspaceSummary(
  params: AuthenticatedLayoutParams,
  userId?: string,
): Promise<WorkspaceSummary | null> {
  const workspaceSlugParam = params.workspaceSlug;

  if (typeof workspaceSlugParam === "string") {
    return resolveWorkspaceFromSlug(workspaceSlugParam, userId);
  }

  return null;
}

export default async function AuthenticatedLayout({ children, params }: AuthenticatedLayoutProps) {
  const resolvedParams = await params;
  const user = await getCurrentUser();

  const layoutContainerSx: SxProps<Theme> = {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
  };

  const workspace = await resolveWorkspaceSummary(resolvedParams, user?.id);
  const member = user && workspace && (await findMemberByWorkspaceAndUserId(workspace.id, user.id));

  return (
    <Box sx={layoutContainerSx}>
      <Toolbar sx={{ minHeight: { xs: 64, md: 72 }, gap: 2, justifyContent: "space-between" }}>
        {workspace && (
          <HeaderWorkspace
            workspace={{
              ...workspace,
              isOwner: workspace.ownerId === user?.id,
              createdAt: "",
              updatedAt: "",
            }}
          />
        )}
        {user && <HeaderUserMenu user={user} />}
      </Toolbar>
      {workspace && member && <NavigationTabs workspaceSlug={workspace.slug} />}
      <Divider />
      <Box component="main" sx={{ flexGrow: 1 }}>
        {children}
      </Box>
    </Box>
  );
}
