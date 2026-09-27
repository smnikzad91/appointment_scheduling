"use client";

import { createContext, useCallback, useContext, useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import { useSession } from "next-auth/react";

export type MqttActivityEvent = {
  id: string;
  clientName: string;
  event: "connect" | "disconnect";
  createdAt: string;
};

type Listener = (e: MqttActivityEvent) => void;

type MqttLiveContextType = {
  subscribe: (fn: Listener) => () => void;
};

const MqttLiveContext = createContext<MqttLiveContextType | undefined>(undefined);

// Subscribes `onEvent` to live connect/disconnect events for as long as the
// calling component is mounted. Safe to use from multiple components at
// once — they all share the single socket connection opened by MqttLiveProvider.
export function useMqttLive(onEvent: Listener) {
  const ctx = useContext(MqttLiveContext);
  useEffect(() => {
    if (!ctx) return;
    return ctx.subscribe(onEvent);
  }, [ctx, onEvent]);
}

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4021";

export function MqttLiveProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const listenersRef = useRef<Set<Listener>>(new Set());
  const socketRef = useRef<Socket | null>(null);

  const subscribe = useCallback((fn: Listener) => {
    listenersRef.current.add(fn);
    return () => { listenersRef.current.delete(fn); };
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;

    fetch("/api/user/mqtt/socket-token")
      .then((r) => r.json())
      .then(({ token }) => {
        if (cancelled || !token) return;
        const socket = io(SOCKET_URL, { auth: { token }, transports: ["websocket"] });
        socket.on("mqtt:activity", (payload: MqttActivityEvent) => {
          listenersRef.current.forEach((fn) => fn(payload));
        });
        socketRef.current = socket;
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [status]);

  return (
    <MqttLiveContext.Provider value={{ subscribe }}>
      {children}
    </MqttLiveContext.Provider>
  );
}
