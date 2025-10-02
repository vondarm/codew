import type { ReactNode } from "react";
import { Box, Divider, type SxProps, type Theme, Toolbar } from "@mui/material";
import { getCurrentUser } from "@/lib/auth";
import { HeaderUserMenu } from "@/app/workspaces/_components/header-user-menu";

type AuthenticatedLayoutProps = {
  children: ReactNode;
};

export default async function AuthenticatedPageLayout({ children }: AuthenticatedLayoutProps) {
  const user = await getCurrentUser();

  const layoutContainerSx: SxProps<Theme> = {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
  };

  return (
    <Box sx={layoutContainerSx}>
      <Toolbar sx={{ minHeight: { xs: 64, md: 72 }, gap: 2, justifyContent: "flex-end" }}>
        {user && <HeaderUserMenu user={user} />}
      </Toolbar>
      <Divider />
      <Box component="main" sx={{ flexGrow: 1 }}>
        {children}
      </Box>
    </Box>
  );
}
