"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type {
  BuildingType,
  ClientToServerEvents,
  InventoryState,
  PlayerInputPayload,
  ServerToClientEvents,
  WorldSnapshot,
} from "@palpalworld/shared";
import { GameScene, type GameSceneInput, type GameWorldScene } from "./GameScene";

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const serverUrl = process.env.NEXT_PUBLIC_REALTIME_SERVER_URL ?? "http://localhost:4000";

const itemLabels: Record<string, string> = {
  wood: "나무",
  hardwood: "단단한 나무",
  stone: "돌",
  fiber: "섬유",
  ore: "광석",
  berry: "열매",
  herb: "약초",
  coal: "석탄",
  ice_crystal: "얼음 결정",
  ember_shard: "불씨 조각",
  pal_essence: "펄 정수",
  leaf_pelt: "잎사귀 털가죽",
  flame_tail: "불꽃 꼬리털",
  water_jelly: "물방울 젤리",
  spark_core: "전기 코어",
  capture_orb: "포획구",
  basic_axe: "기본 도끼",
  basic_pickaxe: "기본 곡괭이",
  basic_sickle: "기본 낫",
  workbench_kit: "작업대 키트",
  base_core_kit: "거점 코어 키트",
};

export function GameClient() {
  const [nickname] = useState(() => `Pal-${Math.floor(Math.random() * 9999)}`);
  const [snapshot, setSnapshot] = useState<WorldSnapshot | null>(null);
  const [inventory, setInventory] = useState<InventoryState | null>(null);
  const [connectionState, setConnectionState] = useState("connecting");
  const [chatLines, setChatLines] = useState<string[]>([]);
  const socketRef = useRef<TypedSocket | null>(null);
  const sceneRef = useRef<GameWorldScene | null>(null);
  const inputRef = useRef<GameSceneInput>({ x: 0, y: 0, primary: false, secondary: false });
  const inputSequenceRef = useRef(0);

  const handleInteract = useCallback(() => {
    const entityId = sceneRef.current?.getNearestInteractableId();
    if (!entityId) {
      setChatLines((prev) => [...prev.slice(-5), "[info] 가까운 상호작용 대상이 없습니다."]);
      return;
    }
    socketRef.current?.emit("client:interact_entity", { entityId });
  }, []);

  const handleCraft = useCallback((recipeId: string) => {
    socketRef.current?.emit("client:craft_item", { recipeId });
  }, []);

  const handlePlaceBuilding = useCallback((buildingType: BuildingType) => {
    const position = sceneRef.current?.getLocalPlayerPosition();
    if (!position) {
      setChatLines((prev) => [...prev.slice(-5), "[warning] 플레이어 위치를 아직 알 수 없습니다."]);
      return;
    }

    socketRef.current?.emit("client:place_building", {
      buildingType,
      position: { x: position.x + 64, y: position.y },
    });
  }, []);

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

    socket.on("server:inventory_updated", (nextInventory) => {
      setInventory(nextInventory);
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
  const buildingCount = snapshot?.buildings.length ?? 0;
  const objectiveText = useMemo(() => {
    return "채집 → 제작 → 건설 흐름을 테스트하세요. E/상호로 자원을 채집할 수 있습니다.";
  }, []);

  return (
    <main className="game-shell">
      <GameScene onReady={handleSceneReady} onInputChange={handleInputChange} onInteract={handleInteract} />

      <section className="game-hud" aria-label="Game HUD">
        <div className="hud-panel top-left-panel">
          <strong>PalPalWorld</strong>
          <div>상태: {connectionState}</div>
          <div>닉네임: {nickname}</div>
          <div>접속자: {playerCount}</div>
          <div>건물: {buildingCount}</div>
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

        <div className="hud-panel inventory-panel">
          <strong>인벤토리</strong>
          <div className="inventory-grid">
            {(inventory?.items ?? []).map((item) => (
              <div className="inventory-slot" key={item.itemId}>
                <span>{itemLabels[item.itemId] ?? item.itemId}</span>
                <b>{item.amount}</b>
              </div>
            ))}
          </div>
        </div>

        <div className="hud-panel build-panel">
          <strong>제작 / 건설</strong>
          <div className="control-grid">
            <button onClick={() => handleCraft("workbench_kit")}>작업대 키트 제작</button>
            <button onClick={() => handleCraft("base_core_kit")}>거점 코어 키트 제작</button>
            <button onClick={() => handleCraft("capture_orb")}>포획구 제작</button>
            <button onClick={() => handlePlaceBuilding("workbench")}>작업대 설치</button>
            <button onClick={() => handlePlaceBuilding("base_core")}>거점 코어 설치</button>
            <button onClick={() => handlePlaceBuilding("storage_box")}>보관함 설치</button>
          </div>
        </div>

        <MobileControls onInputChange={handleInputChange} onInteract={handleInteract} />
      </section>
    </main>
  );
}

function MobileControls({
  onInputChange,
  onInteract,
}: {
  onInputChange: (input: GameSceneInput) => void;
  onInteract: () => void;
}) {
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
        <button
          className="action-button"
          onTouchStart={() => {
            updateInput(stick, false, true);
            onInteract();
          }}
          onTouchEnd={() => updateInput(stick)}
        >
          상호
        </button>
      </div>
    </>
  );
}
