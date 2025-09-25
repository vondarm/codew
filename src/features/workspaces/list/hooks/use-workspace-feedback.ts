"use client";

import { useCallback, useMemo, useState } from "react";

type FeedbackState = {
  message: string;
  severity: "success" | "error";
} | null;

export function useWorkspaceFeedback() {
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const showSuccess = useCallback((message: string) => {
    setFeedback({ message, severity: "success" });
  }, []);

  const showError = useCallback((message: string) => {
    setFeedback({ message, severity: "error" });
  }, []);

  const reset = useCallback(() => {
    setFeedback(null);
  }, []);

  return useMemo(
    () => ({
      feedback,
      showSuccess,
      showError,
      reset,
    }),
    [feedback, reset, showError, showSuccess],
  );
}
