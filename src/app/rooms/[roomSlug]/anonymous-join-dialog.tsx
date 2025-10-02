"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  TextField,
} from "@mui/material";

const DISPLAY_NAME_MIN = 2;
const DISPLAY_NAME_MAX = 48;

type AnonymousJoinDialogProps = {
  open: boolean;
  loading?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (displayName: string) => Promise<void> | void;
};

export default function AnonymousJoinDialog({
  open,
  loading = false,
  error,
  onClose,
  onSubmit,
}: AnonymousJoinDialogProps) {
  const [displayName, setDisplayName] = useState("");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setTouched(false);
    } else {
      setDisplayName("");
    }
  }, [open]);

  const trimmedValue = displayName.trim();
  const nameTooShort = trimmedValue.length > 0 && trimmedValue.length < DISPLAY_NAME_MIN;
  const nameTooLong = trimmedValue.length > DISPLAY_NAME_MAX;
  const hasLocalError = touched && (trimmedValue.length === 0 || nameTooShort || nameTooLong);

  const helperText = hasLocalError
    ? trimmedValue.length === 0
      ? "Введите отображаемое имя"
      : nameTooShort
        ? `Минимум ${DISPLAY_NAME_MIN} символа`
        : `Не более ${DISPLAY_NAME_MAX} символов`
    : "";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched(true);

    if (trimmedValue.length < DISPLAY_NAME_MIN || trimmedValue.length > DISPLAY_NAME_MAX) {
      return;
    }

    await onSubmit(trimmedValue);
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth="xs">
      <form onSubmit={handleSubmit}>
        <DialogTitle>Введите имя</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <DialogContentText>
              Укажите, как вы хотите отображаться в списке участников. Имя видно всем собеседникам.
            </DialogContentText>
            <TextField
              autoFocus
              label="Отображаемое имя"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              onBlur={() => setTouched(true)}
              error={hasLocalError}
              helperText={helperText}
              disabled={loading}
              inputProps={{ maxLength: DISPLAY_NAME_MAX + 5 }}
              fullWidth
            />
            {error ? <Alert severity="error">{error}</Alert> : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={loading} color="inherit">
            Отмена
          </Button>
          <Button type="submit" variant="contained" disabled={loading}>
            Продолжить
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
