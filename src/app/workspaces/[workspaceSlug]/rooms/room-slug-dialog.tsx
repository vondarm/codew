"use client";

import { useActionState, useEffect } from "react";
import {
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
import { useNotification } from "@/app/notification-provider";

type RoomSlugDialogProps = {
  open: boolean;
  workspaceId: string;
  room: SerializedRoom | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
};

export default function RoomSlugDialog({
  open,
  workspaceId,
  room,
  onClose,
  onSuccess,
}: RoomSlugDialogProps) {
  const [state, formAction, isPending] = useActionState(
    regenerateRoomSlugAction,
    roomActionIdleState,
  );
  const notify = useNotification();

  useEffect(() => {
    if (state.status === "success") {
      onSuccess(state.message ?? "Ссылка обновлена.");
      onClose();
    }
  }, [onClose, onSuccess, state.message, state.status]);

  useEffect(() => {
    if (state.status === "error" && state.message) {
      notify({ severity: "error", message: state.message });
    }
  }, [notify, state.message, state.status]);

  return (
    <Dialog open={open} onClose={isPending ? undefined : onClose} maxWidth="sm" fullWidth>
      <form action={formAction}>
        <input type="hidden" name="workspaceId" value={workspaceId} />
        <input type="hidden" name="roomId" value={room?.id ?? ""} />
        <input type="hidden" name="previousSlug" value={room?.slug ?? ""} />
        <DialogTitle>Обновить ссылку комнаты</DialogTitle>
        <DialogContent dividers>
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
          <Button type="submit" variant="contained" disabled={isPending || !room}>
            {isPending ? <CircularProgress size={20} /> : "Сгенерировать"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
