"use client";

import { useMemo } from "react";
import { Avatar, Box, Chip, List, ListItem, Stack, Typography } from "@mui/material";

import type { SerializedRoomParticipant } from "@/lib/services/roomMember";
import { RoomParticipantRole } from "@prisma/client";

type RoomParticipantListProps = {
  participants: SerializedRoomParticipant[];
  currentParticipantId?: string | null;
  viewerUserId?: string | null;
};

const ROLE_LABELS: Record<RoomParticipantRole, string> = {
  [RoomParticipantRole.HOST]: "Ведущий",
  [RoomParticipantRole.COLLABORATOR]: "Интервьюер",
  [RoomParticipantRole.VIEWER]: "Наблюдатель",
  [RoomParticipantRole.GUEST]: "Гость",
};

const ROLE_PRIORITY: Record<RoomParticipantRole, number> = {
  [RoomParticipantRole.HOST]: 0,
  [RoomParticipantRole.COLLABORATOR]: 1,
  [RoomParticipantRole.VIEWER]: 2,
  [RoomParticipantRole.GUEST]: 3,
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  const initials = parts.map((part) => part.charAt(0).toUpperCase()).join("");

  return initials || name.charAt(0).toUpperCase() || "?";
}

function formatLastSeen(lastSeenAt: string | null, isOnline: boolean): string {
  if (!lastSeenAt) {
    return isOnline ? "В сети" : "Не в сети";
  }

  const date = new Date(lastSeenAt);
  const time = new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

  return isOnline ? `В сети · ${time}` : `Оффлайн · был(а) ${time}`;
}

export default function RoomParticipantList({
  participants,
  currentParticipantId,
  viewerUserId,
}: RoomParticipantListProps) {
  const sorted = useMemo(() => {
    return [...participants].sort((a, b) => {
      if (a.isOnline !== b.isOnline) {
        return a.isOnline ? -1 : 1;
      }

      const roleCompare = ROLE_PRIORITY[a.role] - ROLE_PRIORITY[b.role];

      if (roleCompare !== 0) {
        return roleCompare;
      }

      return a.displayName.localeCompare(b.displayName, "ru");
    });
  }, [participants]);

  if (sorted.length === 0) {
    return (
      <Box
        sx={{
          border: "1px dashed",
          borderColor: "divider",
          borderRadius: 2,
          py: 4,
          textAlign: "center",
        }}
      >
        <Typography variant="body2" color="text.secondary">
          В комнате пока нет участников.
        </Typography>
      </Box>
    );
  }

  return (
    <List disablePadding sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      {sorted.map((participant) => {
        const isCurrent = participant.id === currentParticipantId;
        const matchesViewerUser =
          viewerUserId && participant.user ? participant.user.id === viewerUserId : false;
        const isSelf = isCurrent || matchesViewerUser;

        return (
          <ListItem
            key={participant.id}
            disableGutters
            sx={{
              border: "1px solid",
              borderColor: participant.isOnline ? "success.light" : "divider",
              borderRadius: 2,
              px: 2,
              py: 1.5,
              opacity: participant.isOnline ? 1 : 0.8,
              bgcolor: participant.isOnline ? "success.light" : "background.paper",
            }}
          >
            <Stack direction="row" spacing={2} alignItems="center" sx={{ width: "100%" }}>
              <Avatar
                sx={{
                  bgcolor: participant.isAnonymous ? "warning.light" : "primary.main",
                  color: participant.isAnonymous ? "warning.contrastText" : "primary.contrastText",
                }}
              >
                {getInitials(participant.displayName)}
              </Avatar>
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    {participant.displayName}
                  </Typography>
                  {isSelf ? <Chip label="Вы" color="primary" size="small" /> : null}
                  {participant.isAnonymous ? (
                    <Chip label="Гость" variant="outlined" size="small" />
                  ) : null}
                </Stack>
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  flexWrap="wrap"
                  sx={{ mt: 0.5 }}
                >
                  <Chip label={ROLE_LABELS[participant.role]} size="small" variant="outlined" />
                  <Typography variant="caption" color="text.secondary">
                    {formatLastSeen(participant.lastSeenAt, participant.isOnline)}
                  </Typography>
                </Stack>
              </Box>
              <Chip
                label={participant.isOnline ? "В сети" : "Оффлайн"}
                size="small"
                color={participant.isOnline ? "success" : "default"}
                variant={participant.isOnline ? "filled" : "outlined"}
              />
            </Stack>
          </ListItem>
        );
      })}
    </List>
  );
}
