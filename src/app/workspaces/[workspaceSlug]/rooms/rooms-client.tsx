"use client";

import { useMemo, useState } from "react";
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

import { copyRoomLink, formatRoomDate, ROOM_STATUS_COLORS, ROOM_STATUS_LABELS } from "./room-utils";

import RoomFormDialog from "./room-form-dialog";
import RoomCloseDialog from "./room-close-dialog";
import RoomOpenButton from "./room-open-button";
import RoomSlugDialog from "./room-slug-dialog";
import { useNotification } from "@/app/notification-provider";
import { createRoomAction, updateRoomAction } from "@/app/workspaces/[workspaceSlug]/rooms/actions";

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

export default function RoomsClient({
  workspace,
  rooms,
  canManage,
  currentUser,
}: RoomsClientProps) {
  const notify = useNotification();
  const [editRoomTarget, setEditRoomTarget] = useState<SerializedRoom | null>(null);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [closeRoomTarget, setCloseRoomTarget] = useState<SerializedRoom | null>(null);
  const [slugRoomTarget, setSlugRoomTarget] = useState<SerializedRoom | null>(null);

  const sortedRooms = useMemo(
    () =>
      rooms.toSorted((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [rooms],
  );

  const openCreateDialog = () => {
    setIsCreatingRoom(true);
    setEditRoomTarget(null);
  };
  const closeCreateDialog = () => setIsCreatingRoom(false);
  const closeEditDialog = () => setEditRoomTarget(null);
  const closeCloseDialog = () => setCloseRoomTarget(null);
  const closeSlugDialog = () => setSlugRoomTarget(null);

  const handleCopyLink = async (room: SerializedRoom) => {
    try {
      await copyRoomLink(room.slug);
      notify({ message: "Ссылка скопирована." });
    } catch (error) {
      console.error(error);
      notify({ message: "Не удалось скопировать ссылку.", severity: "error" });
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
            <Button component={Link} href={ROUTES.workspace(workspace.slug)} variant="outlined">
              Участники
            </Button>
            <Button
              component={Link}
              href={ROUTES.workspaceTemplates(workspace.slug)}
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
                    const statusColor = ROOM_STATUS_COLORS[room.status];
                    const statusLabel = ROOM_STATUS_LABELS[room.status];

                    return (
                      <TableRow key={room.id} hover>
                        <TableCell>
                          <Stack spacing={0.5}>
                            <Typography fontWeight={600}>{room.name}</Typography>
                            <Typography color="text.secondary" variant="body2">
                              Создана {formatRoomDate(room.createdAt)}
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
                        <TableCell>{formatRoomDate(room.updatedAt)}</TableCell>
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
                                  onClick={() => setEditRoomTarget(room)}
                                >
                                  Настроить
                                </Button>
                                <Button
                                  size="small"
                                  variant="text"
                                  onClick={() => setSlugRoomTarget(room)}
                                  disabled={room.status !== RoomStatus.ACTIVE}
                                >
                                  Новая ссылка
                                </Button>
                                {room.status === RoomStatus.CLOSED ? (
                                  <RoomOpenButton
                                    workspaceId={workspace.id}
                                    roomId={room.id}
                                    onSuccess={() =>
                                      notify({ message: "Комната успешно открыта." })
                                    }
                                    size="small"
                                    color="success"
                                    variant="text"
                                  >
                                    Открыть
                                  </RoomOpenButton>
                                ) : (
                                  <Button
                                    size="small"
                                    color="error"
                                    variant="text"
                                    onClick={() => setCloseRoomTarget(room)}
                                    disabled={room.status !== RoomStatus.ACTIVE}
                                  >
                                    Закрыть
                                  </Button>
                                )}
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
        open={isCreatingRoom}
        workspaceId={workspace.id}
        room={null}
        onClose={closeCreateDialog}
        onSuccess={(message) => notify({ message })}
        formAction={createRoomAction}
        formTitle={"Создать комнату"}
        submitLabel={"Создать"}
      />
      <RoomFormDialog
        open={Boolean(editRoomTarget)}
        workspaceId={workspace.id}
        room={editRoomTarget}
        onClose={closeEditDialog}
        onSuccess={(message) => notify({ message })}
        formAction={updateRoomAction}
        formTitle={"Обновить комнату"}
        submitLabel={"Сохранить"}
      />
      <RoomCloseDialog
        open={Boolean(closeRoomTarget)}
        workspaceId={workspace.id}
        room={closeRoomTarget}
        onClose={closeCloseDialog}
        onSuccess={(message) => {
          notify({ message });
          setCloseRoomTarget(null);
        }}
      />
      <RoomSlugDialog
        open={Boolean(slugRoomTarget)}
        workspaceId={workspace.id}
        room={slugRoomTarget}
        onClose={closeSlugDialog}
        onSuccess={(_, message) => notify({ message })}
      />
    </Container>
  );
}
