import type { NextRequest } from "next/server";

import {
  findRoomSessionByConnectionId,
  findRoomSessionWithParticipant,
  markRoomSessionDisconnected,
} from "@/lib/prisma/roomMember";
import {
  heartbeat,
  listRoomParticipants,
  serializeRoomParticipantsForClient,
} from "@/lib/services/roomMember";

import {
  registerRoomConnection,
  unregisterRoomConnection,
  type RoomConnection,
} from "./roomPresenceHub";
import type { RoomPresenceClientMessage } from "./roomPresenceMessages";
import { publishRoomPresenceSnapshot } from "./roomPresencePublisher";

function createWebSocketPair(): [WebSocket, WebSocket] {
  const globalObject = globalThis as typeof globalThis & {
    WebSocketPair?: { new (): { 0: WebSocket; 1: WebSocket } };
  };

  if (!globalObject.WebSocketPair) {
    throw new Error("WebSocketPair is not supported in this runtime");
  }

  const pair = new globalObject.WebSocketPair();
  return [pair[0], pair[1]];
}

function acceptWebSocket(socket: WebSocket) {
  const candidate = socket as WebSocket & { accept?: () => void };

  if (typeof candidate.accept === "function") {
    candidate.accept();
  }
}

async function sendSnapshot(roomId: string, socket: WebSocket) {
  try {
    const participants = await listRoomParticipants(roomId);
    const serialized = serializeRoomParticipantsForClient(participants);
    socket.send(
      JSON.stringify({
        type: "presence-sync",
        participants: serialized,
      }),
    );
  } catch (error) {
    console.error("Failed to send presence snapshot", error);
    socket.send(
      JSON.stringify({
        type: "error",
        message: "Не удалось получить состояние комнаты.",
      }),
    );
  }
}

async function finalizeSession(roomId: string, connectionId: string) {
  try {
    const session = await findRoomSessionByConnectionId(connectionId);

    if (!session || session.disconnectedAt) {
      return;
    }

    await markRoomSessionDisconnected(session.id);
    await publishRoomPresenceSnapshot(roomId);
  } catch (error) {
    console.error("Failed to finalize room session", error);
  }
}

async function handleClientMessage(
  roomId: string,
  connectionId: string,
  socket: WebSocket,
  event: MessageEvent,
) {
  try {
    const data = JSON.parse(event.data as string) as RoomPresenceClientMessage;

    switch (data.type) {
      case "heartbeat":
        await heartbeat(connectionId);
        break;
      case "refresh-request":
        await sendSnapshot(roomId, socket);
        break;
      default:
        break;
    }
  } catch (error) {
    console.error("Failed to process presence message", error);
  }
}

class RoomPresenceGateway {
  async handle(request: NextRequest, roomId: string): Promise<Response> {
    if (request.headers.get("upgrade")?.toLowerCase() !== "websocket") {
      return new Response("Expected WebSocket", { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get("connectionId");

    if (!connectionId) {
      return new Response("Missing connectionId", { status: 400 });
    }

    const session = await findRoomSessionWithParticipant(connectionId);

    if (!session || session.roomId !== roomId || session.disconnectedAt) {
      return new Response("Unauthorized", { status: 401 });
    }

    const [clientSocket, serverSocket] = createWebSocketPair();

    acceptWebSocket(serverSocket);

    const roomConnection: RoomConnection = {
      socket: serverSocket,
      connectionId,
    };

    registerRoomConnection(roomId, roomConnection);

    serverSocket.addEventListener("message", (event) => {
      void handleClientMessage(roomId, connectionId, serverSocket, event);
    });

    serverSocket.addEventListener("close", () => {
      unregisterRoomConnection(roomId, roomConnection);
      void finalizeSession(roomId, connectionId);
    });

    serverSocket.addEventListener("error", () => {
      unregisterRoomConnection(roomId, roomConnection);
      void finalizeSession(roomId, connectionId);
    });

    await heartbeat(connectionId);
    await sendSnapshot(roomId, serverSocket);

    return new Response(null, {
      status: 101,
      webSocket: clientSocket,
    } as ResponseInit & { webSocket: WebSocket });
  }
}

export const roomPresenceGateway = new RoomPresenceGateway();
