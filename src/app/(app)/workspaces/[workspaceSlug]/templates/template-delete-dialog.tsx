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
  Stack,
  Typography,
} from "@mui/material";

import type { SerializedTemplate } from "@/lib/services/template";

import { deleteTemplateAction } from "./actions";
import { templateActionIdleState } from "./template-action-state";

type TemplateDeleteDialogProps = {
  open: boolean;
  workspaceId: string;
  template: SerializedTemplate | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
};

export default function TemplateDeleteDialog({
  open,
  workspaceId,
  template,
  onClose,
  onSuccess,
}: TemplateDeleteDialogProps) {
  const [state, formAction, isPending] = useActionState(
    deleteTemplateAction,
    templateActionIdleState,
  );

  useEffect(() => {
    if (state.status === "success") {
      onSuccess(state.message ?? "Шаблон удалён.");
      onClose();
    }
  }, [onClose, onSuccess, state.message, state.status]);

  return (
    <Dialog open={open} onClose={isPending ? undefined : onClose} fullWidth maxWidth="sm">
      <form action={formAction}>
        <input type="hidden" name="workspaceId" value={workspaceId} />
        <input type="hidden" name="templateId" value={template?.id ?? ""} />
        <DialogTitle>Удалить шаблон</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {state.status === "error" && state.message ? (
              <Alert severity="error">{state.message}</Alert>
            ) : null}
            <Typography>
              Вы уверены, что хотите удалить шаблон <strong>{template?.name}</strong>? Действие
              нельзя отменить.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={isPending}>
            Отмена
          </Button>
          <Button type="submit" color="error" variant="contained" disabled={isPending || !template}>
            {isPending ? <CircularProgress size={20} /> : "Удалить"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
