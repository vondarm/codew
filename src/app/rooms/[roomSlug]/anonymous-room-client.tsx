"use client";

import { Container, Stack, Typography } from "@mui/material";

import type { SerializedRoom } from "@/lib/services/room";
import type { SerializedRoomParticipant } from "@/lib/services/roomMember";

import { RoomPresenceProvider } from "./room-presence-context";
import RoomPresencePanel from "./room-presence-panel";

type AnonymousRoomClientProps = {
  room: Pick<SerializedRoom, "id" | "name" | "allowAnonymousJoin" | "requiresMemberAccount">;
  workspaceName: string;
  initialParticipants: SerializedRoomParticipant[];
};

export default function AnonymousRoomClient({
  room,
  workspaceName,
  initialParticipants,
}: AnonymousRoomClientProps) {
  return (
    <RoomPresenceProvider
      roomId={room.id}
      initialParticipants={initialParticipants}
      viewerMode="ANONYMOUS"
    >
      <Container maxWidth="sm" sx={{ py: { xs: 4, md: 6 } }}>
        <Stack spacing={3}>
          <Stack spacing={1}>
            <Typography component="h1" variant="h4">
              Комната «{room.name}»
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Вы приглашены в комнату рабочей области «{workspaceName}». Подключитесь, чтобы
              появиться в списке участников и дождаться интервьюера.
            </Typography>
          </Stack>
          <RoomPresencePanel
            viewerUserId={null}
            allowAnonymousJoin={room.allowAnonymousJoin}
            requiresMemberAccount={room.requiresMemberAccount}
          />
        </Stack>
      </Container>
    </RoomPresenceProvider>
  );
}
