"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import {
  Alert,
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

import { createRoomAction, updateRoomAction } from "./actions";
import { roomActionIdleState } from "./room-action-state";

export type RoomFormDialogMode = "create" | "edit";

type RoomFormDialogProps = {
  open: boolean;
  mode: RoomFormDialogMode;
  workspaceId: string;
  room?: SerializedRoom | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
};

export default function RoomFormDialog({
  open,
  mode,
  workspaceId,
  room,
  onClose,
  onSuccess,
}: RoomFormDialogProps) {
  const action = useMemo(() => (mode === "create" ? createRoomAction : updateRoomAction), [mode]);

  const [state, formAction, isPending] = useActionState(action, roomActionIdleState);

  const [name, setName] = useState(room?.name ?? "");
  const [code, setCode] = useState(room?.code ?? "");
  const [allowView, setAllowView] = useState(room?.allowAnonymousView ?? false);
  const [allowEdit, setAllowEdit] = useState(room?.allowAnonymousEdit ?? false);
  const [allowJoin, setAllowJoin] = useState(room?.allowAnonymousJoin ?? false);

  useEffect(() => {
    if (open) {
      setName(room?.name ?? "");
      setCode(room?.code ?? "");
      setAllowView(room?.allowAnonymousView ?? false);
      setAllowEdit(room?.allowAnonymousEdit ?? false);
      setAllowJoin(room?.allowAnonymousJoin ?? false);
    }
  }, [open, room]);

  useEffect(() => {
    if (state.status === "success") {
      const message =
        state.message ?? (mode === "create" ? "Комната создана." : "Настройки сохранены.");
      onSuccess(message);
      onClose();
    }
  }, [mode, onClose, onSuccess, state.message, state.status]);

  const title = mode === "create" ? "Новая комната" : "Настройки комнаты";
  const submitLabel = mode === "create" ? "Создать" : "Сохранить";

  return (
    <Dialog open={open} onClose={isPending ? undefined : onClose} fullWidth maxWidth="md">
      <form action={formAction}>
        <input type="hidden" name="workspaceId" value={workspaceId} />
        {mode === "edit" && room ? <input type="hidden" name="roomId" value={room.id} /> : null}
        <input type="hidden" name="allowAnonymousView" value={allowView ? "true" : "false"} />
        <input type="hidden" name="allowAnonymousEdit" value={allowEdit ? "true" : "false"} />
        <input type="hidden" name="allowAnonymousJoin" value={allowJoin ? "true" : "false"} />
        <DialogTitle>{title}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {state.status === "error" && state.message ? (
              <Alert severity="error">{state.message}</Alert>
            ) : null}
            <TextField
              label="Название"
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={isPending}
              fullWidth
              required
              error={Boolean(state.fieldErrors?.name)}
              helperText={state.fieldErrors?.name ?? "Например, 'Frontend интервью'."}
            />
            <TextField
              label="Описание или стартовый код"
              name="code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
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
                    checked={allowView}
                    onChange={(event) => setAllowView(event.target.checked)}
                    disabled={isPending}
                  />
                }
                label="Разрешить анонимный просмотр"
              />
              <FormControlLabel
                control={
                  <Switch
                    color="primary"
                    checked={allowEdit}
                    onChange={(event) => setAllowEdit(event.target.checked)}
                    disabled={isPending || !allowView}
                  />
                }
                label="Разрешить анонимное редактирование"
              />
              <FormControlLabel
                control={
                  <Switch
                    color="primary"
                    checked={allowJoin}
                    onChange={(event) => setAllowJoin(event.target.checked)}
                    disabled={isPending}
                  />
                }
                label="Разрешить анонимное подключение к комнате"
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={isPending}>
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
