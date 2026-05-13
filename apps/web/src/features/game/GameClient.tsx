"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { io, type Socket } from "socket.io-client";
import type {
  BuildingState,
  BuildingType,
  ClientToServerEvents,
  CreaturePublicState,
  InventoryState,
  PlayerDirection,
  PlayerInputPayload,
  ResourceNodeState,
  ServerToClientEvents,
  Vector2,
  WorldSnapshot,
} from "@palpalworld/shared";
import { BuildingInteractionPanel } from "../buildings/BuildingInteractionPanel";
import { CharacterPanel } from "../character/CharacterPanel";
import { CraftingPanel } from "../crafting/CraftingPanel";
import {
  getBuildingItemId,
  getProgressionBuilding,
  getProgressionBuildingByItemId,
  getProgressionRecipe,
} from "../crafting/progressionCatalog";
import { EquipmentPanel } from "../equipment/EquipmentPanel";
import { InventoryPanel } from "../inventory/InventoryPanel";
import { getItemLabel } from "../items/itemLabels";
import { LogPanel } from "../logs/LogPanel";
import { GameScene, type GameSceneInput, type GameWorldScene, type WorldClickTarget } from "./GameScene";

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
type PanelId = "status" | "objective" | "inventory" | "equipment" | "build" | "buildingInteraction" | "chat";

const configuredServerUrl = process.env.NEXT_PUBLIC_REALTIME_SERVER_URL;
const demoPlayerId = "demo-player";
const joystickRadius = 56;

const panelDefaults: Record<PanelId, { x: number; y: number; width: number; collapsed?: boolean }> = {
  status: { x: 8, y: 8, width: 320 },
  objective: { x: 8, y: 60, width: 270, collapsed: true },
  inventory: { x: 8, y: 108, width: 340, collapsed: true },
  equipment: { x: 8, y: 156, width: 300, collapsed: true },
  build: { x: 8, y: 204, width: 420, collapsed: true },
  buildingInteraction: { x: 440, y: 108, width: 340 },
  chat: { x: 8, y: 252, width: 320, collapsed: true },
};

function resolveRealtimeServerUrl() {
  if (configuredServerUrl) return configuredServerUrl;
  if (typeof window === "undefined") return "http://localhost:4000";
  const { protocol, hostname } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") return "http://localhost:4000";
  const githubForwardedHost = hostname.match(/^(?<prefix>.+)-(?<port>\d+)\.(?<domain>app\.github\.dev|githubpreview\.dev)$/);
  if (githubForwardedHost?.groups) return `${protocol}//${githubForwardedHost.groups.prefix}-4000.${githubForwardedHost.groups.domain}`;
  return `${protocol}//${hostname}:4000`;
}

function createClientNickname() {
  const savedNickname = window.localStorage.getItem("palpalworld.nickname");
  if (savedNickname) return savedNickname;
  const nextNickname = `Pal-${Math.floor(1000 + Math.random() * 9000)}`;
  window.localStorage.setItem("palpalworld.nickname", nextNickname);
  return nextNickname;
}

function directionFromMovement(input: Vector2, fallback: PlayerDirection): PlayerDirection {
  if (Math.abs(input.x) < 0.08 && Math.abs(input.y) < 0.08) return fallback;
  if (Math.abs(input.x) >= Math.abs(input.y)) return input.x >= 0 ? "right" : "left";
  return input.y >= 0 ? "down" : "up";
}

function createDemoInventory(): InventoryState {
  return {
    ownerPlayerId: demoPlayerId,
    items: [
      { itemId: "wood", amount: 90 },
      { itemId: "stone", amount: 70 },
      { itemId: "fiber", amount: 35 },
      { itemId: "berry", amount: 12 },
      { itemId: "herb", amount: 8 },
      { itemId: "ore", amount: 12 },
      { itemId: "coal", amount: 8 },
      { itemId: "pal_essence", amount: 4 },
      { itemId: "leaf_pelt", amount: 5 },
      { itemId: "water_jelly", amount: 2 },
      { itemId: "capture_orb", amount: 5 },
    ],
    itemInstances: [
      { instanceId: "demo-training-sword", itemId: "training_sword", ownerPlayerId: demoPlayerId, level: 1, durability: 100, traitIds: ["sharp"], locked: false },
      { instanceId: "demo-explorer-jacket", itemId: "explorer_jacket", ownerPlayerId: demoPlayerId, level: 1, durability: 100, traitIds: [], locked: false },
      { instanceId: "demo-leather-boots", itemId: "leather_boots", ownerPlayerId: demoPlayerId, level: 1, durability: 100, traitIds: [], locked: false },
    ],
  };
}

