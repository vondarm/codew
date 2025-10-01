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

import { closeRoomAction } from "./actions";
import { roomActionIdleState } from "./room-action-state";
import { withHandlers } from "@/shared/forms";
import { startTransition, useActionState } from "react";

type RoomCloseDialogProps = {
  open: boolean;
  workspaceId: string;
  room: SerializedRoom;
  onClose: () => void;
  onSuccess: (message: string) => void;
};

export default function RoomCloseDialog({
  open,
  workspaceId,
  room,
  onClose,
  onSuccess,
}: RoomCloseDialogProps) {
  const [state, action, isPending] = useActionState(
    withHandlers(closeRoomAction)({ onSuccess: ({ message }) => onSuccess(message || "") }),
    roomActionIdleState,
  );

  const closeRoom = () => startTransition(() => action({ workspaceId, roomId: room.id }));

  const roomName = room?.name ?? "";

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Закрыть комнату</DialogTitle>
      <DialogContent dividers>
        {state.status === "error" && state.message ? (
          <Alert severity="error">{state.message}</Alert>
        ) : null}
        <Typography gutterBottom>
          После закрытия комнаты участники не смогут продолжить работу, а анонимный доступ будет
          отключён.
        </Typography>
        <Typography color="text.secondary">
          Вы уверены, что хотите закрыть комнату «{roomName}»?
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isPending}>
          Отмена
        </Button>
        <Button onClick={closeRoom} color="error" variant="contained" disabled={isPending || !room}>
          {isPending ? <CircularProgress size={20} /> : "Закрыть"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
