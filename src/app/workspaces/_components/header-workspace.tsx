"use client";

import { Avatar, Button, Stack, Typography } from "@mui/material";
import { ROUTES } from "@/routes";
import { RoleChip } from "@/app/workspaces/_components/RoleChip";
import { SerializedWorkspace } from "@/app/workspaces/(other)/workspaces-client";

export type HeaderWorkspace = {
  id: string;
  name: string;
  slug: string;
};

type HeaderWorkspaceMenuProps = {
  workspace: SerializedWorkspace;
};

export function HeaderWorkspace({ workspace }: HeaderWorkspaceMenuProps) {
  const avatarAlt = workspace.name;
  const avatarFallback = workspace.name.charAt(0).toUpperCase();

  return (
    <>
      <Button
        color="inherit"
        variant="text"
        href={ROUTES.workspace(workspace.slug)}
        startIcon={
          <Avatar src={undefined} alt={avatarAlt} sx={{ width: 32, height: 32 }}>
            {avatarFallback}
          </Avatar>
        }
        sx={{ textTransform: "none", color: "text.primary" }}
      >
        <Stack direction={"row"} spacing={1}>
          <Stack alignItems="flex-start" spacing={0.25}>
            <Typography variant="body2" fontWeight={600} lineHeight={1.2}>
              {workspace.name}
            </Typography>
            <Typography variant="caption" color="text.secondary" lineHeight={1.2}>
              {workspace.slug}
            </Typography>
          </Stack>
          <RoleChip workspace={workspace} />
        </Stack>
      </Button>
    </>
  );
}
