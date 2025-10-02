import type { ReactNode } from "react";

import { Box, type SxProps, type Theme } from "@mui/material";

import { getCurrentUser } from "@/lib/auth";
import { getRoom } from "@/lib/services/room";
import { findMemberByWorkspaceAndUserId } from "@/lib/prisma/member";
import { findWorkspaceBySlug } from "@/lib/prisma/workspace";

import { AppHeader, type HeaderUser, type HeaderWorkspace } from "./_components/app-header";

type AuthenticatedLayoutParams = {
  workspaceSlug?: string | string[];
  roomSlug?: string | string[];
};

type AuthenticatedLayoutProps = {
  children: ReactNode;
  params: Promise<AuthenticatedLayoutParams>;
};

async function resolveWorkspaceFromSlug(
  workspaceSlug: string,
  userId: string,
): Promise<HeaderWorkspace | null> {
  const workspace = await findWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    return null;
  }

  if (workspace.ownerId !== userId) {
    const membership = await findMemberByWorkspaceAndUserId(workspace.id, userId);

    if (!membership) {
      return null;
    }
  }

  return {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
  };
}

async function resolveWorkspaceFromRoom(
  roomSlug: string,
  userId: string,
): Promise<HeaderWorkspace | null> {
  try {
    const details = await getRoom(roomSlug, { userId });

    if (details.access !== "MEMBER") {
      return null;
    }

    return {
      id: details.workspace.id,
      name: details.workspace.name,
      slug: details.workspace.slug,
    };
  } catch {
    return null;
  }
}

async function resolveWorkspaceSummary(
  params: AuthenticatedLayoutParams,
  userId: string,
): Promise<HeaderWorkspace | null> {
  const workspaceSlugParam = params.workspaceSlug;
  const roomSlugParam = params.roomSlug;

  if (typeof workspaceSlugParam === "string") {
    return resolveWorkspaceFromSlug(workspaceSlugParam, userId);
  }

  if (typeof roomSlugParam === "string") {
    return resolveWorkspaceFromRoom(roomSlugParam, userId);
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
    backgroundColor: (theme) => theme.palette.background.default,
  };

  if (!user) {
    return (
      <Box sx={layoutContainerSx}>
        <Box component="main" sx={{ flexGrow: 1 }}>
          {children}
        </Box>
      </Box>
    );
  }

  const workspace = await resolveWorkspaceSummary(resolvedParams, user.id);

  const headerUser: HeaderUser = {
    id: user.id,
    name: user.name ?? null,
    email: user.email ?? null,
    image: user.image ?? null,
  };

  return (
    <Box sx={layoutContainerSx}>
      <AppHeader user={headerUser} workspace={workspace} />
      <Box component="main" sx={{ flexGrow: 1 }}>
        {children}
      </Box>
    </Box>
  );
}
