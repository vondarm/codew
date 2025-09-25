"use client";

import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import { useMemo } from "react";

import type { WorkspaceListUser } from "../types";

type UserCardProps = {
  user: WorkspaceListUser;
  onLogout: () => void;
  isLogoutPending: boolean;
};

export function UserCard({ user, onLogout, isLogoutPending }: UserCardProps) {
  const displayName = useMemo(
    () => user.name ?? user.email ?? "Пользователь",
    [user.email, user.name],
  );
  const avatarFallback = useMemo(() => displayName.charAt(0).toUpperCase(), [displayName]);

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={3}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar src={user.image ?? undefined} alt={displayName}>
              {avatarFallback}
            </Avatar>
            <Box>
              <Typography fontWeight={600}>{displayName}</Typography>
              {user.email ? (
                <Typography color="text.secondary" variant="body2">
                  {user.email}
                </Typography>
              ) : null}
            </Box>
          </Stack>
          <Button variant="outlined" onClick={onLogout} disabled={isLogoutPending}>
            {isLogoutPending ? <CircularProgress size={20} /> : "Выйти"}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
