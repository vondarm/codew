"use client";

import { Alert, Snackbar } from "@mui/material";

type FeedbackSnackbarProps = {
  message: string;
  severity: "success" | "error";
  onClose: () => void;
};

export function FeedbackSnackbar({ message, severity, onClose }: FeedbackSnackbarProps) {
  return (
    <Snackbar
      open
      autoHideDuration={5000}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
    >
      <Alert severity={severity}>{message}</Alert>
    </Snackbar>
  );
}
