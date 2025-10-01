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
import { useForm } from "@/shared/forms";

type RoomSlugDialogProps = {
  open: boolean;
  workspaceId: string;
  room: SerializedRoom | null;
  onClose: () => void;
  onSuccess: (newSlug: string) => void;
};

type RoomSlugFormValue = {
  workspaceId: string;
  roomId: string;
  previousSlug: string;
};

const INITIAL_ROOM_SLUG_FORM: RoomSlugFormValue = {
  workspaceId: "",
  roomId: "",
  previousSlug: "",
};

export default function RoomSlugDialog({
  open,
  workspaceId,
  room,
  onClose,
  onSuccess,
}: RoomSlugDialogProps) {
  const currentValue: Partial<RoomSlugFormValue> | null = room
    ? { workspaceId, roomId: room.id, previousSlug: room.slug }
    : null;

  const { action, state, isPending, reset, formValue } = useForm(
    currentValue,
    regenerateRoomSlugAction,
    roomActionIdleState,
    (data) => {
      onClose();
      if (data.newSlug) onSuccess(data.newSlug);
    },
    INITIAL_ROOM_SLUG_FORM,
  );

  const cancel = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onClose={cancel} maxWidth="sm" fullWidth>
      <form action={action}>
        <input type="hidden" name="workspaceId" value={formValue.workspaceId} />
        <input type="hidden" name="roomId" value={formValue.roomId} />
        <input type="hidden" name="previousSlug" value={formValue.previousSlug} />
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
          <Button onClick={cancel} disabled={isPending}>
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
