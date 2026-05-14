"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent, type ReactNode } from "react";
import type { BuildingState, BuildingType, CreaturePublicState, Direction, InventoryState, ResourceNodeState, Vector2, WorldSnapshot } from "@palpalworld/shared";
import { CharacterPanel } from "../character/CharacterPanel";
import { CraftingPanel } from "../crafting/CraftingPanel";
import { getBuildingItemId, getProgressionBuilding, getProgressionBuildingByItemId, getProgressionRecipe } from "../crafting/progressionCatalog";
import { EquipmentPanel } from "../equipment/EquipmentPanel";
import { InventoryPanel } from "../inventory/InventoryPanel";
import { getItemLabel } from "../items/itemLabels";
import { LogPanel } from "../logs/LogPanel";
import { BuildingInteractionPanel } from "../buildings/BuildingInteractionPanel";
import { DEFAULT_PLAYER_TILE, clampPositionToTile, isSameTile, type MapTileRef } from "../../../../../packages/shared/src/worldTiles";
import { createTileBasedDemoBuildings, createTileBasedDemoCreatures, createTileBasedDemoResources } from "./demoWorldSpawns";
import { GameScene, type GameSceneInput, type GameWorldScene, type WorldClickTarget } from "./GameScene";

type PanelId = "status" | "objective" | "inventory" | "equipment" | "build" | "buildingInteraction" | "chat";

const demoPlayerId = "demo-player";
const joystickRadius = 56;
const uiSnapshotIntervalMs = 250;
const panelDefaults: Record<PanelId, { x: number; y: number; width: number; collapsed?: boolean }> = {
  status: { x: 8, y: 8, width: 320 },
  objective: { x: 8, y: 60, width: 270, collapsed: true },
  inventory: { x: 8, y: 108, width: 340, collapsed: true },
  equipment: { x: 8, y: 156, width: 300, collapsed: true },
  build: { x: 8, y: 204, width: 420, collapsed: true },
  buildingInteraction: { x: 440, y: 108, width: 340 },
  chat: { x: 8, y: 252, width: 320, collapsed: true },
};

function createClientNickname() {
  const savedNickname = window.localStorage.getItem("palpalworld.nickname");
  if (savedNickname) return savedNickname;
  const nextNickname = `Pal-${Math.floor(1000 + Math.random() * 9000)}`;
  window.localStorage.setItem("palpalworld.nickname", nextNickname);
  return nextNickname;
}

function directionFromMovement(input: Vector2, fallback: Direction): Direction {
  if (Math.abs(input.x) < 0.08 && Math.abs(input.y) < 0.08) return fallback;
  if (Math.abs(input.x) >= Math.abs(input.y)) return input.x >= 0 ? "right" : "left";
  return input.y >= 0 ? "down" : "up";
}

function hashId(id: string) {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) hash = (hash * 31 + id.charCodeAt(index)) % 100_000;
  return hash;
}

function getCreatureMoveSpeed(speciesId: string) {
  if (speciesId === "sparkit") return 46;
  if (speciesId === "leafbun") return 38;
  if (speciesId === "droplet") return 24;
  if (speciesId === "moleminer") return 28;
  if (speciesId === "mossboar") return 34;
  if (speciesId === "rockturtle") return 14;
  return 26;
}

function clampCreaturePosition(position: Vector2): Vector2 {
  return {
    x: Math.max(140, Math.min(2860, position.x)),
    y: Math.max(140, Math.min(2860, position.y)),
  };
}

function entityTile(entity: { currentTile?: MapTileRef }) {
  return entity.currentTile ?? DEFAULT_PLAYER_TILE;
}

