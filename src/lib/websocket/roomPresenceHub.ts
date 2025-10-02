import type { RoomPresenceServerMessage } from "./roomPresenceMessages";

export type RoomConnection = {
  socket: WebSocket;
  connectionId: string;
};

const roomConnections = new Map<string, Set<RoomConnection>>();

export function registerRoomConnection(roomId: string, connection: RoomConnection): void {
  const connections = roomConnections.get(roomId) ?? new Set<RoomConnection>();
  connections.add(connection);
  roomConnections.set(roomId, connections);
}

export function unregisterRoomConnection(roomId: string, connection: RoomConnection): void {
  const connections = roomConnections.get(roomId);

  if (!connections) {
    return;
  }

  connections.delete(connection);

  if (connections.size === 0) {
    roomConnections.delete(roomId);
  }
}

export function broadcastRoomMessage(
  roomId: string,
  message: RoomPresenceServerMessage,
  options: { exclude?: WebSocket } = {},
): void {
  const connections = roomConnections.get(roomId);

  if (!connections || connections.size === 0) {
    return;
  }

  const payload = JSON.stringify(message);

  for (const connection of Array.from(connections.values())) {
    if (connection.socket === options.exclude) {
      continue;
    }

    if (connection.socket.readyState !== WebSocket.OPEN) {
      connections.delete(connection);
      continue;
    }

    try {
      connection.socket.send(payload);
    } catch (error) {
      console.error("Failed to send presence message", error);
      connection.socket.close();
      connections.delete(connection);
    }
  }

  if (connections.size === 0) {
    roomConnections.delete(roomId);
  }
}
