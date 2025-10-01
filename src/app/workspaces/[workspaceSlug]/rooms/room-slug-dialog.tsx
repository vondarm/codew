"use client";

import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";

import type { SerializedRoom } from "@/lib/services/room";

import { regenerateRoomSlugAction } from "./actions";
import { roomActionIdleState } from "./room-action-state";
import { withHandlers } from "@/shared/forms";
import { startTransition, useActionState } from "react";

type RoomSlugDialogProps = {
  open: boolean;
  workspaceId: string;
  room: SerializedRoom;
  onClose: () => void;
  onSuccess: (newSlug: string, message: string) => void;
};

export default function RoomSlugDialog({
  open,
  workspaceId,
  room,
  onClose,
  onSuccess,
}: RoomSlugDialogProps) {
  const [state, action, isPending] = useActionState(
    withHandlers(regenerateRoomSlugAction)({
      onSuccess: ({ newSlug, message }) => {
        if (newSlug) onSuccess(newSlug, message || "");
        onClose();
      },
    }),
    roomActionIdleState,
  );

  const generateNewSlug = () =>
    startTransition(() => action({ workspaceId, roomId: room.id, previousSlug: room.slug }));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Обновить ссылку комнаты</DialogTitle>
      <DialogContent dividers>
        {state.status === "error" && state.message ? (
          <Alert severity="error">{state.message}</Alert>
        ) : null}
        <Typography gutterBottom>
          Мы сгенерируем новый slug для комнаты. Старые ссылки перестанут работать.
        </Typography>
        <Typography color="text.secondary">
          Текущая ссылка: <strong>{room?.slug}</strong>
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isPending}>
          Отмена
        </Button>
        <Button onClick={generateNewSlug} variant="contained" disabled={isPending || !room}>
          {isPending ? <CircularProgress size={20} /> : "Сгенерировать"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
