"use client";

import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
} from "@mui/material";

import type { SerializedRoom } from "@/lib/services/room";
import { roomActionIdleState, RoomActionState } from "./room-action-state";
import { useForm } from "@/shared/forms";

type RoomFormDialogProps = {
  open: boolean;
  workspaceId: string;
  room?: SerializedRoom | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
  formAction: (_prevState: RoomActionState, formData: FormData) => Promise<RoomActionState>;
  formTitle: string;
  submitLabel: string;
};

const INITIAL_ROOM: Partial<SerializedRoom> = {
  name: "Новая комната",
  code: "",
  allowAnonymousView: false,
  allowAnonymousJoin: false,
  allowAnonymousEdit: false,
};

export default function RoomFormDialog({
  open,
  workspaceId,
  room,
  onClose,
  onSuccess,
  formTitle,
  submitLabel,
  formAction,
}: RoomFormDialogProps) {
  const { formValue, state, isPending, action, set, reset } = useForm(
    room,
    formAction,
    roomActionIdleState,
    {
      onSuccess: (state) => {
        onSuccess(state.message || "");
        onClose();
      },
    },
    INITIAL_ROOM,
  );

  const cancel = () => {
    onClose();
    reset();
  };

  return (
    <Dialog open={open} onClose={cancel} fullWidth maxWidth="md">
      <form action={action}>
        <input type="hidden" name="workspaceId" value={workspaceId} />
        {room ? <input type="hidden" name="roomId" value={room.id} /> : null}
        <input
          type="hidden"
          name="allowAnonymousView"
          value={formValue.allowAnonymousView ? "true" : "false"}
        />
        <input
          type="hidden"
          name="allowAnonymousEdit"
          value={formValue.allowAnonymousEdit ? "true" : "false"}
        />
        <input
          type="hidden"
          name="allowAnonymousJoin"
          value={formValue.allowAnonymousJoin ? "true" : "false"}
        />
        <DialogTitle>{formTitle}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Название"
              name="name"
              value={formValue.name}
              onChange={(event) => set("name")(event.target.value)}
              disabled={isPending}
              fullWidth
              required
              error={Boolean(state.fieldErrors?.name)}
              helperText={state.fieldErrors?.name ?? "Например, 'Frontend интервью'."}
            />
            <TextField
              label="Описание или стартовый код"
              name="code"
              value={formValue.code}
              onChange={(event) => set("code")(event.target.value)}
              disabled={isPending}
              fullWidth
              multiline
              minRows={6}
              error={Boolean(state.fieldErrors?.code)}
              helperText={
                state.fieldErrors?.code ??
                "Добавьте инструкцию для интервью или стартовый фрагмент кода (необязательно)."
              }
            />
            <Stack spacing={1}>
              <FormControlLabel
                control={
                  <Switch
                    color="primary"
                    checked={formValue.allowAnonymousView}
                    onChange={(event) => set("allowAnonymousView")(event.target.checked)}
                    disabled={isPending}
                  />
                }
                label="Разрешить анонимный просмотр"
              />
              <FormControlLabel
                control={
                  <Switch
                    color="primary"
                    checked={formValue.allowAnonymousEdit}
                    onChange={(event) => set("allowAnonymousEdit")(event.target.checked)}
                    disabled={isPending || !formValue.allowAnonymousView}
                  />
                }
                label="Разрешить анонимное редактирование"
              />
              <FormControlLabel
                control={
                  <Switch
                    color="primary"
                    checked={formValue.allowAnonymousJoin}
                    onChange={(event) => set("allowAnonymousJoin")(event.target.checked)}
                    disabled={isPending}
                  />
                }
                label="Разрешить анонимное подключение к комнате"
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button type="button" onClick={cancel} disabled={isPending}>
            Отмена
          </Button>
          <Button type="submit" variant="contained" disabled={isPending}>
            {isPending ? <CircularProgress size={20} /> : submitLabel}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
