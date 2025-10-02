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
  const connectionIdRef = useRef<string | null>(null);
  const anonymousTokenRef = useRef<string | null>(null);
  const [, setAnonymousTokenState] = useState<string | null>(null);

  const storageKey = useMemo(() => `room:${roomId}:anonymous-token`, [roomId]);

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
      setAnonymousTokenState(stored);
    }
  }, [storageKey, viewerMode]);

  const ensureConnectionId = useCallback(() => {
    if (!connectionIdRef.current) {
      connectionIdRef.current = generateConnectionId();
    }

    return connectionIdRef.current;
  }, []);

  const persistAnonymousToken = useCallback(
    (token: string | undefined) => {
      if (viewerMode !== "ANONYMOUS") {
        return;
      }

      if (!token) {
        return;
      }

      anonymousTokenRef.current = token;
      setAnonymousTokenState(token);

      if (typeof window !== "undefined") {
        window.localStorage.setItem(storageKey, token);
      }
    },
    [storageKey, viewerMode],
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
        setStatus("error");
        setError(result.error);
        return result;
      }

      setParticipants((prev) => upsertParticipant(prev, result.data.participant));
      setCurrentParticipantId(result.data.participant.id);
      setStatus("connected");
      persistAnonymousToken(result.data.slugToken);

      return result;
    },
    [ensureConnectionId, persistAnonymousToken, roomId],
  );

  const leave = useCallback(async () => {
    if (!connectionIdRef.current) {
      return;
    }

    const result = await leaveRoomAction(roomId, {
      connectionId: connectionIdRef.current,
    });

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
  }, [currentParticipantId, roomId]);

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

    if (currentParticipantId) {
      const current = result.data.find((participant) => participant.id === currentParticipantId);
      setStatus(current?.isOnline ? "connected" : "idle");
    }
  }, [currentParticipantId, roomId]);

  const contextValue = useMemo<RoomPresenceContextValue>(
    () => ({
      participants,
      status,
      error,
      currentParticipantId,
      connectionId: connectionIdRef.current,
      viewerMode,
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
