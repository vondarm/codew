export type RoomActionField = "name" | "code" | "slug";

import type { SerializedRoom } from "@/lib/services/room";

export type RoomActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Partial<Record<RoomActionField, string>>;
  newSlug?: string;
  room?: SerializedRoom;
};

export const roomActionIdleState: RoomActionState = { status: "idle" };
