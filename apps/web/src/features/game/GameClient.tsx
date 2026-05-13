"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type {
  BuildingType,
  ClientToServerEvents,
  InventoryState,
  PlayerInputPayload,
  ServerToClientEvents,
  Vector2,
  WorldSnapshot,
} from "@palpalworld/shared";
import { GameScene, type GameSceneInput, type GameWorldScene } from "./GameScene";

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const configuredServerUrl = process.env.NEXT_PUBLIC_REALTIME_SERVER_URL;
const demoPlayerId = "demo-player";
const joystickRadius = 56;

function resolveRealtimeServerUrl() {
  if (configuredServerUrl) return configuredServerUrl;
  if (typeof window === "undefined") return "http://localhost:4000";

  const { protocol, hostname } = window.location;

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "http://localhost:4000";
  }

  const githubForwardedHost = hostname.match(/^(?<prefix>.+)-(?<port>\d+)\.(?<domain>app\.github\.dev|githubpreview\.dev)$/);
  if (githubForwardedHost?.groups) {
    return `${protocol}//${githubForwardedHost.groups.prefix}-4000.${githubForwardedHost.groups.domain}`;
  }

  return `${protocol}//${hostname}:4000`;
}

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

function createClientNickname() {
  const savedNickname = window.localStorage.getItem("palpalworld.nickname");
  if (savedNickname) return savedNickname;

  const nextNickname = `Pal-${Math.floor(1000 + Math.random() * 9000)}`;
  window.localStorage.setItem("palpalworld.nickname", nextNickname);
  return nextNickname;
}

function createDemoInventory(): InventoryState {
  return {
    ownerPlayerId: demoPlayerId,
    items: [
      { itemId: "wood", amount: 30 },
      { itemId: "stone", amount: 20 },
      { itemId: "fiber", amount: 10 },
      { itemId: "capture_orb", amount: 5 },
    ],
    itemInstances: [],
  };
}

function createDemoSnapshot(nickname: string, position: Vector2): WorldSnapshot {
  return {
    worldId: "offline-demo",
    serverTime: Date.now(),
    players: [
      {
        id: demoPlayerId,
        nickname: nickname === "..." ? "Demo" : nickname,
        position,
        direction: "down",
        hp: 100,
        maxHp: 100,
      },
    ],
    creatures: [
      { id: "demo-leafbun", speciesId: "leafbun", regionId: "starter_meadow", position: { x: 380, y: 330 }, level: 2, hp: 71, maxHp: 71, traitIds: ["nimble"] },
      { id: "demo-droplet", speciesId: "droplet", regionId: "starter_meadow", position: { x: 720, y: 430 }, level: 3, hp: 86, maxHp: 86, traitIds: ["sturdy"] },
      { id: "demo-sparkit", speciesId: "sparkit", regionId: "starter_meadow", position: { x: 560, y: 540 }, level: 4, hp: 90, maxHp: 90, traitIds: ["brave"] },
    ],
    resources: [
      { id: "demo-tree-1", regionId: "starter_meadow", resourceType: "wood", position: { x: 320, y: 240 }, remainingAmount: 100, maxAmount: 100 },
      { id: "demo-tree-2", regionId: "starter_meadow", resourceType: "wood", position: { x: 230, y: 420 }, remainingAmount: 100, maxAmount: 100 },
      { id: "demo-stone-1", regionId: "starter_meadow", resourceType: "stone", position: { x: 520, y: 360 }, remainingAmount: 100, maxAmount: 100 },
      { id: "demo-fiber-1", regionId: "starter_meadow", resourceType: "fiber", position: { x: 440, y: 250 }, remainingAmount: 60, maxAmount: 60 },
      { id: "demo-berry-1", regionId: "starter_meadow", resourceType: "berry", position: { x: 680, y: 300 }, remainingAmount: 40, maxAmount: 40 },
      { id: "demo-ore-1", regionId: "stone_hills", resourceType: "ore", position: { x: 920, y: 520 }, remainingAmount: 120, maxAmount: 120 },
    ],
    buildings: [
      { id: "demo-workbench", type: "workbench", ownerPlayerId: demoPlayerId, position: { x: 210, y: 250 }, hp: 300, maxHp: 300 },
    ],
  };
}

