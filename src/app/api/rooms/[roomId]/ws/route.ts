import type { NextRequest } from "next/server";

import { roomPresenceGateway } from "@/lib/websocket/roomPresenceGateway";

export const runtime = "edge";

export async function GET(
  request: NextRequest,
  { params }: { params: { roomId: string } },
): Promise<Response> {
  try {
    return await roomPresenceGateway.handle(request, params.roomId);
  } catch (error) {
    console.error("Failed to establish room presence WebSocket", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
