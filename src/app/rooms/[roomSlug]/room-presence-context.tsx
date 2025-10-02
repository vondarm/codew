"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type { SerializedRoomParticipant } from "@/lib/services/roomMember";
import type {
  RoomPresenceClientMessage,
  RoomPresenceServerMessage,
} from "@/lib/websocket/roomPresenceMessages";

import {
  fetchRoomParticipantsAction,
  joinRoomAction,
  leaveRoomAction,
  type JoinRoomActionResult,
  type PresenceActionError,
} from "./presence-actions";

export type ViewerPresenceMode = "MEMBER" | "ANONYMOUS";

type PresenceStatus = "idle" | "connecting" | "connected" | "error";

type JoinOptions = {
  displayName?: string;
};

type RoomPresenceContextValue = {
  participants: SerializedRoomParticipant[];
  status: PresenceStatus;
  error: PresenceActionError | null;
  currentParticipantId: string | null;
  connectionId: string | null;
  viewerMode: ViewerPresenceMode;
  needsAnonymousProfile: boolean;
  joinRoom: (options?: JoinOptions) => Promise<JoinRoomActionResult>;
  leaveRoom: () => Promise<void>;
  renameAnonymous: (displayName: string) => Promise<JoinRoomActionResult>;
  refresh: () => Promise<void>;
};

const RoomPresenceContext = createContext<RoomPresenceContextValue | null>(null);

function generateConnectionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `conn_${Math.random().toString(36).slice(2)}`;
}

function upsertParticipant(
  list: SerializedRoomParticipant[],
  participant: SerializedRoomParticipant,
): SerializedRoomParticipant[] {
  const index = list.findIndex((item) => item.id === participant.id);

  if (index === -1) {
    return [...list, participant];
  }

  const updated = [...list];
  updated[index] = participant;
  return updated;
}

function markParticipantDisconnected(
  list: SerializedRoomParticipant[],
  participantId: string,
): SerializedRoomParticipant[] {
  return list.map((participant) => {
    if (participant.id !== participantId) {
      return participant;
    }

    const connectedClients = Math.max(participant.connectedClients - 1, 0);
    return {
      ...participant,
      connectedClients,
      isOnline: connectedClients > 0,
      lastSeenAt: new Date().toISOString(),
    };
  });
}

type RoomPresenceProviderProps = {
  roomId: string;
  initialParticipants: SerializedRoomParticipant[];
  viewerMode: ViewerPresenceMode;
  children: ReactNode;
};