export function GameClient() {
  const [nickname, setNickname] = useState("...");
  const [snapshot, setSnapshot] = useState<WorldSnapshot | null>(null);
  const [inventory, setInventory] = useState<InventoryState | null>(null);
  const [connectionState, setConnectionState] = useState("preparing");
  const [serverEndpoint, setServerEndpoint] = useState("");
  const [chatLines, setChatLines] = useState<string[]>([]);
  const socketRef = useRef<TypedSocket | null>(null);
  const sceneRef = useRef<GameWorldScene | null>(null);
  const inputRef = useRef<GameSceneInput>({ x: 0, y: 0, primary: false, secondary: false });
  const inputSequenceRef = useRef(0);
  const hasServerSnapshotRef = useRef(false);
  const demoPositionRef = useRef<Vector2>({ x: 250, y: 320 });

  useEffect(() => {
    setNickname(createClientNickname());
    setServerEndpoint(resolveRealtimeServerUrl());
  }, []);

  useEffect(() => {
    if (connectionState !== "error" && connectionState !== "offline") return;
    if (hasServerSnapshotRef.current) return;

    setInventory((current) => current ?? createDemoInventory());
    setChatLines((prev) => [...prev.slice(-5), "[info] 서버 연결 전까지 오프라인 데모 월드로 표시합니다."]);
  }, [connectionState]);

  useEffect(() => {
    let animationFrame = 0;
    let lastTick = performance.now();

    const tickDemoWorld = (now: number) => {
      const shouldRunDemo = !hasServerSnapshotRef.current && (connectionState === "error" || connectionState === "offline" || connectionState === "connecting");
      if (shouldRunDemo) {
        const deltaSeconds = Math.min(0.05, (now - lastTick) / 1000);
        const input = inputRef.current;
        const length = Math.hypot(input.x, input.y) || 1;
        const normalized = length > 1 ? { x: input.x / length, y: input.y / length } : input;
        demoPositionRef.current = {
          x: demoPositionRef.current.x + normalized.x * 180 * deltaSeconds,
          y: demoPositionRef.current.y + normalized.y * 180 * deltaSeconds,
        };

        const nextSnapshot = createDemoSnapshot(nickname, demoPositionRef.current);
        setSnapshot(nextSnapshot);
        sceneRef.current?.applySnapshot(nextSnapshot, demoPlayerId);
      }

      lastTick = now;
      animationFrame = requestAnimationFrame(tickDemoWorld);
    };

    animationFrame = requestAnimationFrame(tickDemoWorld);
    return () => cancelAnimationFrame(animationFrame);
  }, [connectionState, nickname]);

  const handleInteract = useCallback(() => {
    const entityId = sceneRef.current?.getNearestInteractableId();
    if (!entityId) {
      setChatLines((prev) => [...prev.slice(-5), "[info] 가까운 상호작용 대상이 없습니다."]);
      return;
    }
    socketRef.current?.emit("client:interact_entity", { entityId });
    if (!socketRef.current?.connected) {
      setChatLines((prev) => [...prev.slice(-5), `[demo] ${entityId} 채집 테스트`]);
    }
  }, []);

  const handleCraft = useCallback((recipeId: string) => {
    socketRef.current?.emit("client:craft_item", { recipeId });
    if (!socketRef.current?.connected) {
      setChatLines((prev) => [...prev.slice(-5), `[demo] ${recipeId} 제작 버튼 테스트`]);
    }
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

    if (!socketRef.current?.connected) {
      setChatLines((prev) => [...prev.slice(-5), `[demo] ${buildingType} 설치 버튼 테스트`]);
    }
  }, []);

  useEffect(() => {
    if (nickname === "..." || !serverEndpoint) return;

    const socket: TypedSocket = io(serverEndpoint, {
      transports: ["websocket", "polling"],
      autoConnect: true,
    });

    socketRef.current = socket;
    setConnectionState("connecting");
    setChatLines((prev) => [...prev.slice(-5), `[info] realtime: ${serverEndpoint}`]);

    socket.on("connect", () => {
      setConnectionState("online");
      socket.emit("client:join_world", { nickname });
    });

    socket.on("connect_error", (error) => {
      setConnectionState("error");
      setChatLines((prev) => [...prev.slice(-5), `[error] 서버 연결 실패: ${error.message}`]);
    });

    socket.on("disconnect", () => {
      setConnectionState("offline");
    });

    socket.on("server:world_snapshot", (nextSnapshot) => {
      hasServerSnapshotRef.current = true;
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
      hasServerSnapshotRef.current = false;
    };
  }, [nickname, serverEndpoint]);

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
    return "채집 → 제작 → 건설 → 전투를 테스트하세요. 왼쪽 조이스틱으로 이동하고 오른쪽 버튼으로 공격/상호작용합니다.";
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
          <small>서버: {serverEndpoint || "확인 중"}</small>
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
  const pointerIdRef = useRef<number | null>(null);
  const activeInputRef = useRef<GameSceneInput>({ x: 0, y: 0, primary: false, secondary: false });

  const emitInput = useCallback(
    (patch: Partial<GameSceneInput>) => {
      const next = { ...activeInputRef.current, ...patch };
      activeInputRef.current = next;
      onInputChange(next);
    },
    [onInputChange],
  );

  const updateStickFromPointer = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const rawX = event.clientX - centerX;
      const rawY = event.clientY - centerY;
      const distance = Math.hypot(rawX, rawY);
      const clampedDistance = Math.min(distance, joystickRadius);
      const angle = Math.atan2(rawY, rawX);
      const visual = {
        x: Math.cos(angle) * clampedDistance,
        y: Math.sin(angle) * clampedDistance,
      };
      const movement = {
        x: distance === 0 ? 0 : visual.x / joystickRadius,
        y: distance === 0 ? 0 : visual.y / joystickRadius,
      };

      setStick(visual);
      emitInput({ x: movement.x, y: movement.y });
    },
    [emitInput],
  );

  const stopMovement = useCallback(() => {
    pointerIdRef.current = null;
    setStick({ x: 0, y: 0 });
    emitInput({ x: 0, y: 0 });
  }, [emitInput]);

  const setPrimary = useCallback(
    (pressed: boolean) => {
      emitInput({ primary: pressed });
    },
    [emitInput],
  );

  const setSecondary = useCallback(
    (pressed: boolean) => {
      emitInput({ secondary: pressed });
      if (pressed) onInteract();
    },
    [emitInput, onInteract],
  );

  return (
    <>
      <div className="mobile-control-hint">왼쪽 이동 · 오른쪽 행동</div>

      <div
        className="mobile-joystick"
        role="application"
        aria-label="이동 조이스틱"
        onPointerDown={(event) => {
          event.preventDefault();
          pointerIdRef.current = event.pointerId;
          event.currentTarget.setPointerCapture(event.pointerId);
          updateStickFromPointer(event);
        }}
        onPointerMove={(event) => {
          if (pointerIdRef.current !== event.pointerId) return;
          event.preventDefault();
          updateStickFromPointer(event);
        }}
        onPointerUp={(event) => {
          if (pointerIdRef.current !== event.pointerId) return;
          event.preventDefault();
          event.currentTarget.releasePointerCapture(event.pointerId);
          stopMovement();
        }}
        onPointerCancel={(event) => {
          if (pointerIdRef.current !== event.pointerId) return;
          stopMovement();
        }}
      >
        <div className="joystick-base">
          <div className="joystick-cross joystick-cross--horizontal" />
          <div className="joystick-cross joystick-cross--vertical" />
          <div className="joystick-stick" style={{ transform: `translate(calc(-50% + ${stick.x}px), calc(-50% + ${stick.y}px))` }} />
        </div>
      </div>

      <div className="mobile-actions" aria-label="행동 버튼">
        <button
          className="action-button action-button--attack"
          onPointerDown={(event) => {
            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            setPrimary(true);
          }}
          onPointerUp={(event) => {
            event.preventDefault();
            setPrimary(false);
          }}
          onPointerCancel={() => setPrimary(false)}
        >
          공격
        </button>
        <button
          className="action-button action-button--interact"
          onPointerDown={(event) => {
            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            setSecondary(true);
          }}
          onPointerUp={(event) => {
            event.preventDefault();
            setSecondary(false);
          }}
          onPointerCancel={() => setSecondary(false)}
        >
          상호
        </button>
      </div>
    </>
  );
}
