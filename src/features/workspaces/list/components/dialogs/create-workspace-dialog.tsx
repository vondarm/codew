"use client";

import { useActionState, useState, type ChangeEvent } from "react";
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from "@mui/material";

import { createWorkspaceAction } from "@/app/workspaces/actions";

import { autoSlugFromName, idleState, type WorkspaceFormDialogProps } from "./common";

export function CreateWorkspaceDialog({ open, onClose, onSuccess }: WorkspaceFormDialogProps) {
  const [state, formAction, isPending] = useActionState(async (prevState, formData) => {
    const result = await createWorkspaceAction(prevState, formData);

    if (result.status === "success") {
      onSuccess(result.message ?? "Рабочая область создана.");
      onClose();
    }

    return result;
  }, idleState);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugLocked, setSlugLocked] = useState(false);

  const handleNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextName = event.target.value;
    setName(nextName);

    if (!slugLocked) {
      const nextSlug = autoSlugFromName(nextName);
      setSlug((current) => (current === nextSlug ? current : nextSlug));
    }
  };

  const handleSlugChange = (event: ChangeEvent<HTMLInputElement>) => {
    const rawValue = event.target.value;

    if (!rawValue.trim()) {
      setSlugLocked(false);
      setSlug("");
      return;
    }

    setSlugLocked(true);
    const nextSlug = autoSlugFromName(rawValue);
    setSlug((current) => (current === nextSlug ? current : nextSlug));
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <form action={formAction}>
        <DialogTitle>Создать рабочую область</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Stack spacing={2} mt={1}>
            {state.status === "error" && state.message ? (
              <Alert severity="error">{state.message}</Alert>
            ) : null}
            <TextField
              autoFocus
              label="Название"
              name="name"
              value={name}
              onChange={handleNameChange}
              required
              fullWidth
              error={Boolean(state.fieldErrors?.name)}
              helperText={state.fieldErrors?.name ?? "Укажите понятное название рабочей области."}
            />
            <TextField
              label="Slug"
              name="slug"
              value={slug}
              onChange={handleSlugChange}
              fullWidth
              error={Boolean(state.fieldErrors?.slug)}
              helperText={
                state.fieldErrors?.slug ??
                "Используется в URL. Можно оставить пустым, чтобы slug сгенерировался автоматически."
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={onClose} disabled={isPending}>
            Отмена
          </Button>
          <Button type="submit" variant="contained" disabled={isPending}>
            {isPending ? <CircularProgress size={20} /> : "Создать"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