function createDemoResources(): ResourceNodeState[] {
  return [
    { id: "demo-tree-1", regionId: "starter_meadow", resourceType: "wood", position: { x: 320, y: 240 }, remainingAmount: 100, maxAmount: 100 },
    { id: "demo-tree-2", regionId: "starter_meadow", resourceType: "wood", position: { x: 230, y: 420 }, remainingAmount: 100, maxAmount: 100 },
    { id: "demo-stone-1", regionId: "starter_meadow", resourceType: "stone", position: { x: 520, y: 360 }, remainingAmount: 100, maxAmount: 100 },
    { id: "demo-fiber-1", regionId: "starter_meadow", resourceType: "fiber", position: { x: 440, y: 250 }, remainingAmount: 60, maxAmount: 60 },
    { id: "demo-berry-1", regionId: "starter_meadow", resourceType: "berry", position: { x: 680, y: 300 }, remainingAmount: 40, maxAmount: 40 },
    { id: "demo-ore-1", regionId: "stone_hills", resourceType: "ore", position: { x: 920, y: 520 }, remainingAmount: 120, maxAmount: 120 },
    { id: "demo-coal-1", regionId: "stone_hills", resourceType: "coal", position: { x: 1050, y: 460 }, remainingAmount: 100, maxAmount: 100 },
  ];
}

function createDemoCreatures(): CreaturePublicState[] {
  return [
    { id: "demo-leafbun", speciesId: "leafbun", regionId: "starter_meadow", position: { x: 380, y: 330 }, level: 2, hp: 71, maxHp: 71, traitIds: ["nimble"] },
    { id: "demo-droplet", speciesId: "droplet", regionId: "starter_meadow", position: { x: 720, y: 430 }, level: 3, hp: 86, maxHp: 86, traitIds: ["sturdy"] },
    { id: "demo-sparkit", speciesId: "sparkit", regionId: "starter_meadow", position: { x: 560, y: 540 }, level: 4, hp: 90, maxHp: 90, traitIds: ["brave"] },
  ];
}

function createDemoBuildings(): BuildingState[] {
  return [{ id: "demo-workbench", type: "workbench", ownerPlayerId: demoPlayerId, position: { x: 210, y: 250 }, hp: 300, maxHp: 300 }];
}

function addInventoryItem(inventory: InventoryState, itemId: string, amount: number): InventoryState {
  const items = inventory.items.map((item) => ({ ...item }));
  const existing = items.find((item) => item.itemId === itemId);
  if (existing) existing.amount += amount;
  else items.push({ itemId, amount });
  return { ...inventory, items: items.filter((item) => item.amount > 0) };
}

function consumeInventoryItems(inventory: InventoryState, requirements: { itemId: string; amount: number }[]): InventoryState | null {
  for (const requirement of requirements) {
    const owned = inventory.items.find((item) => item.itemId === requirement.itemId)?.amount ?? 0;
    if (owned < requirement.amount) return null;
  }
  const items = inventory.items.map((item) => ({ ...item }));
  for (const requirement of requirements) {
    const existing = items.find((item) => item.itemId === requirement.itemId);
    if (existing) existing.amount -= requirement.amount;
  }
  return { ...inventory, items: items.filter((item) => item.amount > 0) };
}

function createDemoSnapshot(nickname: string, position: Vector2, direction: PlayerDirection, resources: ResourceNodeState[], creatures: CreaturePublicState[], buildings: BuildingState[]): WorldSnapshot {
  return {
    worldId: "offline-demo",
    serverTime: Date.now(),
    players: [{ id: demoPlayerId, nickname: nickname === "..." ? "Demo" : nickname, position, direction, hp: 100, maxHp: 100 }],
    creatures: creatures.filter((creature) => creature.hp > 0),
    resources: resources.filter((resource) => resource.remainingAmount > 0),
    buildings,
  };
}

