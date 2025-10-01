"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth";
import {
  RoomError,
  closeRoom,
  createRoom,
  openRoom,
  regenerateRoomSlug,
  updateRoom,
} from "@/lib/services/room";
import { getWorkspace } from "@/lib/services/workspace";
import type { RoomActionState } from "./room-action-state";
import { ROUTES } from "@/routes";

function buildErrorState(error: unknown, fallbackMessage: string): RoomActionState {
  if (error instanceof RoomError) {
    const fieldErrors = error.field ? { [error.field]: error.message } : undefined;
    const message = error.field ? undefined : error.message;

    return {
      status: "error",
      message: message ?? fallbackMessage,
      fieldErrors,
    };
  }

  console.error(error);

  return {
    status: "error",
    message: fallbackMessage,
  };
}

function parseBoolean(value: FormDataEntryValue | null): boolean {
  if (typeof value !== "string") {
    return false;
  }

  return value === "true" || value === "on" || value === "1";
}

export async function createRoomAction(
  _prevState: RoomActionState,
  formData: FormData,
): Promise<RoomActionState> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      status: "error",
      message: "Требуется аутентификация.",
    };
  }

  const workspaceIdValue = formData.get("workspaceId");
  const nameValue = formData.get("name");
  const allowViewValue = formData.get("allowAnonymousView");
  const allowEditValue = formData.get("allowAnonymousEdit");
  const allowJoinValue = formData.get("allowAnonymousJoin");
  const codeValue = formData.get("code");

  const workspaceId = typeof workspaceIdValue === "string" ? workspaceIdValue : "";
  const name = typeof nameValue === "string" ? nameValue : "";
  const code = typeof codeValue === "string" ? codeValue : "";
  const allowAnonymousView = parseBoolean(allowViewValue);
  const allowAnonymousEdit = parseBoolean(allowEditValue);
  const allowAnonymousJoin = parseBoolean(allowJoinValue);

  if (!workspaceId) {
    return {
      status: "error",
      message: "Рабочая область не указана.",
    };
  }

  try {
    const workspaceSlug = (await getWorkspace(workspaceId)).slug;
    const room = await createRoom(user.id, workspaceId, {
      name,
      code,
      allowAnonymousView,
      allowAnonymousEdit,
      allowAnonymousJoin,
    });

    revalidatePath(ROUTES.workspaceRooms(workspaceSlug));
    revalidatePath(ROUTES.room(room.slug));

    return {
      status: "success",
      message: "Комната создана.",
    };
  } catch (error) {
    return buildErrorState(error, "Не удалось создать комнату. Попробуйте ещё раз.");
  }
}

export async function updateRoomAction(
  _prevState: RoomActionState,
  formData: FormData,
): Promise<RoomActionState> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      status: "error",
      message: "Требуется аутентификация.",
    };
  }

  const workspaceIdValue = formData.get("workspaceId");
  const roomIdValue = formData.get("roomId");
  const nameValue = formData.get("name");
  const allowViewValue = formData.get("allowAnonymousView");
  const allowEditValue = formData.get("allowAnonymousEdit");
  const allowJoinValue = formData.get("allowAnonymousJoin");
  const codeValue = formData.get("code");

  const workspaceId = typeof workspaceIdValue === "string" ? workspaceIdValue : "";
  const roomId = typeof roomIdValue === "string" ? roomIdValue : "";
  const name = typeof nameValue === "string" ? nameValue : "";
  const code = typeof codeValue === "string" ? codeValue : "";
  const allowAnonymousView = parseBoolean(allowViewValue);
  const allowAnonymousEdit = parseBoolean(allowEditValue);
  const allowAnonymousJoin = parseBoolean(allowJoinValue);

  if (!workspaceId || !roomId) {
    return {
      status: "error",
      message: "Недостаточно данных для обновления комнаты.",
    };
  }

  try {
    const workspaceSlug = (await getWorkspace(workspaceId)).slug;
    const room = await updateRoom(user.id, roomId, {
      name,
      code,
      allowAnonymousView,
      allowAnonymousEdit,
      allowAnonymousJoin,
    });

    revalidatePath(ROUTES.workspaceRooms(workspaceSlug));
    revalidatePath(ROUTES.room(room.slug));

    return {
      status: "success",
      message: "Настройки комнаты обновлены.",
    };
  } catch (error) {
    return buildErrorState(error, "Не удалось обновить комнату.");
  }
}

export async function closeRoomAction(
  _prevState: RoomActionState,
  { roomId, workspaceId }: { workspaceId: string; roomId: string },
): Promise<RoomActionState> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      status: "error",
      message: "Требуется аутентификация.",
    };
  }

  try {
    const workspaceSlug = (await getWorkspace(workspaceId)).slug;
    const room = await closeRoom(user.id, roomId);

    revalidatePath(ROUTES.workspaceRooms(workspaceSlug));
    revalidatePath(ROUTES.room(room.slug));

    return {
      status: "success",
      message: "Комната закрыта.",
    };
  } catch (error) {
    return buildErrorState(error, "Не удалось закрыть комнату.");
  }
}

export async function openRoomAction(
  _prevState: RoomActionState,
  { roomId, workspaceId }: { workspaceId: string; roomId: string },
): Promise<RoomActionState> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      status: "error",
      message: "Требуется аутентификация.",
    };
  }

  try {
    const workspaceSlug = (await getWorkspace(workspaceId)).slug;
    const room = await openRoom(user.id, roomId);

    revalidatePath(ROUTES.workspaceRooms(workspaceSlug));
    revalidatePath(ROUTES.room(room.slug));

    return {
      status: "success",
      message: "Комната открыта.",
    };
  } catch (error) {
    return buildErrorState(error, "Не удалось открыть комнату.");
  }
}

export async function regenerateRoomSlugAction(
  _prevState: RoomActionState,
  {
    roomId,
    workspaceId,
    previousSlug,
  }: { workspaceId: string; roomId: string; previousSlug: string },
): Promise<RoomActionState> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      status: "error",
      message: "Требуется аутентификация.",
    };
  }

  try {
    const workspaceSlug = (await getWorkspace(workspaceId)).slug;
    const room = await regenerateRoomSlug(user.id, roomId);

    revalidatePath(ROUTES.workspaceRooms(workspaceSlug));
    revalidatePath(ROUTES.room(room.slug));

    if (previousSlug && previousSlug !== room.slug) {
      revalidatePath(ROUTES.room(previousSlug));
    }

    return {
      status: "success",
      newSlug: room.slug,
      message: "Ссылка на комнату обновлена.",
    };
  } catch (error) {
    return buildErrorState(error, "Не удалось обновить ссылку на комнату.");
  }
}