export function RoomPresenceProvider({
  roomId,
  initialParticipants,
  viewerMode,
  children,
}: RoomPresenceProviderProps) {
  const [participants, setParticipants] = useState(initialParticipants);
  const [status, setStatus] = useState<PresenceStatus>("idle");
  const [error, setError] = useState<PresenceActionError | null>(null);
  const [currentParticipantId, setCurrentParticipantId] = useState<string | null>(null);
  const [needsAnonymousProfile, setNeedsAnonymousProfile] = useState(viewerMode === "ANONYMOUS");
  const [anonymousToken, setAnonymousToken] = useState<string | null>(null);
  const connectionIdRef = useRef<string | null>(null);
  const anonymousTokenRef = useRef<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const heartbeatRef = useRef<number | null>(null);

  const storageKey = useMemo(() => `room:${roomId}:anonymous-token`, [roomId]);

  const clearHeartbeat = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (heartbeatRef.current !== null) {
      window.clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  const ensureConnectionId = useCallback(() => {
    if (!connectionIdRef.current) {
      connectionIdRef.current = generateConnectionId();
    }

    return connectionIdRef.current;
  }, []);

  useEffect(() => {
    if (viewerMode !== "ANONYMOUS") {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    const stored = window.localStorage.getItem(storageKey);

    if (stored) {
      anonymousTokenRef.current = stored;
      setAnonymousToken(stored);
      setNeedsAnonymousProfile(false);
    }
  }, [storageKey, viewerMode]);

  const persistAnonymousToken = useCallback(
    (token: string | undefined) => {
      if (viewerMode !== "ANONYMOUS") {
        return;
      }

      if (!token) {
        return;
      }

      anonymousTokenRef.current = token;
      setAnonymousToken(token);

      if (typeof window !== "undefined") {
        window.localStorage.setItem(storageKey, token);
      }
    },
    [storageKey, viewerMode],
  );

  const clearAnonymousToken = useCallback(() => {
    if (viewerMode !== "ANONYMOUS") {
      return;
    }

    anonymousTokenRef.current = null;
    setAnonymousToken(null);

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(storageKey);
    }
  }, [storageKey, viewerMode]);

  const handleServerMessage = useCallback(
    (event: MessageEvent<string>) => {
      try {
        const message = JSON.parse(event.data) as RoomPresenceServerMessage;

        switch (message.type) {
          case "presence-sync":
            setParticipants(message.participants);
            setError(null);
            setStatus((prev) => (prev === "connecting" ? "connected" : prev));
            break;
          case "session-ended":
            setStatus("idle");
            setCurrentParticipantId(null);

            if (viewerMode === "ANONYMOUS") {
              if (message.reason === "UNAUTHORIZED") {
                clearAnonymousToken();
              }

              setNeedsAnonymousProfile(true);
            }
            break;
          case "error":
            setError({ message: message.message, code: "UNKNOWN" });
            setStatus("error");
            break;
          default:
            break;
        }
      } catch (err) {
        console.error("Failed to parse room presence message", err);
      }
    },
    [clearAnonymousToken, viewerMode],
  );

  const connectWebSocket = useCallback(
    (connectionId: string) => {
      if (typeof window === "undefined") {
        return;
      }

      const existing = socketRef.current;

      if (
        existing &&
        (existing.readyState === WebSocket.OPEN || existing.readyState === WebSocket.CONNECTING)
      ) {
        return;
      }

      const url = new URL(`/api/rooms/${roomId}/ws`, window.location.origin);
      url.searchParams.set("connectionId", connectionId);

      const socket = new WebSocket(url.toString());
      socketRef.current = socket;

      socket.addEventListener("open", () => {
        setStatus("connected");
        setError(null);
      });

      socket.addEventListener("message", handleServerMessage);

      socket.addEventListener("close", () => {
        clearHeartbeat();
        socketRef.current = null;

        if (viewerMode === "ANONYMOUS" && !anonymousTokenRef.current) {
          setNeedsAnonymousProfile(true);
        }

        setStatus("idle");
      });

      socket.addEventListener("error", () => {
        setStatus("error");
      });

      clearHeartbeat();

      heartbeatRef.current = window.setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          const message: RoomPresenceClientMessage = { type: "heartbeat" };
          socket.send(JSON.stringify(message));
        }
      }, 20000);
    },
    [clearHeartbeat, handleServerMessage, roomId, viewerMode],
  );

  const join = useCallback(
    async (options?: JoinOptions): Promise<JoinRoomActionResult> => {
      setStatus("connecting");
      setError(null);

      const connectionId = ensureConnectionId();
      const result = await joinRoomAction(roomId, {
        connectionId,
        displayName: options?.displayName,
        slugToken: anonymousTokenRef.current,
      });

      if (!result.ok) {
        if (result.error.field === "displayName" && viewerMode === "ANONYMOUS") {
          setNeedsAnonymousProfile(true);
        }

        setStatus(result.error.code === "VALIDATION_ERROR" ? "idle" : "error");
        setError(result.error);
        return result;
      }

      setParticipants((prev) => upsertParticipant(prev, result.data.participant));
      setCurrentParticipantId(result.data.participant.id);
      setStatus("connected");
      persistAnonymousToken(result.data.slugToken);
      setNeedsAnonymousProfile(false);

      connectWebSocket(result.data.connectionId);

      return result;
    },
    [connectWebSocket, ensureConnectionId, persistAnonymousToken, roomId, viewerMode],
  );

  const leave = useCallback(async () => {
    const connectionId = connectionIdRef.current;

    if (!connectionId) {
      return;
    }

    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }

    clearHeartbeat();

    const result = await leaveRoomAction(roomId, { connectionId });

    if (!result.ok) {
      setError(result.error);
      setStatus("error");
      return;
    }

    if (currentParticipantId) {
      setParticipants((prev) => markParticipantDisconnected(prev, currentParticipantId));
    }

    setCurrentParticipantId(null);
    setStatus("idle");
    connectionIdRef.current = null;
  }, [clearHeartbeat, currentParticipantId, roomId]);

  const renameAnonymous = useCallback(
    async (displayName: string) => {
      return join({ displayName });
    },
    [join],
  );

  const refresh = useCallback(async () => {
    const result = await fetchRoomParticipantsAction(roomId);

    if (!result.ok) {
      setError(result.error);
      setStatus("error");
      return;
    }

    setParticipants(result.data);
    setError(null);
  }, [roomId]);

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.removeEventListener("message", handleServerMessage);
        socketRef.current.close();
        socketRef.current = null;
      }

      clearHeartbeat();
    };
  }, [clearHeartbeat, handleServerMessage]);

  useEffect(() => {
    if (viewerMode === "ANONYMOUS") {
      if (status === "idle" && !anonymousTokenRef.current && !currentParticipantId) {
        setNeedsAnonymousProfile(true);
      }
    } else {
      setNeedsAnonymousProfile(false);
    }
  }, [currentParticipantId, status, viewerMode]);

  useEffect(() => {
    if (status !== "idle") {
      return;
    }

    if (viewerMode === "MEMBER") {
      void join();
      return;
    }

    if (viewerMode === "ANONYMOUS" && anonymousTokenRef.current) {
      void join();
    }
  }, [join, status, viewerMode, anonymousToken]);

  const contextValue = useMemo<RoomPresenceContextValue>(
    () => ({
      participants,
      status,
      error,
      currentParticipantId,
      connectionId: connectionIdRef.current,
      viewerMode,
      needsAnonymousProfile,
      joinRoom: join,
      leaveRoom: leave,
      renameAnonymous,
      refresh,
    }),
    [
      participants,
      status,
      error,
      currentParticipantId,
      viewerMode,
      needsAnonymousProfile,
      join,
      leave,
      renameAnonymous,
      refresh,
    ],
  );

  return (
    <RoomPresenceContext.Provider value={contextValue}>{children}</RoomPresenceContext.Provider>
  );
}

export function useRoomPresence(): RoomPresenceContextValue {
  const context = useContext(RoomPresenceContext);

  if (!context) {
    throw new Error("useRoomPresence must be used within a RoomPresenceProvider");
  }

  return context;
}
