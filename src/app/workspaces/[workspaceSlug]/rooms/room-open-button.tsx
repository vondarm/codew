"use client";

import { type ReactNode } from "react";
import { Button, CircularProgress, type ButtonProps } from "@mui/material";

import { openRoomAction } from "./actions";
import { roomActionIdleState, type RoomActionState } from "./room-action-state";
import { useForm } from "@/shared/forms";

type RoomOpenButtonProps = {
  workspaceId: string;
  roomId: string | null;
  onSuccess?: (result: RoomActionState) => void;
  onError?: (result: RoomActionState | null) => void;
  children: ReactNode;
} & Omit<ButtonProps, "type" | "onClick">;

export default function RoomOpenButton({
  workspaceId,
  roomId,
  onSuccess,
  onError,
  children,
  ...buttonProps
}: RoomOpenButtonProps) {
  const { action, isPending } = useForm<Record<string, never>, RoomActionState>(
    {},
    openRoomAction,
    roomActionIdleState,
    { onSuccess, onError },
    {},
  );

  const disabled = isPending || !roomId;

  return (
    <form action={action} style={{ display: "inline" }}>
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="roomId" value={roomId ?? ""} />
      <Button type="submit" disabled={disabled} {...buttonProps}>
        {isPending ? <CircularProgress size={20} /> : children}
      </Button>
    </form>
  );
}