function findNearestResource(resources: ResourceNodeState[], position: Vector2, maxRange = 180) {
  let nearest: ResourceNodeState | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const resource of resources) {
    if (resource.remainingAmount <= 0) continue;
    const distance = Math.hypot(resource.position.x - position.x, resource.position.y - position.y);
    if (distance < nearestDistance) {
      nearest = resource;
      nearestDistance = distance;
    }
  }
  return nearest && nearestDistance <= maxRange ? nearest : null;
}

function findNearestCreature(creatures: CreaturePublicState[], position: Vector2, maxRange = 180) {
  let nearest: CreaturePublicState | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const creature of creatures) {
    if (creature.hp <= 0) continue;
    const distance = Math.hypot(creature.position.x - position.x, creature.position.y - position.y);
    if (distance < nearestDistance) {
      nearest = creature;
      nearestDistance = distance;
    }
  }
  return nearest && nearestDistance <= maxRange ? nearest : null;
}

export function GameClient() {
  const [nickname, setNickname] = useState("...");
  const [snapshot, setSnapshot] = useState<WorldSnapshot | null>(null);
  const [inventory, setInventory] = useState<InventoryState | null>(null);
  const [connectionState, setConnectionState] = useState("preparing");
  const [serverEndpoint, setServerEndpoint] = useState("");
  const [chatLines, setChatLines] = useState<string[]>([]);
  const [selectedBuildingItemId, setSelectedBuildingItemId] = useState<string | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingState | null>(null);
  const socketRef = useRef<TypedSocket | null>(null);
  const sceneRef = useRef<GameWorldScene | null>(null);
  const inputRef = useRef<GameSceneInput>({ x: 0, y: 0, primary: false, secondary: false });
  const inputSequenceRef = useRef(0);
  const hasServerSnapshotRef = useRef(false);
  const demoPositionRef = useRef<Vector2>({ x: 250, y: 320 });
  const demoDirectionRef = useRef<PlayerDirection>("down");
  const demoResourcesRef = useRef<ResourceNodeState[]>(createDemoResources());
  const demoCreaturesRef = useRef<CreaturePublicState[]>(createDemoCreatures());
  const demoBuildingsRef = useRef<BuildingState[]>(createDemoBuildings());
  const lastDemoAttackAtRef = useRef(0);

  const selectedPlacementBuilding = useMemo(
    () => (selectedBuildingItemId ? getProgressionBuildingByItemId(selectedBuildingItemId) : null),
    [selectedBuildingItemId],
  );
  const placementBuildingType = selectedPlacementBuilding?.type as BuildingType | undefined;

  const applyDemoSnapshot = useCallback(() => {
    const nextSnapshot = createDemoSnapshot(nickname, demoPositionRef.current, demoDirectionRef.current, demoResourcesRef.current, demoCreaturesRef.current, demoBuildingsRef.current);
    setSnapshot(nextSnapshot);
    sceneRef.current?.applySnapshot(nextSnapshot, demoPlayerId);
  }, [nickname]);

  useEffect(() => {
    setNickname(createClientNickname());
    setServerEndpoint(resolveRealtimeServerUrl());
    setInventory(createDemoInventory());
  }, []);

  useEffect(() => {
    if (!selectedBuilding) return;
    const latest = snapshot?.buildings.find((building) => building.id === selectedBuilding.id) ?? null;
    if (latest) setSelectedBuilding(latest);
  }, [selectedBuilding, snapshot]);

  useEffect(() => {
    if (connectionState !== "error" && connectionState !== "offline") return;
    if (hasServerSnapshotRef.current) return;
    setChatLines((prev) => [...prev.slice(-5), "[info] 서버 연결 전까지 오프라인 데모 월드로 표시합니다."]);
  }, [connectionState]);

  useEffect(() => {
    let animationFrame = 0;
    let lastTick = performance.now();
    const tickDemoWorld = (now: number) => {
      const shouldRunDemo = !hasServerSnapshotRef.current && connectionState !== "online";
      if (shouldRunDemo) {
        const deltaSeconds = Math.min(0.05, (now - lastTick) / 1000);
        const input = inputRef.current;
        const length = Math.hypot(input.x, input.y) || 1;
        const normalized = length > 1 ? { x: input.x / length, y: input.y / length } : input;
        demoDirectionRef.current = directionFromMovement(normalized, demoDirectionRef.current);
        demoPositionRef.current = { x: demoPositionRef.current.x + normalized.x * 180 * deltaSeconds, y: demoPositionRef.current.y + normalized.y * 180 * deltaSeconds };
        applyDemoSnapshot();
      }
      lastTick = now;
      animationFrame = requestAnimationFrame(tickDemoWorld);
    };
    animationFrame = requestAnimationFrame(tickDemoWorld);
    return () => cancelAnimationFrame(animationFrame);
  }, [applyDemoSnapshot, connectionState]);

  const handleDemoInteract = useCallback(() => {
    const resource = findNearestResource(demoResourcesRef.current, demoPositionRef.current);
    if (!resource) {
      setChatLines((prev) => [...prev.slice(-5), "[demo] 가까운 자원이 없습니다. 자원 가까이 이동해보세요."]);
      return;
    }
    const gainAmount = resource.resourceType === "berry" ? 4 : resource.resourceType === "fiber" ? 5 : resource.resourceType === "ore" || resource.resourceType === "coal" ? 4 : 8;
    resource.remainingAmount = Math.max(0, resource.remainingAmount - 25);
    setInventory((current) => addInventoryItem(current ?? createDemoInventory(), resource.resourceType, gainAmount));
    setChatLines((prev) => [...prev.slice(-5), `[demo] ${getItemLabel(resource.resourceType)} ${gainAmount}개 획득`]);
    applyDemoSnapshot();
  }, [applyDemoSnapshot]);

  const handleInteract = useCallback(() => {
    if (!socketRef.current?.connected) {
      handleDemoInteract();
      return;
    }
    const entityId = sceneRef.current?.getNearestInteractableId();
    if (!entityId) {
      setChatLines((prev) => [...prev.slice(-5), "[info] 가까운 상호작용 대상이 없습니다."]);
      return;
    }
    socketRef.current.emit("client:interact_entity", { entityId });
  }, [handleDemoInteract]);

  const handleDemoAttack = useCallback(() => {
    if (socketRef.current?.connected) return;
    const now = performance.now();
    if (now - lastDemoAttackAtRef.current < 380) return;
    lastDemoAttackAtRef.current = now;
    const target = findNearestCreature(demoCreaturesRef.current, demoPositionRef.current);
    if (!target) {
      setChatLines((prev) => [...prev.slice(-5), "[demo] 공격 범위 안에 몬스터가 없습니다."]);
      return;
    }
    target.hp = Math.max(0, target.hp - 18);
    if (target.hp <= 0) {
      setInventory((current) => addInventoryItem(current ?? createDemoInventory(), "pal_essence", 1));
      setChatLines((prev) => [...prev.slice(-5), `[demo] ${target.speciesId} 처치! 펄 정수 획득`]);
    } else setChatLines((prev) => [...prev.slice(-5), `[demo] ${target.speciesId}에게 18 피해`]);
    applyDemoSnapshot();
  }, [applyDemoSnapshot]);

  const handleCraft = useCallback((recipeId: string) => {
    socketRef.current?.emit("client:craft_item", { recipeId });
    if (socketRef.current?.connected) return;
    const recipe = getProgressionRecipe(recipeId);
    if (!recipe) {
      setChatLines((prev) => [...prev.slice(-5), `[demo] 알 수 없는 제작법: ${recipeId}`]);
      return;
    }
    setInventory((current) => {
      const base = current ?? createDemoInventory();
      const consumed = consumeInventoryItems(base, recipe.inputs);
      if (!consumed) {
        setChatLines((prev) => [...prev.slice(-5), `[demo] ${recipe.name} 재료 부족: ${recipe.inputs.map((i) => `${getItemLabel(i.itemId)} ${i.amount}`).join(" · ")}`]);
        return base;
      }
      const crafted = recipe.outputs.reduce((next, output) => addInventoryItem(next, output.itemId, output.amount), consumed);
      setChatLines((prev) => [...prev.slice(-5), `[demo] ${recipe.name} 제작 완료`]);
      return crafted;
    });
  }, []);

  const handleCraftBuildingItem = useCallback((buildingType: string) => {
    const building = getProgressionBuilding(buildingType);
    if (!building) {
      setChatLines((prev) => [...prev.slice(-5), `[demo] 알 수 없는 건설물: ${buildingType}`]);
      return;
    }

    const itemId = getBuildingItemId(building.type);
    if (socketRef.current?.connected) {
      socketRef.current.emit("client:craft_item", { recipeId: itemId });
      return;
    }

    setInventory((current) => {
      const base = current ?? createDemoInventory();
      const consumed = consumeInventoryItems(base, building.requires);
      if (!consumed) {
        setChatLines((prev) => [...prev.slice(-5), `[demo] ${building.name} 설치 아이템 재료 부족: ${building.requires.map((i) => `${getItemLabel(i.itemId)} ${i.amount}`).join(" · ")}`]);
        return base;
      }
      setChatLines((prev) => [...prev.slice(-5), `[demo] ${building.name} 설치 아이템 제작 완료. 인벤토리 건설 탭에서 선택한 뒤 필드를 클릭하세요.`]);
      return addInventoryItem(consumed, itemId, 1);
    });
  }, []);

  const handleSelectBuildingItem = useCallback((itemId: string) => {
    const building = getProgressionBuildingByItemId(itemId);
    if (!building) {
      setChatLines((prev) => [...prev.slice(-5), `[info] 설치할 수 없는 아이템: ${getItemLabel(itemId)}`]);
      return;
    }

    setSelectedBuilding(null);
    setSelectedBuildingItemId((current) => {
      const next = current === itemId ? null : itemId;
      setChatLines((prev) => [...prev.slice(-5), next ? `[build] ${building.name} 배치 모드: 설치할 필드 위치를 클릭하세요.` : `[build] ${building.name} 배치 취소`]);
      return next;
    });
  }, []);

  const handleWorldClick = useCallback((target: WorldClickTarget) => {
    if (target.kind === "building") {
      setSelectedBuildingItemId(null);
      setSelectedBuilding(target.building);
      setChatLines((prev) => [...prev.slice(-5), `[build] ${target.building.type} 건설물 선택`]);
      return;
    }

    if (!selectedBuildingItemId) return;

    const { position, validity } = target;
    const building = getProgressionBuildingByItemId(selectedBuildingItemId);
    if (!building) {
      setSelectedBuildingItemId(null);
      return;
    }

    if (!validity.ok) {
      setChatLines((prev) => [...prev.slice(-5), `[build] ${validity.reason}`]);
      return;
    }

    if (socketRef.current?.connected) {
      socketRef.current.emit("client:place_building", {
        buildingType: building.type as BuildingType,
        position,
        itemId: selectedBuildingItemId,
      });
      setSelectedBuildingItemId(null);
      return;
    }

    setInventory((current) => {
      const base = current ?? createDemoInventory();
      const consumed = consumeInventoryItems(base, [{ itemId: selectedBuildingItemId, amount: 1 }]);
      if (!consumed) {
        setChatLines((prev) => [...prev.slice(-5), `[demo] ${building.name} 설치 아이템이 없습니다.`]);
        setSelectedBuildingItemId(null);
        return base;
      }

      const placedBuilding: BuildingState = {
        id: `demo-building-${building.type}-${Date.now()}`,
        type: building.type as BuildingType,
        ownerPlayerId: demoPlayerId,
        position,
        hp: building.maxHp,
        maxHp: building.maxHp,
      };
      demoBuildingsRef.current = [...demoBuildingsRef.current, placedBuilding];
      setChatLines((prev) => [...prev.slice(-5), `[demo] ${building.name} 설치 완료`]);
      setSelectedBuildingItemId(null);
      setSelectedBuilding(placedBuilding);
      applyDemoSnapshot();
      return consumed;
    });
  }, [applyDemoSnapshot, selectedBuildingItemId]);

  useEffect(() => {
    if (nickname === "..." || !serverEndpoint) return;
    const socket: TypedSocket = io(serverEndpoint, { transports: ["websocket", "polling"], autoConnect: true });
    socketRef.current = socket;
    setConnectionState("connecting");
    setChatLines((prev) => [...prev.slice(-5), `[info] realtime: ${serverEndpoint}`]);
    socket.on("connect", () => { setConnectionState("online"); socket.emit("client:join_world", { nickname }); });
    socket.on("connect_error", (error) => { setConnectionState("error"); setChatLines((prev) => [...prev.slice(-5), `[error] 서버 연결 실패: ${error.message}`]); });
    socket.on("disconnect", () => setConnectionState("offline"));
    socket.on("server:world_snapshot", (nextSnapshot) => { hasServerSnapshotRef.current = true; setSnapshot(nextSnapshot); sceneRef.current?.applySnapshot(nextSnapshot, socket.id ?? null); });
    socket.on("server:inventory_updated", (nextInventory) => setInventory(nextInventory));
    socket.on("server:chat_message", (line) => setChatLines((prev) => [...prev.slice(-5), `${line.nickname}: ${line.message}`]));
    socket.on("server:toast", (toast) => setChatLines((prev) => [...prev.slice(-5), `[${toast.type}] ${toast.message}`]));
    return () => { socket.disconnect(); socketRef.current = null; hasServerSnapshotRef.current = false; };
  }, [nickname, serverEndpoint]);

  useEffect(() => {
    let animationFrame = 0;
    let lastSent = 0;
    const sendInput = (now: number) => {
      if (now - lastSent >= 50) {
        const input = inputRef.current;
        socketRef.current?.emit("client:player_input", { movement: { x: input.x, y: input.y }, primaryAction: input.primary, secondaryAction: input.secondary, sequence: inputSequenceRef.current++ });
        if (input.primary) handleDemoAttack();
        lastSent = now;
      }
      animationFrame = requestAnimationFrame(sendInput);
    };
    animationFrame = requestAnimationFrame(sendInput);
    return () => cancelAnimationFrame(animationFrame);
  }, [handleDemoAttack]);

  const handleSceneReady = useCallback((scene: GameWorldScene) => { sceneRef.current = scene; }, []);
  const handleInputChange = useCallback((input: GameSceneInput) => { inputRef.current = input; }, []);
  const objectiveText = useMemo(() => selectedBuildingItemId ? "배치 모드입니다. 초록색 위치에만 설치할 수 있습니다." : "건설물을 클릭하면 상호작용 패널이 열립니다.", [selectedBuildingItemId]);

  return (
    <main className={`game-shell ${selectedBuildingItemId ? "game-shell--placing" : ""}`}>
      <GameScene onReady={handleSceneReady} onInputChange={handleInputChange} onInteract={handleInteract} onWorldClick={handleWorldClick} placementBuildingType={placementBuildingType} />
      <section className="game-hud" aria-label="Game HUD">
        <DraggablePanel id="status" title="캐릭터"><CharacterPanel nickname={nickname} connectionState={connectionState} serverEndpoint={serverEndpoint} snapshot={snapshot} /></DraggablePanel>
        <DraggablePanel id="objective" title="목표"><p>{objectiveText}</p></DraggablePanel>
        <DraggablePanel id="inventory" title="인벤토리"><InventoryPanel inventory={inventory} selectedBuildingItemId={selectedBuildingItemId} onSelectBuildingItem={handleSelectBuildingItem} /></DraggablePanel>
        <DraggablePanel id="equipment" title="장비"><EquipmentPanel inventory={inventory} /></DraggablePanel>
        <DraggablePanel id="build" title="제작 / 건설"><CraftingPanel onCraft={handleCraft} onCraftBuildingItem={handleCraftBuildingItem} /></DraggablePanel>
        {selectedBuilding ? (
          <DraggablePanel id="buildingInteraction" title="건설물">
            <BuildingInteractionPanel
              building={selectedBuilding}
              onClose={() => setSelectedBuilding(null)}
              onOpenCrafting={() => setChatLines((prev) => [...prev.slice(-5), "[build] 제작 패널을 열어 작업을 진행하세요."])}
            />
          </DraggablePanel>
        ) : null}
        <DraggablePanel id="chat" title="로그"><LogPanel lines={chatLines} /></DraggablePanel>
        <MobileControls onInputChange={handleInputChange} onInteract={handleInteract} />
      </section>
    </main>
  );
}

