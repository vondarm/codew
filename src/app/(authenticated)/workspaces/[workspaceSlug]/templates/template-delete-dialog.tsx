"use client";

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
import { withHandlers } from "@/shared/forms";
import { startTransition, useActionState } from "react";

type TemplateDeleteDialogProps = {
  open: boolean;
  workspaceId: string;
  template: SerializedTemplate;
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
  const [state, action, isPending] = useActionState(
    withHandlers(deleteTemplateAction)({
      onSuccess: ({ message }) => {
        onSuccess(message || "");
        onClose();
      },
    }),
    templateActionIdleState,
  );

  const deleteTemplate = () =>
    startTransition(() => action({ workspaceId, templateId: template?.id }));

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Удалить шаблон</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {state.status === "error" && state.message ? (
            <Alert severity="error">{state.message}</Alert>
          ) : null}
          <Typography>
            Вы уверены, что хотите удалить шаблон <strong>{template?.name}</strong>? Действие нельзя
            отменить.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isPending}>
          Отмена
        </Button>
        <Button
          onClick={deleteTemplate}
          color="error"
          variant="contained"
          disabled={isPending || !template}
        >
          {isPending ? <CircularProgress size={20} /> : "Удалить"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
