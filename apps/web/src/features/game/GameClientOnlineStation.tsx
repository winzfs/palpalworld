"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  InventoryState,
  PlayerInputPayload,
  PlayerProfileState,
  ServerToClientEvents,
  WorldSnapshot,
} from "@palpalworld/shared";
import { GameScene, type GameSceneInput, type GameWorldScene, type WorldClickTarget } from "./GameScene";

type ConnectionState = "connecting" | "online" | "offline";

const inputSendIntervalMs = 50;

function getRealtimeServerUrl() {
  return process.env.NEXT_PUBLIC_REALTIME_SERVER_URL ?? "http://localhost:4000";
}

function createClientNickname() {
  if (typeof window === "undefined") return "Player";
  const key = "palpalworld.nickname";
  const savedNickname = window.localStorage.getItem(key);
  if (savedNickname) return savedNickname;
  const nextNickname = `Pal-${Math.floor(1000 + Math.random() * 9000)}`;
  window.localStorage.setItem(key, nextNickname);
  return nextNickname;
}

function toPlayerInputPayload(input: GameSceneInput, sequence: number): PlayerInputPayload {
  return {
    movement: { x: input.x, y: input.y },
    primaryAction: input.primary,
    secondaryAction: input.secondary,
    sequence,
  };
}

export function GameClientOnlineStation() {
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const [statusMessage, setStatusMessage] = useState("실시간 서버에 연결 중입니다.");
  const [localPlayerId, setLocalPlayerId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<WorldSnapshot | null>(null);
  const [inventory, setInventory] = useState<InventoryState | null>(null);
  const [profile, setProfile] = useState<PlayerProfileState | null>(null);
  const [toastLines, setToastLines] = useState<string[]>([]);

  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const sceneRef = useRef<GameWorldScene | null>(null);
  const latestInputRef = useRef<GameSceneInput>({ x: 0, y: 0, primary: false, secondary: false });
  const sequenceRef = useRef(0);

  useEffect(() => {
    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(getRealtimeServerUrl(), {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 700,
      timeout: 5000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setConnectionState("online");
      setLocalPlayerId(socket.id ?? null);
      setStatusMessage("온라인 서버에 접속했습니다.");
      socket.emit("client:join_world", { nickname: createClientNickname() });
    });

    socket.on("disconnect", () => {
      setConnectionState("offline");
      setStatusMessage("서버 연결이 끊겼습니다. 재연결을 시도합니다.");
      setLocalPlayerId(null);
    });

    socket.on("connect_error", () => {
      setConnectionState("offline");
      setStatusMessage("실시간 서버에 연결할 수 없습니다. 서버 실행 상태를 확인하세요.");
    });

    socket.on("server:world_snapshot", (nextSnapshot) => {
      setSnapshot(nextSnapshot);
      sceneRef.current?.applySnapshot(nextSnapshot, socket.id ?? null);
    });

    socket.on("server:inventory_updated", setInventory);
    socket.on("server:player_profile_updated", setProfile);
    socket.on("server:toast", (toast) => {
      setToastLines((current) => [...current.slice(-4), toast.message]);
    });
    socket.on("server:chat_message", (message) => {
      setToastLines((current) => [...current.slice(-4), `${message.nickname}: ${message.message}`]);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const socket = socketRef.current;
      if (!socket?.connected) return;
      sequenceRef.current += 1;
      socket.emit("client:player_input", toPlayerInputPayload(latestInputRef.current, sequenceRef.current));
    }, inputSendIntervalMs);

    return () => window.clearInterval(interval);
  }, []);

  const handleSceneReady = useCallback((scene: GameWorldScene) => {
    sceneRef.current = scene;
    if (snapshot) scene.applySnapshot(snapshot, localPlayerId);
  }, [localPlayerId, snapshot]);

  const handleInputChange = useCallback((input: GameSceneInput) => {
    latestInputRef.current = input;
  }, []);

  const handleInteract = useCallback(() => {
    const socket = socketRef.current;
    const entityId = sceneRef.current?.getNearestInteractableId();
    if (!socket?.connected || !entityId) return;
    socket.emit("client:interact_entity", { entityId });
  }, []);

  const handleWorldClick = useCallback((target: WorldClickTarget) => {
    if (target.kind === "creature") {
      latestInputRef.current = { ...latestInputRef.current, primary: true };
      window.setTimeout(() => {
        latestInputRef.current = { ...latestInputRef.current, primary: false };
      }, inputSendIntervalMs * 2);
    }
  }, []);

  const playerCount = snapshot?.players.length ?? 0;
  const itemCount = inventory?.items.reduce((sum, item) => sum + item.amount, 0) ?? 0;

  return (
    <main className="game-online-shell">
      <GameScene
        onReady={handleSceneReady}
        onInputChange={handleInputChange}
        onInteract={handleInteract}
        onWorldClick={handleWorldClick}
      />
      <section
        aria-label="온라인 서버 상태"
        style={{
          position: "fixed",
          left: 12,
          top: 12,
          zIndex: 20,
          width: 280,
          borderRadius: 16,
          border: "1px solid rgba(148, 163, 184, 0.35)",
          background: "rgba(15, 23, 42, 0.82)",
          color: "white",
          padding: 12,
          fontSize: 13,
          boxShadow: "0 16px 40px rgba(0, 0, 0, 0.28)",
          backdropFilter: "blur(12px)",
        }}
      >
        <strong>{connectionState === "online" ? "온라인 모드" : connectionState === "connecting" ? "연결 중" : "오프라인"}</strong>
        <p style={{ margin: "6px 0 0", color: "rgba(226, 232, 240, 0.86)", lineHeight: 1.45 }}>{statusMessage}</p>
        <dl style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "4px 10px", margin: "10px 0 0" }}>
          <dt>접속 인원</dt><dd>{playerCount}</dd>
          <dt>레벨</dt><dd>{profile?.progress.level ?? 1}</dd>
          <dt>인벤토리 수량</dt><dd>{itemCount}</dd>
        </dl>
        {toastLines.length > 0 && (
          <div style={{ marginTop: 10, display: "grid", gap: 4 }}>
            {toastLines.slice(-3).map((line, index) => (
              <span key={`${line}-${index}`} style={{ color: "rgba(226, 232, 240, 0.92)" }}>{line}</span>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
