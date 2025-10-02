import {
  listRoomParticipants,
  serializeRoomParticipantsForClient,
} from "@/lib/services/roomMember";

import { broadcastRoomMessage } from "./roomPresenceHub";

export async function publishRoomPresenceSnapshot(roomId: string): Promise<void> {
  const participants = await listRoomParticipants(roomId);
  const serialized = serializeRoomParticipantsForClient(participants);

  broadcastRoomMessage(roomId, {
    type: "presence-sync",
    participants: serialized,
  });
}