function DraggablePanel({ id, title, children }: { id: PanelId; title: string; children: ReactNode }) {
  const defaults = panelDefaults[id];
  const [position, setPosition] = useState({ x: defaults.x, y: defaults.y });
  const [collapsed, setCollapsed] = useState(Boolean(defaults.collapsed));
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; panelX: number; panelY: number } | null>(null);
  useEffect(() => { setPosition((current) => ({ x: Math.min(current.x, Math.max(4, window.innerWidth - 132)), y: Math.min(current.y, Math.max(4, window.innerHeight - 44)) })); }, []);
  return (
    <section className={`hud-panel draggable-panel ${collapsed ? "draggable-panel--collapsed" : ""}`} style={{ left: position.x, top: position.y, width: defaults.width }}>
      <header className="draggable-panel__header" onPointerDown={(event) => { event.preventDefault(); dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, panelX: position.x, panelY: position.y }; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={(event) => { const drag = dragRef.current; if (!drag || drag.pointerId !== event.pointerId) return; setPosition({ x: Math.max(4, Math.min(window.innerWidth - 86, drag.panelX + event.clientX - drag.startX)), y: Math.max(4, Math.min(window.innerHeight - 42, drag.panelY + event.clientY - drag.startY)) }); }} onPointerUp={(event) => { if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null; }} onPointerCancel={() => { dragRef.current = null; }}>
        <strong>{title}</strong>
        <button className="draggable-panel__toggle" onPointerDown={(event) => event.stopPropagation()} onClick={() => setCollapsed((value) => !value)}>{collapsed ? "펼치기" : "접기"}</button>
      </header>
      {!collapsed ? <div className="draggable-panel__body">{children}</div> : null}
    </section>
  );
}

