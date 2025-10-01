"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { MemberRole, RoomStatus } from "@prisma/client";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";

import type { SerializedRoom } from "@/lib/services/room";
import { ROUTES } from "@/routes";

import RoomFormDialog, { type RoomFormDialogMode } from "./room-form-dialog";
import RoomCloseDialog from "./room-close-dialog";
import RoomSlugDialog from "./room-slug-dialog";
import { useNotification } from "@/app/notification-provider";

type WorkspaceSummary = {
  id: string;
  name: string;
  slug: string;
};

type CurrentUserSummary = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: MemberRole;
};

type RoomsClientProps = {
  workspace: WorkspaceSummary;
  rooms: SerializedRoom[];
  canManage: boolean;
  currentUser: CurrentUserSummary;
};

const STATUS_LABELS: Record<RoomStatus, string> = {
  ACTIVE: "Активна",
  CLOSED: "Закрыта",
  ARCHIVED: "В архиве",
};

const STATUS_COLOR: Record<RoomStatus, "default" | "success" | "warning"> = {
  ACTIVE: "success",
  CLOSED: "default",
  ARCHIVED: "warning",
};

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  try {
    return new Intl.DateTimeFormat("ru-RU", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function RoomsClient({
  workspace,
  rooms,
  canManage,
  currentUser,
}: RoomsClientProps) {
  const notify = useNotification();
  const [formMode, setFormMode] = useState<RoomFormDialogMode>("create");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [targetRoom, setTargetRoom] = useState<SerializedRoom | null>(null);
  const [closeRoomTarget, setCloseRoomTarget] = useState<SerializedRoom | null>(null);
  const [slugRoomTarget, setSlugRoomTarget] = useState<SerializedRoom | null>(null);
  const [dialogKey, setDialogKey] = useState(0);
  const [closeDialogKey, setCloseDialogKey] = useState(0);
  const [slugDialogKey, setSlugDialogKey] = useState(0);

  const sortedRooms = useMemo(() => {
    return [...rooms].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }, [rooms]);

  const openCreateDialog = () => {
    setFormMode("create");
    setTargetRoom(null);
    setIsFormOpen(true);
  };

  const openEditDialog = (room: SerializedRoom) => {
    setFormMode("edit");
    setTargetRoom(room);
    setIsFormOpen(true);
  };

  const closeFormDialog = () => {
    setIsFormOpen(false);
    setDialogKey((value) => value + 1);
  };

  const openCloseDialog = (room: SerializedRoom) => {
    setCloseRoomTarget(room);
  };

  const closeCloseDialog = () => {
    setCloseRoomTarget(null);
    setCloseDialogKey((value) => value + 1);
  };

  const openSlugDialog = (room: SerializedRoom) => {
    setSlugRoomTarget(room);
  };

  const closeSlugDialog = () => {
    setSlugRoomTarget(null);
    setSlugDialogKey((value) => value + 1);
  };

  const handleFeedback = useCallback(
    (message: string, severity: "success" | "error" = "success") => {
      notify({ message, severity });
    },
    [notify],
  );

  const handleFormSuccess = (message: string) => {
    handleFeedback(message, "success");
    closeFormDialog();
  };

  const handleCopyLink = async (room: SerializedRoom) => {
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const url = `${origin}${ROUTES.room(room.slug)}`;
      await navigator.clipboard.writeText(url);
      handleFeedback("Ссылка скопирована.");
    } catch (error) {
      console.error(error);
      handleFeedback("Не удалось скопировать ссылку.", "error");
    }
  };

  const roleLabel = useMemo(() => {
    switch (currentUser.role) {
      case MemberRole.ADMIN:
        return "Администратор";
      case MemberRole.EDITOR:
        return "Редактор";
      default:
        return "Наблюдатель";
    }
  }, [currentUser.role]);

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <Stack spacing={4}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
        >
          <Box>
            <Typography component="h1" variant="h1" gutterBottom>
              Комнаты интервью
            </Typography>
            <Typography color="text.secondary">
              Управляйте сессиями интервью: создавайте комнаты, делитесь ссылками и контролируйте
              доступ кандидатов.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button component={Link} href={ROUTES.workspaces} variant="outlined">
              К рабочим областям
            </Button>
            <Button component={Link} href={ROUTES.workspace(workspace.id)} variant="outlined">
              Участники
            </Button>
            <Button
              component={Link}
              href={ROUTES.workspaceTemplates(workspace.id)}
              variant="outlined"
            >
              Шаблоны
            </Button>
          </Stack>
        </Stack>

        <Card variant="outlined">
          <CardContent>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", md: "center" }}
            >
              <Box>
                <Typography variant="h5" gutterBottom>
                  {workspace.name}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip label={workspace.slug} variant="outlined" size="small" />
                  <Chip label={roleLabel} size="small" color={canManage ? "success" : "default"} />
                </Stack>
              </Box>
              {canManage ? (
                <Button variant="contained" onClick={openCreateDialog}>
                  Создать комнату
                </Button>
              ) : null}
            </Stack>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent>
            {sortedRooms.length === 0 ? (
              <Stack spacing={2} textAlign="center" alignItems="center" py={4}>
                <Typography variant="h6">Комнат пока нет</Typography>
                {canManage ? (
                  <>
                    <Typography color="text.secondary">
                      Создайте первую комнату, чтобы пригласить кандидата и провести интервью.
                    </Typography>
                    <Button variant="contained" onClick={openCreateDialog}>
                      Создать комнату
                    </Button>
                  </>
                ) : (
                  <Typography color="text.secondary">
                    Дождитесь, пока администратор создаст первую комнату для интервью.
                  </Typography>
                )}
              </Stack>
            ) : (
              <Table size="medium">
                <TableHead>
                  <TableRow>
                    <TableCell>Название</TableCell>
                    <TableCell>Статус</TableCell>
                    <TableCell>Анонимный доступ</TableCell>
                    <TableCell>Slug</TableCell>
                    <TableCell>Обновлено</TableCell>
                    <TableCell align="right">Действия</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedRooms.map((room) => {
                    const statusColor = STATUS_COLOR[room.status];
                    const statusLabel = STATUS_LABELS[room.status];

                    return (
                      <TableRow key={room.id} hover>
                        <TableCell>
                          <Stack spacing={0.5}>
                            <Typography fontWeight={600}>{room.name}</Typography>
                            <Typography color="text.secondary" variant="body2">
                              Создана {formatDate(room.createdAt)}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={statusLabel}
                            color={statusColor}
                            size="small"
                            variant={statusColor === "default" ? "outlined" : "filled"}
                          />
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1}>
                            <Tooltip title="Просмотр">
                              <Chip
                                label="👁"
                                size="small"
                                color={room.allowAnonymousView ? "success" : "default"}
                              />
                            </Tooltip>
                            <Tooltip title="Редактирование">
                              <Chip
                                label="✎"
                                size="small"
                                color={room.allowAnonymousEdit ? "success" : "default"}
                              />
                            </Tooltip>
                            <Tooltip title="Подключение">
                              <Chip
                                label="⇄"
                                size="small"
                                color={room.allowAnonymousJoin ? "success" : "default"}
                              />
                            </Tooltip>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Chip label={room.slug} size="small" variant="outlined" />
                            <Button size="small" onClick={() => handleCopyLink(room)}>
                              Копировать
                            </Button>
                          </Stack>
                        </TableCell>
                        <TableCell>{formatDate(room.updatedAt)}</TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Button
                              size="small"
                              variant="outlined"
                              component={Link}
                              href={ROUTES.room(room.slug)}
                            >
                              Открыть
                            </Button>
                            {canManage ? (
                              <>
                                <Button
                                  size="small"
                                  variant="text"
                                  onClick={() => openEditDialog(room)}
                                >
                                  Настроить
                                </Button>
                                <Button
                                  size="small"
                                  variant="text"
                                  onClick={() => openSlugDialog(room)}
                                  disabled={room.status !== RoomStatus.ACTIVE}
                                >
                                  Новая ссылка
                                </Button>
                                <Button
                                  size="small"
                                  color="error"
                                  variant="text"
                                  onClick={() => openCloseDialog(room)}
                                  disabled={room.status !== RoomStatus.ACTIVE}
                                >
                                  Закрыть
                                </Button>
                              </>
                            ) : null}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </Stack>

      <RoomFormDialog
        key={dialogKey}
        open={isFormOpen}
        mode={formMode}
        workspaceId={workspace.id}
        room={targetRoom}
        onClose={closeFormDialog}
        onSuccess={handleFormSuccess}
      />

      <RoomCloseDialog
        key={closeDialogKey}
        open={Boolean(closeRoomTarget)}
        workspaceId={workspace.id}
        room={closeRoomTarget}
        onClose={closeCloseDialog}
        onSuccess={handleFeedback}
      />

      <RoomSlugDialog
        key={slugDialogKey}
        open={Boolean(slugRoomTarget)}
        workspaceId={workspace.id}
        room={slugRoomTarget}
        onClose={closeSlugDialog}
        onSuccess={handleFeedback}
      />
    </Container>
  );
}
