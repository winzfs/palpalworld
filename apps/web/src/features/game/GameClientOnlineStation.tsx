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
const equippedWeaponStorageKey = "palpalworld.demo.equippedWeaponItemId";

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

function readEquippedWeaponItemId() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(equippedWeaponStorageKey);
}

function toPlayerInputPayload(input: GameSceneInput, sequence: number): PlayerInputPayload {
  return {
    movement: { x: input.x, y: input.y },
    primaryAction: input.primary,
    secondaryAction: input.secondary,
    sequence,
    equippedWeaponItemId: readEquippedWeaponItemId(),
  } as PlayerInputPayload;
}

export function GameClientOnlineStation() {
  const [, setConnectionState] = useState<ConnectionState>("connecting");
  const [, setStatusMessage] = useState("실시간 서버에 연결 중입니다.");
  const [localPlayerId, setLocalPlayerId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<WorldSnapshot | null>(null);
  const [, setInventory] = useState<InventoryState | null>(null);
  const [, setProfile] = useState<PlayerProfileState | null>(null);
  const [, setToastLines] = useState<string[]>([]);

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

  return (
    <main className="game-online-shell">
      <GameScene
        onReady={handleSceneReady}
        onInputChange={handleInputChange}
        onInteract={handleInteract}
        onWorldClick={handleWorldClick}
      />
    </main>
  );
}
