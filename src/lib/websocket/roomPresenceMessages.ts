import type { SerializedRoomParticipant } from "@/lib/services/roomMember";

export type RoomPresenceServerMessage =
  | {
      type: "presence-sync";
      participants: SerializedRoomParticipant[];
    }
  | {
      type: "session-ended";
      reason: "DISCONNECTED" | "UNAUTHORIZED" | "CLOSED";
    }
  | {
      type: "error";
      message: string;
    };

export type RoomPresenceClientMessage = { type: "heartbeat" } | { type: "refresh-request" };