function moveDemoCreatures(creatures: CreaturePublicState[], deltaSeconds: number, now: number, playerPosition: Vector2, playerTile: MapTileRef) {
  for (const creature of creatures) {
    if (creature.hp <= 0) continue;

    const seed = hashId(creature.id);
    const time = now / 1000;
    const speed = getCreatureMoveSpeed(creature.speciesId);
    let angle = Math.sin(time * 0.42 + seed * 0.013) * Math.PI + Math.cos(time * 0.19 + seed * 0.007) * 0.85;
    let speedMultiplier = 0.75 + Math.sin(time * 0.63 + seed) * 0.25;

    const currentTile = entityTile(creature as any);
    if (isSameTile(currentTile, playerTile)) {
      const dx = creature.position.x - playerPosition.x;
      const dy = creature.position.y - playerPosition.y;
      const distance = Math.hypot(dx, dy);
      if (distance > 0 && distance < 230) {
        angle = Math.atan2(dy, dx);
        speedMultiplier = 1.45;
      }
    }

    const next = clampCreaturePosition(clampPositionToTile({
      x: creature.position.x + Math.cos(angle) * speed * speedMultiplier * deltaSeconds,
      y: creature.position.y + Math.sin(angle) * speed * speedMultiplier * deltaSeconds,
    }));

    creature.position.x = next.x;
    creature.position.y = next.y;
  }
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
      { itemId: "capture_orb", amount: 5 },
    ],
    itemInstances: [
      { instanceId: "demo-training-sword", itemId: "training_sword", ownerPlayerId: demoPlayerId, level: 1, durability: 100, traitIds: ["sharp"], locked: false },
      { instanceId: "demo-explorer-jacket", itemId: "explorer_jacket", ownerPlayerId: demoPlayerId, level: 1, durability: 100, traitIds: [], locked: false },
      { instanceId: "demo-leather-boots", itemId: "leather_boots", ownerPlayerId: demoPlayerId, level: 1, durability: 100, traitIds: [], locked: false },
    ],
  };
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

function findNearestResource(resources: ResourceNodeState[], position: Vector2, currentTile: MapTileRef, maxRange = 180) {
  let nearest: ResourceNodeState | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const resource of resources) {
    if (resource.remainingAmount <= 0 || !isSameTile(entityTile(resource as any), currentTile)) continue;
    const distance = Math.hypot(resource.position.x - position.x, resource.position.y - position.y);
    if (distance < nearestDistance) {
      nearest = resource;
      nearestDistance = distance;
    }
  }
  return nearest && nearestDistance <= maxRange ? nearest : null;
}

function findNearestCreature(creatures: CreaturePublicState[], position: Vector2, currentTile: MapTileRef, maxRange = 180) {
  let nearest: CreaturePublicState | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const creature of creatures) {
    if (creature.hp <= 0 || !isSameTile(entityTile(creature as any), currentTile)) continue;
    const distance = Math.hypot(creature.position.x - position.x, creature.position.y - position.y);
    if (distance < nearestDistance) {
      nearest = creature;
      nearestDistance = distance;
    }
  }
  return nearest && nearestDistance <= maxRange ? nearest : null;
}

function createDemoSnapshot(nickname: string, position: Vector2, direction: Direction, currentTile: MapTileRef, resources: ResourceNodeState[], creatures: CreaturePublicState[], buildings: BuildingState[]): WorldSnapshot {
  return {
    worldId: "offline-demo",
    serverTime: Date.now(),
    players: [{ id: demoPlayerId, nickname: nickname === "..." ? "Demo" : nickname, position, direction, currentTile, hp: 100, maxHp: 100 } as any],
    creatures: creatures.filter((creature) => creature.hp > 0),
    resources: resources.filter((resource) => resource.remainingAmount > 0),
    buildings,
  };
}

