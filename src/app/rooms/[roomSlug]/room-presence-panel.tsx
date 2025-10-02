"use client";

import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  Stack,
} from "@mui/material";

import RoomParticipantList from "./room-participant-list";
import AnonymousJoinDialog from "./anonymous-join-dialog";
import { useRoomPresence } from "./room-presence-context";

type RoomPresencePanelProps = {
  viewerUserId?: string | null;
  allowAnonymousJoin: boolean;
  requiresMemberAccount: boolean;
};

export default function RoomPresencePanel({
  viewerUserId,
  allowAnonymousJoin,
  requiresMemberAccount,
}: RoomPresencePanelProps) {
  const {
    participants,
    status,
    error,
    joinRoom,
    leaveRoom,
    refresh,
    viewerMode,
    currentParticipantId,
  } = useRoomPresence();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<"join" | "leave" | "refresh" | null>(null);

  const onlineCount = useMemo(
    () => participants.filter((participant) => participant.isOnline).length,
    [participants],
  );

  const totalCount = participants.length;
  const isConnected = status === "connected";
  const anonymousJoinDisabledReason = useMemo(() => {
    if (viewerMode !== "ANONYMOUS") {
      return null;
    }

    if (requiresMemberAccount) {
      return "Для подключения необходим аккаунт участника.";
    }

    if (!allowAnonymousJoin) {
      return "Анонимные подключения отключены владельцем комнаты.";
    }

    return null;
  }, [allowAnonymousJoin, requiresMemberAccount, viewerMode]);

  const handleMemberJoin = async () => {
    setPendingAction("join");

    try {
      await joinRoom();
    } finally {
      setPendingAction(null);
    }
  };

  const handleAnonymousJoin = () => {
    setIsDialogOpen(true);
  };

  const handleAnonymousSubmit = async (displayName: string) => {
    setPendingAction("join");

    try {
      const result = await joinRoom({ displayName });

      if (result.ok) {
        setIsDialogOpen(false);
      }
    } finally {
      setPendingAction(null);
    }
  };

  const handleLeave = async () => {
    setPendingAction("leave");

    try {
      await leaveRoom();
    } finally {
      setPendingAction(null);
    }
  };

  const handleRefresh = async () => {
    setPendingAction("refresh");

    try {
      await refresh();
    } finally {
      setPendingAction(null);
    }
  };

  const joinButton = (() => {
    if (isConnected) {
      return (
        <Button
          variant="text"
          color="inherit"
          onClick={handleLeave}
          disabled={pendingAction === "leave"}
          startIcon={pendingAction === "leave" ? <CircularProgress size={16} /> : null}
        >
          Отключиться
        </Button>
      );
    }

    if (viewerMode === "ANONYMOUS") {
      return (
        <Button
          variant="contained"
          onClick={handleAnonymousJoin}
          disabled={Boolean(anonymousJoinDisabledReason) || pendingAction === "join"}
          startIcon={pendingAction === "join" ? <CircularProgress size={16} /> : null}
        >
          Присоединиться
        </Button>
      );
    }

    return (
      <Button
        variant="contained"
        onClick={handleMemberJoin}
        disabled={pendingAction === "join"}
        startIcon={pendingAction === "join" ? <CircularProgress size={16} /> : null}
      >
        Подключиться
      </Button>
    );
  })();

  return (
    <>
      <Card variant="outlined">
        <CardHeader
          title="Участники комнаты"
          subheader={`Онлайн: ${onlineCount} / ${totalCount}`}
          action={
            <Stack direction="row" spacing={1} alignItems="center">
              <Button
                variant="outlined"
                onClick={handleRefresh}
                disabled={pendingAction === "refresh"}
                startIcon={pendingAction === "refresh" ? <CircularProgress size={16} /> : null}
              >
                Обновить
              </Button>
              {joinButton}
            </Stack>
          }
        />
        <CardContent>
          {error ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error.message}
            </Alert>
          ) : null}
          {anonymousJoinDisabledReason ? (
            <Alert severity="info" sx={{ mb: 2 }}>
              {anonymousJoinDisabledReason}
            </Alert>
          ) : null}
          <RoomParticipantList
            participants={participants}
            currentParticipantId={currentParticipantId}
            viewerUserId={viewerUserId ?? null}
          />
        </CardContent>
      </Card>
      <AnonymousJoinDialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSubmit={handleAnonymousSubmit}
        loading={pendingAction === "join"}
        error={error?.message ?? null}
      />
    </>
  );
}
