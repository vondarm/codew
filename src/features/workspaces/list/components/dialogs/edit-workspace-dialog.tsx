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

import { updateWorkspaceAction } from "@/app/workspaces/actions";

import { autoSlugFromName, idleState, type EditWorkspaceDialogProps } from "./common";

export function EditWorkspaceDialog({
  open,
  onClose,
  onSuccess,
  workspace,
}: EditWorkspaceDialogProps) {
  const [state, formAction, isPending] = useActionState(async (prevState, formData) => {
    const result = await updateWorkspaceAction(prevState, formData);

    if (result.status === "success") {
      onSuccess(result.message ?? "Изменения сохранены.");
      onClose();
    }

    return result;
  }, idleState);
  const [name, setName] = useState(() => workspace?.name ?? "");
  const [slug, setSlug] = useState(() => workspace?.slug ?? "");
  const [slugLocked, setSlugLocked] = useState(true);

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

  if (!workspace) {
    return null;
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <form action={formAction}>
        <input type="hidden" name="workspaceId" value={workspace.id} />
        <DialogTitle>Редактировать рабочую область</DialogTitle>
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
              helperText={
                state.fieldErrors?.name ?? "Название отображается в списках и на страницах."
              }
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
                "Slug формирует URL рабочей области. Оставьте пустым, чтобы пересчитать автоматически."
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={onClose} disabled={isPending}>
            Отмена
          </Button>
          <Button type="submit" variant="contained" disabled={isPending}>
            {isPending ? <CircularProgress size={20} /> : "Сохранить"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
