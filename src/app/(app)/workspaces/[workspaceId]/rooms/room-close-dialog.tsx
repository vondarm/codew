"use client";

import { useActionState, useEffect } from "react";
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

type RoomCloseDialogProps = {
  open: boolean;
  workspaceId: string;
  room: SerializedRoom | null;
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
  const [state, formAction, isPending] = useActionState(closeRoomAction, roomActionIdleState);

  useEffect(() => {
    if (state.status === "success") {
      onSuccess(state.message ?? "Комната закрыта.");
      onClose();
    }
  }, [onClose, onSuccess, state.message, state.status]);

  const roomName = room?.name ?? "";

  return (
    <Dialog open={open} onClose={isPending ? undefined : onClose} maxWidth="sm" fullWidth>
      <form action={formAction}>
        <input type="hidden" name="workspaceId" value={workspaceId} />
        <input type="hidden" name="roomId" value={room?.id ?? ""} />
        <DialogTitle>Закрыть комнату</DialogTitle>
        <DialogContent dividers>
          <Typography gutterBottom>
            После закрытия комнаты участники не смогут продолжить работу, а анонимный доступ будет
            отключён.
          </Typography>
          <Typography color="text.secondary">
            Вы уверены, что хотите закрыть комнату «{roomName}»?
          </Typography>
          {state.status === "error" && state.message ? (
            <Alert severity="error" sx={{ mt: 2 }}>
              {state.message}
            </Alert>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={isPending}>
            Отмена
          </Button>
          <Button type="submit" color="error" variant="contained" disabled={isPending || !room}>
            {isPending ? <CircularProgress size={20} /> : "Закрыть"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
