import NextLink from "next/link";
import { AppBar, Avatar, Box, Link as MuiLink, Stack, Toolbar, Typography } from "@mui/material";

import { ROUTES } from "@/routes";

import { HeaderUserMenu } from "./header-user-menu";

export type HeaderUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
};

export type HeaderWorkspace = {
  id: string;
  name: string;
  slug: string;
};

type AppHeaderProps = {
  user: HeaderUser;
  workspace: HeaderWorkspace | null;
};

function getInitialLetter(input: string): string {
  const trimmed = input.trim();

  if (trimmed.length === 0) {
    return "?";
  }

  return trimmed.charAt(0).toUpperCase();
}

export function AppHeader({ user, workspace }: AppHeaderProps) {
  const workspaceAvatarFallback = workspace ? getInitialLetter(workspace.name) : "W";

  return (
    <AppBar
      position="static"
      color="inherit"
      elevation={0}
      sx={(theme) => ({
        borderBottom: `1px solid ${theme.palette.divider}`,
        backgroundColor: theme.palette.background.paper,
      })}
    >
      <Toolbar sx={{ minHeight: { xs: 64, md: 72 }, gap: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center" flexGrow={1} minWidth={0}>
          <Avatar alt={workspace?.name ?? "Рабочая область"}>{workspaceAvatarFallback}</Avatar>
          <Box minWidth={0}>
            <Typography variant="subtitle1" fontWeight={600} noWrap>
              {workspace ? workspace.name : "Выберите рабочую область"}
            </Typography>
            {workspace ? (
              <MuiLink
                component={NextLink}
                href={ROUTES.workspace(workspace.slug)}
                color="text.secondary"
                underline="hover"
                variant="body2"
                noWrap
              >
                /workspaces/{workspace.slug}
              </MuiLink>
            ) : (
              <Typography variant="body2" color="text.secondary" noWrap>
                Рабочее пространство не выбрано
              </Typography>
            )}
          </Box>
        </Stack>
        <HeaderUserMenu user={user} />
      </Toolbar>
    </AppBar>
  );
}
