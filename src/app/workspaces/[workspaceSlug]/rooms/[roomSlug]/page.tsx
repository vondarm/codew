import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { MemberRole } from "@prisma/client";

import { getCurrentUser } from "@/lib/auth";
import { getRoom, RoomError } from "@/lib/services/room";
import { ROUTES } from "@/routes";

import RoomSettingsClient from "./room-settings-client";
import type { WorkspaceSummary } from "./room-settings-client";

export const metadata: Metadata = {
  title: "Комната интервью — CodeW",
  description: "Управление комнатой интервью и настройками доступа кандидата.",
};

type RoomPageParams = {
  roomSlug: string;
  workspaceSlug: string;
};

type PageProps = {
  params: Promise<RoomPageParams>;
};

export default async function RoomPage({ params }: PageProps) {
  const { roomSlug, workspaceSlug } = await params;

  const user = await getCurrentUser();

  let details;

  try {
    details = await getRoom(roomSlug, { userId: user?.id });
  } catch (error) {
    if (error instanceof RoomError) {
      if (error.code === "FORBIDDEN") {
        if (!user) {
          redirect(ROUTES.signin({ callbackUrl: ROUTES.room(workspaceSlug, roomSlug) }));
        }

        notFound();
      }

      if (error.code === "NOT_FOUND") {
        notFound();
      }
    }

    throw error;
  }

  if (details.access === "ANONYMOUS") {
    return (
      <AnonymousRoomView roomName={details.room.name} workspaceName={details.workspace.name} />
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
    />
  );
}

type AnonymousRoomViewProps = {
  roomName: string;
  workspaceName: string;
};

function AnonymousRoomView({ roomName, workspaceName }: AnonymousRoomViewProps) {
  return (
    <div className="anonymous-room-view">
      <div
        style={{
          minHeight: "60vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>Комната «{roomName}»</h1>
        <p style={{ maxWidth: "480px", color: "#555", marginBottom: "1.5rem" }}>
          Интервьюеры из рабочей области «{workspaceName}» скоро присоединятся. Пожалуйста,
          оставайтесь на этой странице и ожидайте приглашения в сессию.
        </p>
      </div>
    </div>
  );
}
