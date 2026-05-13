"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, PlayerInputPayload, ServerToClientEvents, WorldSnapshot } from "@palpalworld/shared";
import { GameScene, type GameSceneInput, type GameWorldScene } from "./GameScene";

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const serverUrl = process.env.NEXT_PUBLIC_REALTIME_SERVER_URL ?? "http://localhost:4000";

export function GameClient() {
  const [nickname] = useState(() => `Pal-${Math.floor(Math.random() * 9999)}`);
  const [snapshot, setSnapshot] = useState<WorldSnapshot | null>(null);
  const [connectionState, setConnectionState] = useState("connecting");
  const [chatLines, setChatLines] = useState<string[]>([]);
  const socketRef = useRef<TypedSocket | null>(null);
  const sceneRef = useRef<GameWorldScene | null>(null);
  const inputRef = useRef<GameSceneInput>({ x: 0, y: 0, primary: false, secondary: false });
  const inputSequenceRef = useRef(0);

  useEffect(() => {
    const socket: TypedSocket = io(serverUrl, {
      transports: ["websocket"],
      autoConnect: true,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setConnectionState("online");
      socket.emit("client:join_world", { nickname });
    });

    socket.on("disconnect", () => {
      setConnectionState("offline");
    });

    socket.on("server:world_snapshot", (nextSnapshot) => {
      setSnapshot(nextSnapshot);
      sceneRef.current?.applySnapshot(nextSnapshot, socket.id ?? null);
    });

    socket.on("server:chat_message", (line) => {
      setChatLines((prev) => [...prev.slice(-5), `${line.nickname}: ${line.message}`]);
    });

    socket.on("server:toast", (toast) => {
      setChatLines((prev) => [...prev.slice(-5), `[${toast.type}] ${toast.message}`]);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [nickname]);

  useEffect(() => {
    let animationFrame = 0;
    let lastSent = 0;

    const sendInput = (now: number) => {
      if (now - lastSent >= 50) {
        const input = inputRef.current;
        const payload: PlayerInputPayload = {
          movement: { x: input.x, y: input.y },
          primaryAction: input.primary,
          secondaryAction: input.secondary,
          sequence: inputSequenceRef.current++,
        };
        socketRef.current?.emit("client:player_input", payload);
        lastSent = now;
      }
      animationFrame = requestAnimationFrame(sendInput);
    };

    animationFrame = requestAnimationFrame(sendInput);
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  const handleSceneReady = useCallback((scene: GameWorldScene) => {
    sceneRef.current = scene;
  }, []);

  const handleInputChange = useCallback((input: GameSceneInput) => {
    inputRef.current = input;
  }, []);

  const playerCount = snapshot?.players.length ?? 0;
  const objectiveText = useMemo(() => {
    return "나무와 돌을 모으고 첫 번째 몬스터 포획을 준비하세요.";
  }, []);

  return (
    <main className="game-shell">
      <GameScene onReady={handleSceneReady} onInputChange={handleInputChange} />

      <section className="game-hud" aria-label="Game HUD">
        <div className="hud-panel top-left-panel">
          <strong>PalPalWorld</strong>
          <div>상태: {connectionState}</div>
          <div>닉네임: {nickname}</div>
          <div>접속자: {playerCount}</div>
        </div>

        <div className="hud-panel top-right-panel">
          <strong>목표</strong>
          <p>{objectiveText}</p>
        </div>

        <div className="hud-panel bottom-left-panel">
          <strong>채팅</strong>
          {chatLines.map((line, index) => (
            <div key={`${line}-${index}`}>{line}</div>
          ))}
        </div>

        <MobileControls onInputChange={handleInputChange} />
      </section>
    </main>
  );
}

function MobileControls({ onInputChange }: { onInputChange: (input: GameSceneInput) => void }) {
  const [stick, setStick] = useState({ x: 0, y: 0 });
  const touchIdRef = useRef<number | null>(null);

  const updateInput = useCallback(
    (nextStick: { x: number; y: number }, primary = false, secondary = false) => {
      setStick(nextStick);
      onInputChange({ x: nextStick.x, y: nextStick.y, primary, secondary });
    },
    [onInputChange],
  );

  return (
    <>
      <div
        className="mobile-joystick"
        onTouchStart={(event) => {
          const touch = event.changedTouches[0];
          if (!touch) return;
          touchIdRef.current = touch.identifier;
        }}
        onTouchMove={(event) => {
          const touch = [...event.changedTouches].find((item) => item.identifier === touchIdRef.current);
          if (!touch) return;
          const rect = event.currentTarget.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          const rawX = (touch.clientX - centerX) / 48;
          const rawY = (touch.clientY - centerY) / 48;
          const length = Math.hypot(rawX, rawY);
          const next = length > 1 ? { x: rawX / length, y: rawY / length } : { x: rawX, y: rawY };
          updateInput(next);
        }}
        onTouchEnd={() => {
          touchIdRef.current = null;
          updateInput({ x: 0, y: 0 });
        }}
      >
        <div className="joystick-base">
          <div
            className="joystick-stick"
            style={{ transform: `translate(calc(-50% + ${stick.x * 34}px), calc(-50% + ${stick.y * 34}px))` }}
          />
        </div>
      </div>

      <div className="mobile-actions">
        <button className="action-button" onTouchStart={() => updateInput(stick, true, false)} onTouchEnd={() => updateInput(stick)}>
          공격
        </button>
        <button className="action-button" onTouchStart={() => updateInput(stick, false, true)} onTouchEnd={() => updateInput(stick)}>
          상호
        </button>
      </div>
    </>
  );
}
