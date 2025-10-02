import type { ChipProps } from "@mui/material";
import { RoomStatus } from "@prisma/client";

import { ROUTES } from "@/routes";

export const ROOM_STATUS_LABELS: Record<RoomStatus, string> = {
  ACTIVE: "Активна",
  CLOSED: "Закрыта",
  ARCHIVED: "В архиве",
};

export const ROOM_STATUS_COLORS: Record<RoomStatus, ChipProps["color"]> = {
  ACTIVE: "success",
  CLOSED: "default",
  ARCHIVED: "warning",
};

export function formatRoomDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  try {
    return new Intl.DateTimeFormat("ru-RU", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export async function copyRoomLink(workspaceSlug: string, roomSlug: string): Promise<void> {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const url = `${origin}${ROUTES.room(workspaceSlug, roomSlug)}`;
  await navigator.clipboard.writeText(url);
}
