"use server";

import type { Prisma } from "@prisma/client";

import { getCurrentUser } from "@/lib/auth";
import {
  joinRoom,
  leaveRoom,
  listRoomParticipants,
  RoomMemberServiceError,
  type RoomMemberServiceErrorCode,
  serializeParticipantFromJoin,
  serializeRoomParticipantsForClient,
  type SerializedRoomParticipant,
} from "@/lib/services/roomMember";
import { publishRoomPresenceSnapshot } from "@/lib/websocket/roomPresencePublisher";

export type PresenceActionErrorCode = RoomMemberServiceErrorCode | "UNKNOWN" | "UNAUTHORIZED";

export type PresenceActionError = {
  message: string;
  code: PresenceActionErrorCode;
  field?: "displayName";
};

function mapError(error: unknown): PresenceActionError {
  if (error instanceof RoomMemberServiceError) {
    return {
      message: error.message,
      code: error.code,
      field: error.field,
    };
  }

  console.error("Room presence action failed", error);
  return {
    message: "Не удалось выполнить действие. Попробуйте ещё раз.",
    code: "UNKNOWN",
  };
}

export type JoinRoomActionSuccess = {
  participant: SerializedRoomParticipant;
  connectionId: string;
  mode: "MEMBER" | "ANONYMOUS";
  slugToken?: string;
  isNewParticipant: boolean;
};

export type JoinRoomActionResult =
  | { ok: true; data: JoinRoomActionSuccess }
  | { ok: false; error: PresenceActionError };

export async function joinRoomAction(
  roomId: string,
  payload: {
    connectionId: string;
    displayName?: string;
    slugToken?: string | null;
    clientInfo?: Prisma.JsonValue;
  },
): Promise<JoinRoomActionResult> {
  if (!payload.connectionId) {
    return {
      ok: false,
      error: {
        message: "Отсутствует идентификатор соединения.",
        code: "VALIDATION_ERROR",
      },
    };
  }

  const user = await getCurrentUser();

  try {
    if (user) {
      const result = await joinRoom({
        kind: "MEMBER",
        roomId,
        userId: user.id,
        connectionId: payload.connectionId,
        clientInfo: payload.clientInfo,
      });

      schedulePresenceBroadcast(roomId);

      return {
        ok: true,
        data: {
          participant: serializeParticipantFromJoin(result),
          connectionId: result.session.connectionId,
          mode: result.mode,
          slugToken: result.profile?.slugToken,
          isNewParticipant: result.isNewParticipant,
        },
      };
    }

    const displayName = payload.displayName?.trim();

    if (!displayName && !payload.slugToken) {
      return {
        ok: false,
        error: {
          message: "Введите отображаемое имя.",
          code: "VALIDATION_ERROR",
          field: "displayName",
        },
      };
    }

    const result = await joinRoom({
      kind: "ANONYMOUS",
      roomId,
      connectionId: payload.connectionId,
      displayName: displayName ?? undefined,
      slugToken: payload.slugToken,
      clientInfo: payload.clientInfo,
    });

    schedulePresenceBroadcast(roomId);

    return {
      ok: true,
      data: {
        participant: serializeParticipantFromJoin(result),
        connectionId: result.session.connectionId,
        mode: result.mode,
        slugToken: result.profile?.slugToken,
        isNewParticipant: result.isNewParticipant,
      },
    };
  } catch (error) {
    return { ok: false, error: mapError(error) };
  }
}

export type LeaveRoomActionResult = { ok: true } | { ok: false; error: PresenceActionError };

export async function leaveRoomAction(
  roomId: string,
  payload: { connectionId: string },
): Promise<LeaveRoomActionResult> {
  if (!payload.connectionId) {
    return {
      ok: false,
      error: {
        message: "Не найдено активное соединение.",
        code: "VALIDATION_ERROR",
      },
    };
  }

  try {
    await leaveRoom({ roomId, connectionId: payload.connectionId });
    schedulePresenceBroadcast(roomId);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: mapError(error) };
  }
}

export type FetchParticipantsResult =
  | { ok: true; data: SerializedRoomParticipant[] }
  | { ok: false; error: PresenceActionError };

export async function fetchRoomParticipantsAction(
  roomId: string,
): Promise<FetchParticipantsResult> {
  try {
    const participants = await listRoomParticipants(roomId);
    return {
      ok: true,
      data: serializeRoomParticipantsForClient(participants),
    };
  } catch (error) {
    return { ok: false, error: mapError(error) };
  }
}

function schedulePresenceBroadcast(roomId: string) {
  publishRoomPresenceSnapshot(roomId).catch((error) => {
    console.error("Failed to broadcast room presence", error);
  });
}
