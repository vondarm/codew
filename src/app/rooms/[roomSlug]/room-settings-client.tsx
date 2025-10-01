"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { MemberRole, RoomStatus } from "@prisma/client";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Container,
  Stack,
  Typography,
} from "@mui/material";

import type { SerializedRoom } from "@/lib/services/room";
import { ROUTES } from "@/routes";
import { useNotification } from "@/app/notification-provider";

import RoomFormDialog from "@/app/workspaces/[workspaceSlug]/rooms/room-form-dialog";
import RoomCloseDialog from "@/app/workspaces/[workspaceSlug]/rooms/room-close-dialog";
import RoomSlugDialog from "@/app/workspaces/[workspaceSlug]/rooms/room-slug-dialog";
import { updateRoomAction } from "@/app/workspaces/[workspaceSlug]/rooms/actions";
import {
  copyRoomLink,
  formatRoomDate,
  ROOM_STATUS_COLORS,
  ROOM_STATUS_LABELS,
} from "@/app/workspaces/[workspaceSlug]/rooms/room-utils";

export type WorkspaceSummary = {
  id: string;
  name: string;
  slug: string;
};

type RoomSettingsClientProps = {
  room: SerializedRoom;
  workspace: WorkspaceSummary;
  canManage: boolean;
  viewerRole: MemberRole | null;
};

export default function RoomSettingsClient({
  room,
  workspace,
  canManage,
  viewerRole,
}: RoomSettingsClientProps) {
  const notify = useNotification();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [closeRoomTarget, setCloseRoomTarget] = useState<SerializedRoom | null>(null);
  const [slugRoomTarget, setSlugRoomTarget] = useState<SerializedRoom | null>(null);

  const statusLabel = ROOM_STATUS_LABELS[room.status];
  const statusColor = ROOM_STATUS_COLORS[room.status];

  const anonChips = useMemo(() => {
    return [
      { label: "Просмотр", enabled: room.allowAnonymousView },
      { label: "Редактирование", enabled: room.allowAnonymousEdit },
      { label: "Подключение", enabled: room.allowAnonymousJoin },
    ];
  }, [room.allowAnonymousEdit, room.allowAnonymousJoin, room.allowAnonymousView]);

  const handleFeedback = useCallback(
    (message: string, severity: "success" | "error" = "success") => {
      notify({ message, severity });
    },
    [notify],
  );

  const handleCopyLink = async () => {
    try {
      await copyRoomLink(room.slug);
      handleFeedback("Ссылка скопирована.");
    } catch (error) {
      console.error(error);
      handleFeedback("Не удалось скопировать ссылку.", "error");
    }
  };

  const roleNotice = useMemo(() => {
    if (!viewerRole) {
      return null;
    }

    switch (viewerRole) {
      case MemberRole.ADMIN:
        return "Вы можете управлять этой комнатой.";
      case MemberRole.EDITOR:
        return "Вы можете изменять настройки комнаты.";
      default:
        return "У вас права наблюдателя: редактирование недоступно.";
    }
  }, [viewerRole]);

  const openEditDialog = () => {
    setIsEditOpen(true);
  };

  const closeEditDialog = () => {
    setIsEditOpen(false);
  };

  const openCloseDialog = () => {
    setCloseRoomTarget(room);
  };

  const closeCloseDialog = () => {
    setCloseRoomTarget(null);
  };

  const openSlugDialog = () => {
    setSlugRoomTarget(room);
  };

  const closeSlugDialog = () => {
    setSlugRoomTarget(null);
  };

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
      <Stack spacing={4}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
        >
          <Box>
            <Typography component="h1" variant="h1" gutterBottom>
              {room.name}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip
                label={statusLabel}
                color={statusColor}
                size="small"
                variant={statusColor === "default" ? "outlined" : "filled"}
              />
              <Chip
                label={`Обновлено ${formatRoomDate(room.updatedAt)}`}
                variant="outlined"
                size="small"
              />
            </Stack>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button component={Link} href={ROUTES.workspace(workspace.id)} variant="outlined">
              К рабочей области
            </Button>
            <Button component={Link} href={ROUTES.workspaceRooms(workspace.id)} variant="outlined">
              Комнаты
            </Button>
          </Stack>
        </Stack>

        {roleNotice ? (
          <Alert severity={viewerRole === MemberRole.VIEWER ? "info" : "success"}>
            {roleNotice}
          </Alert>
        ) : null}

        <Card variant="outlined">
          <CardHeader
            title="Ссылка на комнату"
            subheader="Поделитесь ссылкой с кандидатом, чтобы он мог подключиться."
            action={
              <Button variant="outlined" onClick={handleCopyLink}>
                Копировать ссылку
              </Button>
            }
          />
          <CardContent>
            <Stack spacing={2}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="body2" color="text.secondary">
                  Slug:
                </Typography>
                <Chip label={room.slug} variant="outlined" size="small" />
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="body2" color="text.secondary">
                  Анонимный доступ:
                </Typography>
                {anonChips.map((chip) => (
                  <Chip
                    key={chip.label}
                    label={chip.label}
                    color={chip.enabled ? "success" : "default"}
                    size="small"
                    variant={chip.enabled ? "filled" : "outlined"}
                  />
                ))}
              </Stack>
              <Typography variant="body2" color="text.secondary">
                Создана: {formatRoomDate(room.createdAt)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Закрыта: {formatRoomDate(room.closedAt)}
              </Typography>
              {canManage ? (
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                  <Button variant="contained" onClick={openEditDialog}>
                    Редактировать
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={openSlugDialog}
                    disabled={room.status !== RoomStatus.ACTIVE}
                  >
                    Новая ссылка
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={openCloseDialog}
                    disabled={room.status !== RoomStatus.ACTIVE}
                  >
                    Закрыть комнату
                  </Button>
                </Stack>
              ) : null}
            </Stack>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardHeader title="Заметки и код" subheader="Текст отображается участникам комнаты." />
          <CardContent>
            {room.code ? (
              <Box
                component="pre"
                sx={{ bgcolor: "grey.50", p: 2, borderRadius: 2, overflowX: "auto" }}
              >
                {room.code}
              </Box>
            ) : (
              <Typography color="text.secondary">Нет сохранённого содержимого.</Typography>
            )}
          </CardContent>
        </Card>
      </Stack>

      <RoomFormDialog
        open={isEditOpen}
        workspaceId={workspace.id}
        room={room}
        onClose={closeEditDialog}
        onSuccess={() => {
          handleFeedback("Комната успешно обновлена");
          closeEditDialog();
        }}
        formTitle={"Обновить комнату"}
        formAction={updateRoomAction}
        submitLabel={"Сохранить"}
      />

      <RoomCloseDialog
        open={Boolean(closeRoomTarget)}
        workspaceId={workspace.id}
        room={closeRoomTarget}
        onClose={closeCloseDialog}
        onSuccess={handleFeedback}
      />

      <RoomSlugDialog
        open={Boolean(slugRoomTarget)}
        workspaceId={workspace.id}
        room={slugRoomTarget}
        onClose={closeSlugDialog}
        onSuccess={handleFeedback}
      />
    </Container>
  );
}
