"use client";

import { useState, useTransition } from "react";
import {
  Alert,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";

import { deleteWorkspaceAction } from "@/app/workspaces/actions";

import type { DeleteWorkspaceDialogProps } from "./common";

export function DeleteWorkspaceDialog({
  open,
  onClose,
  onSuccess,
  workspace,
}: DeleteWorkspaceDialogProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!workspace) {
    return null;
  }

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await deleteWorkspaceAction(workspace.id);

      if (result.status === "success") {
        onSuccess(result.message ?? "Рабочая область удалена.");
        onClose();
      } else if (result.message) {
        setErrorMessage(result.message);
      }
    });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Удалить рабочую область</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Stack spacing={2} mt={1}>
          {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
          <Typography>
            Вы уверены, что хотите удалить рабочую область «{workspace.name}»? Это действие нельзя
            отменить.
          </Typography>
          <Chip label={workspace.slug} variant="outlined" sx={{ alignSelf: "flex-start" }} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} disabled={isPending}>
          Отмена
        </Button>
        <Button onClick={handleConfirm} color="error" variant="contained" disabled={isPending}>
          {isPending ? <CircularProgress size={20} /> : "Удалить"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
