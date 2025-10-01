"use client";

import { Alert, Box, Stack } from "@mui/material";
import type { AlertColor } from "@mui/material";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
  type ReactNode,
} from "react";

type Notification = {
  id: string;
  message: ReactNode;
  severity: AlertColor;
};

type NotificationInput = {
  message: ReactNode;
  severity?: AlertColor;
  duration?: number;
};

type NotificationContextValue = {
  notify: (input: NotificationInput) => string;
};

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

const DEFAULT_DURATION = 6000;

function generateId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return Math.random().toString(36).slice(2);
}

export function NotificationProvider({ children }: PropsWithChildren) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const timeouts = useRef<Map<string, number>>(new Map());

  const removeNotification = useCallback((id: string) => {
    setNotifications((current) => current.filter((notification) => notification.id !== id));

    const timeoutId = timeouts.current.get(id);

    if (timeoutId) {
      window.clearTimeout(timeoutId);
      timeouts.current.delete(id);
    }
  }, []);

  const notify = useCallback(
    (input: NotificationInput) => {
      const id = generateId();
      const severity = input.severity ?? "info";
      const duration = input.duration ?? DEFAULT_DURATION;

      setNotifications((current) => [...current, { id, message: input.message, severity }]);

      if (Number.isFinite(duration) && duration > 0) {
        const timeoutId = window.setTimeout(() => {
          removeNotification(id);
        }, duration);

        timeouts.current.set(id, timeoutId);
      }

      return id;
    },
    [removeNotification],
  );

  const contextValue = useMemo<NotificationContextValue>(() => ({ notify }), [notify]);

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      <Box
        sx={{
          position: "fixed",
          bottom: 24,
          right: 24,
          display: "flex",
          flexDirection: "column",
          gap: 2,
          zIndex: (theme) => theme.zIndex.snackbar,
          pointerEvents: "none",
        }}
      >
        <Stack spacing={2} alignItems="flex-end">
          {notifications.map((notification) => (
            <Alert
              key={notification.id}
              severity={notification.severity}
              onClose={() => removeNotification(notification.id)}
              sx={{ pointerEvents: "auto", minWidth: { xs: "100%", sm: 300 } }}
            >
              {notification.message}
            </Alert>
          ))}
        </Stack>
      </Box>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error("useNotification must be used within a NotificationProvider");
  }

  return context.notify;
}

export type { NotificationInput };
