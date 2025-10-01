"use client";

import { type ReactNode, startTransition, useActionState } from "react";
import { Button, CircularProgress, type ButtonProps } from "@mui/material";

import { openRoomAction } from "./actions";
import { roomActionIdleState, type RoomActionState } from "./room-action-state";
import { withHandlers } from "@/shared/forms";

type RoomOpenButtonProps = {
  workspaceId: string;
  roomId: string;
  onSuccess?: (result: RoomActionState) => void;
  onError?: (result: RoomActionState) => void;
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
  const [, action, isPending] = useActionState(
    withHandlers(openRoomAction)({ onError, onSuccess }),
    roomActionIdleState,
  );

  const openRoom = () => startTransition(() => action({ workspaceId, roomId }));

  const disabled = isPending || !roomId;

  return (
    <Button type="submit" onClick={openRoom} disabled={disabled} {...buttonProps}>
      {isPending ? <CircularProgress size={20} /> : children}
    </Button>
  );
}
