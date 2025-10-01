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
import { roomActionIdleState, type RoomActionState } from "./room-action-state";
import { useForm } from "@/shared/forms";

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
  const { action, state, isPending, reset } = useForm<Record<string, never>, RoomActionState>(
    {},
    closeRoomAction,
    roomActionIdleState,
    () => {
      onSuccess("Комната закрыта.");
      onClose();
    },
    {},
  );

  const cancel = () => {
    reset();
    onClose();
  };

  const roomName = room?.name ?? "";

  return (
    <Dialog open={open} onClose={cancel} maxWidth="sm" fullWidth>
      <form action={action}>
        <input type="hidden" name="workspaceId" value={workspaceId} />
        <input type="hidden" name="roomId" value={room?.id ?? ""} />
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
          <Button onClick={cancel} disabled={isPending}>
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