function MobileControls({ onInputChange, onInteract }: { onInputChange: (input: GameSceneInput) => void; onInteract: () => void }) {
  const [stick, setStick] = useState({ x: 0, y: 0 });
  const pointerIdRef = useRef<number | null>(null);
  const activeInputRef = useRef<GameSceneInput>({ x: 0, y: 0, primary: false, secondary: false });
  const emitInput = useCallback((patch: Partial<GameSceneInput>) => { const next = { ...activeInputRef.current, ...patch }; activeInputRef.current = next; onInputChange(next); }, [onInputChange]);
  const updateStickFromPointer = useCallback((event: PointerEvent<HTMLDivElement>) => { const rect = event.currentTarget.getBoundingClientRect(); const centerX = rect.left + rect.width / 2; const centerY = rect.top + rect.height / 2; const rawX = event.clientX - centerX; const rawY = event.clientY - centerY; const distance = Math.hypot(rawX, rawY); const clampedDistance = Math.min(distance, joystickRadius); const angle = Math.atan2(rawY, rawX); const visual = { x: Math.cos(angle) * clampedDistance, y: Math.sin(angle) * clampedDistance }; setStick(visual); emitInput({ x: distance === 0 ? 0 : visual.x / joystickRadius, y: distance === 0 ? 0 : visual.y / joystickRadius }); }, [emitInput]);
  const stopMovement = useCallback(() => { pointerIdRef.current = null; setStick({ x: 0, y: 0 }); emitInput({ x: 0, y: 0 }); }, [emitInput]);
  return (
    <>
      <div className="mobile-control-hint">왼쪽 이동 · 오른쪽 행동</div>
      <div className="mobile-joystick" role="application" aria-label="이동 조이스틱" onPointerDown={(event) => { event.preventDefault(); pointerIdRef.current = event.pointerId; event.currentTarget.setPointerCapture(event.pointerId); updateStickFromPointer(event); }} onPointerMove={(event) => { if (pointerIdRef.current !== event.pointerId) return; event.preventDefault(); updateStickFromPointer(event); }} onPointerUp={(event) => { if (pointerIdRef.current !== event.pointerId) return; event.preventDefault(); event.currentTarget.releasePointerCapture(event.pointerId); stopMovement(); }} onPointerCancel={stopMovement}>
        <div className="joystick-base"><div className="joystick-cross joystick-cross--horizontal" /><div className="joystick-cross joystick-cross--vertical" /><div className="joystick-stick" style={{ transform: `translate(calc(-50% + ${stick.x}px), calc(-50% + ${stick.y}px))` }} /></div>
      </div>
      <div className="mobile-actions" aria-label="행동 버튼">
        <button className="action-button action-button--attack" onPointerDown={(event) => { event.preventDefault(); emitInput({ primary: true }); }} onPointerUp={(event) => { event.preventDefault(); emitInput({ primary: false }); }} onPointerCancel={() => emitInput({ primary: false })}>공격</button>
        <button className="action-button action-button--interact" onPointerDown={(event) => { event.preventDefault(); emitInput({ secondary: true }); onInteract(); }} onPointerUp={(event) => { event.preventDefault(); emitInput({ secondary: false }); }} onPointerCancel={() => emitInput({ secondary: false })}>상호</button>
      </div>
    </>
  );
}