export function GameClientTileDemo() {
  const [nickname, setNickname] = useState("...");
  const [snapshot, setSnapshot] = useState<WorldSnapshot | null>(null);
  const [inventory, setInventory] = useState<InventoryState | null>(null);
  const [chatLines, setChatLines] = useState<string[]>(["[info] 타일 기반 데모 월드로 실행 중입니다."]);
  const [selectedBuildingItemId, setSelectedBuildingItemId] = useState<string | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingState | null>(null);
  const sceneRef = useRef<GameWorldScene | null>(null);
  const inputRef = useRef<GameSceneInput>({ x: 0, y: 0, primary: false, secondary: false });
  const demoPositionRef = useRef<Vector2>({ x: 1500, y: 1500 });
  const demoDirectionRef = useRef<Direction>("down");
  const demoTileRef = useRef<MapTileRef>({ ...DEFAULT_PLAYER_TILE });
  const demoResourcesRef = useRef<ResourceNodeState[]>(createTileBasedDemoResources());
  const demoCreaturesRef = useRef<CreaturePublicState[]>(createTileBasedDemoCreatures());
  const demoBuildingsRef = useRef<BuildingState[]>(createTileBasedDemoBuildings());
  const lastDemoAttackAtRef = useRef(0);
  const lastUiSnapshotAtRef = useRef(0);

  const selectedPlacementBuilding = useMemo(
    () => (selectedBuildingItemId ? getProgressionBuildingByItemId(selectedBuildingItemId) : null),
    [selectedBuildingItemId],
  );
  const placementBuildingType = selectedPlacementBuilding?.type as BuildingType | undefined;

  const applyDemoSnapshot = useCallback((forceUiUpdate = false) => {
    const nextSnapshot = createDemoSnapshot(nickname, demoPositionRef.current, demoDirectionRef.current, demoTileRef.current, demoResourcesRef.current, demoCreaturesRef.current, demoBuildingsRef.current);
    sceneRef.current?.applySnapshot(nextSnapshot, demoPlayerId);
    const player = nextSnapshot.players[0] as any;
    if (player?.currentTile) demoTileRef.current = { ...player.currentTile };
    if (player?.position) {
      demoPositionRef.current.x = player.position.x;
      demoPositionRef.current.y = player.position.y;
    }

    const now = performance.now();
    if (forceUiUpdate || now - lastUiSnapshotAtRef.current >= uiSnapshotIntervalMs) {
      lastUiSnapshotAtRef.current = now;
      setSnapshot(nextSnapshot);
    }
  }, [nickname]);

  useEffect(() => {
    setNickname(createClientNickname());
    setInventory(createDemoInventory());
  }, []);

  useEffect(() => {
    let animationFrame = 0;
    let lastTick = performance.now();
    const tick = (now: number) => {
      const deltaSeconds = Math.min(0.05, (now - lastTick) / 1000);
      const input = inputRef.current;
      const length = Math.hypot(input.x, input.y) || 1;
      const normalized = length > 1 ? { x: input.x / length, y: input.y / length } : input;
      demoDirectionRef.current = directionFromMovement(normalized, demoDirectionRef.current);
      const next = clampPositionToTile({
        x: demoPositionRef.current.x + normalized.x * 180 * deltaSeconds,
        y: demoPositionRef.current.y + normalized.y * 180 * deltaSeconds,
      });
      demoPositionRef.current.x = next.x;
      demoPositionRef.current.y = next.y;
      moveDemoCreatures(demoCreaturesRef.current, deltaSeconds, now, demoPositionRef.current, demoTileRef.current);
      applyDemoSnapshot(false);
      lastTick = now;
      animationFrame = requestAnimationFrame(tick);
    };
    animationFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame);
  }, [applyDemoSnapshot]);

  const handleDemoInteract = useCallback(() => {
    const resource = findNearestResource(demoResourcesRef.current, demoPositionRef.current, demoTileRef.current);
    if (!resource) {
      setChatLines((prev) => [...prev.slice(-5), "[demo] 현재 타일에서 가까운 자원이 없습니다."]);
      return;
    }
    const gainAmount = resource.resourceType === "berry" ? 4 : resource.resourceType === "fiber" ? 5 : resource.resourceType === "ore" || resource.resourceType === "coal" ? 4 : 8;
    resource.remainingAmount = Math.max(0, resource.remainingAmount - 25);
    setInventory((current) => addInventoryItem(current ?? createDemoInventory(), resource.resourceType, gainAmount));
    setChatLines((prev) => [...prev.slice(-5), `[demo] ${getItemLabel(resource.resourceType)} ${gainAmount}개 획득`]);
    applyDemoSnapshot(true);
  }, [applyDemoSnapshot]);

  const handleDemoAttack = useCallback(() => {
    const now = performance.now();
    if (now - lastDemoAttackAtRef.current < 380) return;
    lastDemoAttackAtRef.current = now;
    const target = findNearestCreature(demoCreaturesRef.current, demoPositionRef.current, demoTileRef.current);
    if (!target) {
      setChatLines((prev) => [...prev.slice(-5), "[demo] 현재 타일 공격 범위 안에 몬스터가 없습니다."]);
      return;
    }
    target.hp = Math.max(0, target.hp - 18);
    if (target.hp <= 0) {
      setInventory((current) => addInventoryItem(current ?? createDemoInventory(), "pal_essence", 1));
      setChatLines((prev) => [...prev.slice(-5), `[demo] ${target.speciesId} 처치! 펄 정수 획득`]);
    } else {
      setChatLines((prev) => [...prev.slice(-5), `[demo] ${target.speciesId}에게 18 피해`]);
    }
    applyDemoSnapshot(true);
  }, [applyDemoSnapshot]);

  useEffect(() => {
    let animationFrame = 0;
    let lastSent = 0;
    const tickInput = (now: number) => {
      const input = inputRef.current;
      if (now - lastSent >= 50 && input.primary) {
        handleDemoAttack();
        lastSent = now;
      }
      animationFrame = requestAnimationFrame(tickInput);
    };
    animationFrame = requestAnimationFrame(tickInput);
    return () => cancelAnimationFrame(animationFrame);
  }, [handleDemoAttack]);

  const handleCraft = useCallback((recipeId: string) => {
    const recipe = getProgressionRecipe(recipeId);
    if (!recipe) {
      setChatLines((prev) => [...prev.slice(-5), `[demo] 알 수 없는 제작법: ${recipeId}`]);
      return;
    }
    setInventory((current) => {
      const base = current ?? createDemoInventory();
      const consumed = consumeInventoryItems(base, recipe.inputs);
      if (!consumed) {
        setChatLines((prev) => [...prev.slice(-5), `[demo] ${recipe.name} 재료 부족`]);
        return base;
      }
      const crafted = recipe.outputs.reduce((next, output) => addInventoryItem(next, output.itemId, output.amount), consumed);
      setChatLines((prev) => [...prev.slice(-5), `[demo] ${recipe.name} 제작 완료`]);
      return crafted;
    });
  }, []);

  const handleCraftBuildingItem = useCallback((buildingType: string) => {
    const building = getProgressionBuilding(buildingType);
    if (!building) return;
    const itemId = getBuildingItemId(building.type);
    setInventory((current) => {
      const base = current ?? createDemoInventory();
      const consumed = consumeInventoryItems(base, building.requires);
      if (!consumed) {
        setChatLines((prev) => [...prev.slice(-5), `[demo] ${building.name} 설치 아이템 재료 부족`]);
        return base;
      }
      setChatLines((prev) => [...prev.slice(-5), `[demo] ${building.name} 설치 아이템 제작 완료`]);
      return addInventoryItem(consumed, itemId, 1);
    });
  }, []);

  const handleSelectBuildingItem = useCallback((itemId: string) => {
    const building = getProgressionBuildingByItemId(itemId);
    if (!building) return;
    setSelectedBuilding(null);
    setSelectedBuildingItemId((current) => current === itemId ? null : itemId);
    setChatLines((prev) => [...prev.slice(-5), `[build] ${building.name} 배치 모드`]);
  }, []);

  const handleWorldClick = useCallback((target: WorldClickTarget) => {
    if (target.kind === "building") {
      setSelectedBuildingItemId(null);
      setSelectedBuilding(target.building);
      return;
    }
    if (!selectedBuildingItemId) return;
    const building = getProgressionBuildingByItemId(selectedBuildingItemId);
    if (!building || !target.validity.ok) {
      setChatLines((prev) => [...prev.slice(-5), `[build] ${target.validity.reason}`]);
      return;
    }
    setInventory((current) => {
      const base = current ?? createDemoInventory();
      const consumed = consumeInventoryItems(base, [{ itemId: selectedBuildingItemId, amount: 1 }]);
      if (!consumed) return base;
      const placedBuilding: BuildingState = {
        id: `demo-building-${building.type}-${Date.now()}`,
        type: building.type as BuildingType,
        ownerPlayerId: demoPlayerId,
        position: target.position,
        currentTile: { ...demoTileRef.current },
        hp: building.maxHp,
        maxHp: building.maxHp,
      } as BuildingState;
      demoBuildingsRef.current = [...demoBuildingsRef.current, placedBuilding];
      setSelectedBuildingItemId(null);
      setSelectedBuilding(placedBuilding);
      setChatLines((prev) => [...prev.slice(-5), `[demo] ${building.name} 설치 완료`]);
      applyDemoSnapshot(true);
      return consumed;
    });
  }, [applyDemoSnapshot, selectedBuildingItemId]);

  const handleSceneReady = useCallback((scene: GameWorldScene) => { sceneRef.current = scene; }, []);
  const handleInputChange = useCallback((input: GameSceneInput) => { inputRef.current = input; }, []);
  const objectiveText = useMemo(() => selectedBuildingItemId ? "배치 모드입니다. 설치할 필드 위치를 클릭하세요." : "타일마다 다른 자원과 몬스터가 배치됩니다.", [selectedBuildingItemId]);

  return (
    <main className={`game-shell ${selectedBuildingItemId ? "game-shell--placing" : ""}`}>
      <GameScene onReady={handleSceneReady} onInputChange={handleInputChange} onInteract={handleDemoInteract} onWorldClick={handleWorldClick} placementBuildingType={placementBuildingType} />
      <section className="game-hud" aria-label="Game HUD">
        <DraggablePanel id="status" title="캐릭터"><CharacterPanel nickname={nickname} connectionState="offline-demo" serverEndpoint="tile-demo" snapshot={snapshot} /></DraggablePanel>
        <DraggablePanel id="objective" title="목표"><p>{objectiveText}</p></DraggablePanel>
        <DraggablePanel id="inventory" title="인벤토리"><InventoryPanel inventory={inventory} selectedBuildingItemId={selectedBuildingItemId} onSelectBuildingItem={handleSelectBuildingItem} /></DraggablePanel>
        <DraggablePanel id="equipment" title="장비"><EquipmentPanel inventory={inventory} /></DraggablePanel>
        <DraggablePanel id="build" title="제작 / 건설"><CraftingPanel onCraft={handleCraft} onCraftBuildingItem={handleCraftBuildingItem} /></DraggablePanel>
        {selectedBuilding ? <DraggablePanel id="buildingInteraction" title="건설물"><BuildingInteractionPanel building={selectedBuilding} onClose={() => setSelectedBuilding(null)} onOpenCrafting={() => setChatLines((prev) => [...prev.slice(-5), "[build] 제작 패널을 열어 작업을 진행하세요."])} /></DraggablePanel> : null}
        <DraggablePanel id="chat" title="로그"><LogPanel lines={chatLines} /></DraggablePanel>
        <MobileControls onInputChange={handleInputChange} onInteract={handleDemoInteract} />
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
        <button className="mobile-action mobile-action--primary" onPointerDown={(event) => { event.preventDefault(); emitInput({ primary: true }); }} onPointerUp={(event) => { event.preventDefault(); emitInput({ primary: false }); }} onPointerCancel={() => emitInput({ primary: false })}>공격</button>
        <button className="mobile-action mobile-action--secondary" onPointerDown={(event) => event.preventDefault()} onClick={onInteract}>채집</button>
      </div>
    </>
  );
}
