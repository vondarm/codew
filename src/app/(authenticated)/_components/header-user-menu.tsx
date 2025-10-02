"use client";

import { type MouseEvent, useMemo, useState, useTransition } from "react";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  Divider,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Typography,
} from "@mui/material";

import { logout } from "@/lib/auth-client";
import { ROUTES } from "@/routes";

import type { HeaderUser } from "./app-header";

type HeaderUserMenuProps = {
  user: HeaderUser;
};

export function HeaderUserMenu({ user }: HeaderUserMenuProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [isPending, startTransition] = useTransition();

  const displayName = useMemo(() => {
    if (user.name && user.name.trim().length > 0) {
      return user.name;
    }

    if (user.email && user.email.trim().length > 0) {
      return user.email;
    }

    return "Пользователь";
  }, [user.email, user.name]);

  const avatarAlt = displayName;
  const avatarFallback = displayName.charAt(0).toUpperCase();

  const handleOpen = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleClose();
    startTransition(async () => {
      await logout({ callbackUrl: ROUTES.home });
    });
  };

  return (
    <>
      <Button
        onClick={handleOpen}
        color="inherit"
        variant="text"
        endIcon={<KeyboardArrowDownIcon />}
        startIcon={
          <Avatar src={user.image ?? undefined} alt={avatarAlt} sx={{ width: 32, height: 32 }}>
            {avatarFallback}
          </Avatar>
        }
        sx={{ textTransform: "none", color: "text.primary" }}
      >
        <Stack alignItems="flex-start" spacing={0.25}>
          <Typography variant="body2" fontWeight={600} lineHeight={1.2}>
            {displayName}
          </Typography>
          {user.email ? (
            <Typography variant="caption" color="text.secondary" lineHeight={1.2}>
              {user.email}
            </Typography>
          ) : null}
        </Stack>
      </Button>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose} keepMounted>
        <Box px={2} py={1.5} maxWidth={240}>
          <Typography variant="subtitle2" fontWeight={600} noWrap>
            {displayName}
          </Typography>
          {user.email ? (
            <Typography variant="body2" color="text.secondary" noWrap>
              {user.email}
            </Typography>
          ) : null}
        </Box>
        <Divider />
        <MenuItem onClick={handleLogout} disabled={isPending}>
          <ListItemIcon>
            {isPending ? <CircularProgress size={20} /> : <LogoutRoundedIcon fontSize="small" />}
          </ListItemIcon>
          <ListItemText primary="Выйти" />
        </MenuItem>
      </Menu>
    </>
  );
}
