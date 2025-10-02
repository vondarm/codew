"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
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
    refresh,
    viewerMode,
    currentParticipantId,
    needsAnonymousProfile,
  } = useRoomPresence();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"register" | "rename">("register");
  const [pendingAction, setPendingAction] = useState<"join" | "rename" | "refresh" | null>(null);

  const onlineCount = useMemo(
    () => participants.filter((participant) => participant.isOnline).length,
    [participants],
  );

  const totalCount = participants.length;

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

  const currentParticipant = useMemo(
    () => participants.find((participant) => participant.id === currentParticipantId) ?? null,
    [participants, currentParticipantId],
  );

  useEffect(() => {
    if (viewerMode !== "ANONYMOUS") {
      return;
    }

    if (anonymousJoinDisabledReason) {
      setIsDialogOpen(false);
      return;
    }

    if (needsAnonymousProfile) {
      setDialogMode("register");
      setIsDialogOpen(true);
    }
  }, [anonymousJoinDisabledReason, needsAnonymousProfile, viewerMode]);

  useEffect(() => {
    if (!needsAnonymousProfile && dialogMode === "register" && isDialogOpen) {
      setIsDialogOpen(false);
    }
  }, [dialogMode, isDialogOpen, needsAnonymousProfile]);

  const handleRefresh = async () => {
    setPendingAction("refresh");

    try {
      await refresh();
    } finally {
      setPendingAction(null);
    }
  };

  const handleOpenRename = () => {
    setDialogMode("rename");
    setIsDialogOpen(true);
  };

  const handleAnonymousSubmit = async (displayName: string) => {
    const actionType = dialogMode === "rename" ? "rename" : "join";
    setPendingAction(actionType);

    try {
      const result = await joinRoom({ displayName });

      if (result.ok) {
        setIsDialogOpen(false);
      }
    } finally {
      setPendingAction(null);
    }
  };

  const statusChip = useMemo(() => {
    switch (status) {
      case "connected":
        return <Chip label="Подключено" color="success" size="small" />;
      case "connecting":
        return <Chip label="Подключаемся" color="info" size="small" variant="outlined" />;
      case "error":
        return <Chip label="Ошибка" color="error" size="small" />;
      default:
        return <Chip label="Ожидание" variant="outlined" size="small" />;
    }
  }, [status]);

  const canRenameAnonymous =
    viewerMode === "ANONYMOUS" && !anonymousJoinDisabledReason && status === "connected";

  return (
    <>
      <Card variant="outlined">
        <CardHeader
          title="Участники комнаты"
          subheader={`Онлайн: ${onlineCount} / ${totalCount}`}
          action={
            <Stack direction="row" spacing={1} alignItems="center">
              <Stack direction="row" spacing={1} alignItems="center">
                {status === "connecting" ? <CircularProgress size={16} /> : null}
                {statusChip}
              </Stack>
              <Button
                variant="outlined"
                onClick={handleRefresh}
                disabled={pendingAction === "refresh"}
                startIcon={pendingAction === "refresh" ? <CircularProgress size={16} /> : null}
              >
                Обновить
              </Button>
              {canRenameAnonymous ? (
                <Button
                  variant="outlined"
                  onClick={handleOpenRename}
                  disabled={pendingAction === "rename"}
                  startIcon={pendingAction === "rename" ? <CircularProgress size={16} /> : null}
                >
                  Сменить имя
                </Button>
              ) : null}
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
        loading={pendingAction === "join" || pendingAction === "rename"}
        error={error?.message ?? null}
        initialDisplayName={
          dialogMode === "rename" && currentParticipant ? currentParticipant.displayName : undefined
        }
      />
    </>
  );
}
