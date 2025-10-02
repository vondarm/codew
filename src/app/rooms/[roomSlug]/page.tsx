import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { MemberRole } from "@prisma/client";

import { getCurrentUser } from "@/lib/auth";
import { getRoom, RoomError } from "@/lib/services/room";
import {
  listRoomParticipants,
  serializeRoomParticipantsForClient,
} from "@/lib/services/roomMember";
import { ROUTES } from "@/routes";

import RoomSettingsClient from "./room-settings-client";
import type { WorkspaceSummary } from "./room-settings-client";
import AnonymousRoomClient from "./anonymous-room-client";

export const metadata: Metadata = {
  title: "Комната интервью — CodeW",
  description: "Управление комнатой интервью и настройками доступа кандидата.",
};

type RoomPageParams = {
  roomSlug: string;
};

type PageProps = {
  params: Promise<RoomPageParams>;
};

export default async function RoomPage({ params }: PageProps) {
  const { roomSlug } = await params;

  const user = await getCurrentUser();

  let details;

  try {
    details = await getRoom(roomSlug, { userId: user?.id });
  } catch (error) {
    if (error instanceof RoomError) {
      if (error.code === "FORBIDDEN") {
        if (!user) {
          redirect(ROUTES.signin({ callbackUrl: ROUTES.room(roomSlug) }));
        }

        notFound();
      }

      if (error.code === "NOT_FOUND") {
        notFound();
      }
    }

    throw error;
  }

  const participantRecords = await listRoomParticipants(details.room.id);
  const initialParticipants = serializeRoomParticipantsForClient(participantRecords);

  if (details.access === "ANONYMOUS") {
    return (
      <AnonymousRoomClient
        room={details.room}
        workspaceName={details.workspace.name}
        initialParticipants={initialParticipants}
      />
    );
  }

  const canManage = details.role === MemberRole.ADMIN || details.role === MemberRole.EDITOR;

  const workspaceSummary: WorkspaceSummary = {
    id: details.workspace.id,
    name: details.workspace.name,
    slug: details.workspace.slug,
  };

  return (
    <RoomSettingsClient
      room={details.room}
      workspace={workspaceSummary}
      canManage={canManage}
      viewerRole={details.role}
      viewerUserId={user?.id ?? null}
      initialParticipants={initialParticipants}
    />
  );
}
