"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent, type ReactNode } from "react";
import type { BuildingState, BuildingType, CreaturePublicState, Direction, InventoryState, ResourceNodeState, Vector2, WorldSnapshot } from "@palpalworld/shared";
import { BuildingInteractionPanel } from "../buildings/BuildingInteractionPanel";
import { CharacterPanel } from "../character/CharacterPanel";
import { CraftingPanel } from "../crafting/CraftingPanel";
import { getBuildingItemId, getCraftingStationByBuildingType, getProgressionBuilding, getProgressionBuildingByItemId, getProgressionRecipe } from "../crafting/progressionCatalog";
import { EquipmentPanel } from "../equipment/EquipmentPanel";
import { isEquippableItemId } from "../equipment/equipmentRules";
import { InventoryGridPanel } from "../inventory/InventoryGridPanel";
import { QuickSlotBar } from "../inventory/QuickSlotBar";
import { addInventoryStack, readStoredInventory, removeInventoryStack, writeStoredInventory } from "../inventory/inventoryStore";
import { findInventoryEntryByKey } from "../inventory/inventoryUiModel";
import { getItemLabel } from "../items/itemLabels";
import { LogPanel } from "../logs/LogPanel";
import { CaptureMinigameOverlay } from "../pets/CaptureMinigameOverlay";
import { canStartCapture, createCaptureMinigameConfig, isCaptureOrbItemId, type CaptureMinigameConfig, type CaptureOrbItemId } from "../pets/captureRules";
import { createPetItemId } from "../pets/petInventory";
import { getPetSpeciesDefinition } from "../pets/petCatalog";
import { MiniMapPanel } from "../world/MiniMapPanel";
import { DEFAULT_PLAYER_TILE, clampPositionToTile, type MapTileRef } from "../../../../../packages/shared/src/worldTiles";
import { createTileBasedDemoBuildings, createTileBasedDemoCreatures, createTileBasedDemoResources } from "./demoWorldSpawns";
import { GameScene, type GameSceneInput, type GameWorldScene, type WorldClickTarget } from "./GameScene";
import { addBuildingToTileIndex, createDemoTileIndex, getAliveTileCreatures, getAliveTileResources, getTileBuildings } from "./demoTileIndex";

type MenuTab = "status" | "objective" | "equipment" | "crafting" | "logs";
type MiniMapSize = "small" | "medium" | "large";
type QuickButtonId = "inventory" | "crafting";
type ActiveCaptureState = {
  creature: CreaturePublicState;
  orbItemId: CaptureOrbItemId;
  config: CaptureMinigameConfig;
};

const demoPlayerId = "demo-player";
const joystickRadius = 56;
const uiSnapshotIntervalMs = 500;
const quickSlotCount = 5;
const menuTabs: { id: MenuTab; label: string }[] = [
  { id: "status", label: "캐릭터" },
  { id: "objective", label: "목표" },
  { id: "equipment", label: "장비" },
  { id: "crafting", label: "제작" },
  { id: "logs", label: "로그" },
];
const minimapSizes: MiniMapSize[] = ["small", "medium", "large"];
const minimapSizeLabels: Record<MiniMapSize, string> = { small: "S", medium: "M", large: "L" };
const quickButtonDefaults: Record<QuickButtonId, { x: number; y: number; icon: string; label: string }> = {
  inventory: { x: 12, y: 112, icon: "🎒", label: "가방" },
  crafting: { x: 12, y: 164, icon: "🛠", label: "제작" },
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
  return { x: Math.max(140, Math.min(2860, position.x)), y: Math.max(140, Math.min(2860, position.y)) };
}

function clampHudButtonPosition(position: { x: number; y: number }) {
  if (typeof window === "undefined") return position;
  return { x: Math.max(4, Math.min(window.innerWidth - 48, position.x)), y: Math.max(4, Math.min(window.innerHeight - 48, position.y)) };
}

function getInventoryAmount(inventory: InventoryState | null, itemId: string) {
  return inventory?.items.find((item) => item.itemId === itemId)?.amount ?? 0;
}

function moveDemoCreatures(creatures: CreaturePublicState[], deltaSeconds: number, now: number, playerPosition: Vector2) {
  for (const creature of creatures) {
    if (creature.hp <= 0) continue;
    const seed = hashId(creature.id);
    const time = now / 1000;
    const speed = getCreatureMoveSpeed(creature.speciesId);
    let angle = Math.sin(time * 0.42 + seed * 0.013) * Math.PI + Math.cos(time * 0.19 + seed * 0.007) * 0.85;
    let speedMultiplier = 0.75 + Math.sin(time * 0.63 + seed) * 0.25;
    const dx = creature.position.x - playerPosition.x;
    const dy = creature.position.y - playerPosition.y;
    const distance = Math.hypot(dx, dy);
    if (distance > 0 && distance < 230) {
      angle = Math.atan2(dy, dx);
      speedMultiplier = 1.45;
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

function addCraftedItem(inventory: InventoryState, itemId: string, amount: number): InventoryState {
  if (!isEquippableItemId(itemId)) return addInventoryStack(inventory, itemId, amount);
  const instances = [...inventory.itemInstances];
  for (let index = 0; index < amount; index += 1) {
    instances.push({
      instanceId: `crafted-${itemId}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}-${index}`,
      itemId,
      ownerPlayerId: inventory.ownerPlayerId,
      level: 1,
      durability: 100,
      traitIds: [],
      locked: false,
    });
  }
  return { ...inventory, itemInstances: instances };
}

function consumeInventoryItems(inventory: InventoryState, requirements: { itemId: string; amount: number }[]): InventoryState | null {
  for (const requirement of requirements) {
    const owned = inventory.items.find((item) => item.itemId === requirement.itemId)?.amount ?? 0;
    if (owned < requirement.amount) return null;
  }
  return requirements.reduce((next, requirement) => removeInventoryStack(next, requirement.itemId, requirement.amount), inventory);
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

function createDemoSnapshot(nickname: string, position: Vector2, direction: Direction, currentTile: MapTileRef, resources: ResourceNodeState[], creatures: CreaturePublicState[], buildings: BuildingState[]): WorldSnapshot {
  return {
    worldId: "offline-demo",
    serverTime: Date.now(),
    players: [{ id: demoPlayerId, nickname: nickname === "..." ? "Demo" : nickname, position, direction, currentTile, hp: 100, maxHp: 100 } as any],
    creatures,
    resources,
    buildings,
  };
}

function createPlacedBuildingId(buildingType: string) {
  return `demo-building-${buildingType}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

export function GameClientTileDemoStation() {
  const [nickname, setNickname] = useState("...");
  const [snapshot, setSnapshot] = useState<WorldSnapshot | null>(null);
  const [inventory, setInventory] = useState<InventoryState | null>(null);
  const [chatLines, setChatLines] = useState<string[]>(["[info] 타일 기반 데모 월드로 실행 중입니다."]);
  const [selectedBuildingItemId, setSelectedBuildingItemId] = useState<string | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingState | null>(null);
  const [selectedStationBuilding, setSelectedStationBuilding] = useState<BuildingState | null>(null);
  const [captureOrbReady, setCaptureOrbReady] = useState<CaptureOrbItemId | null>(null);
  const [activeCapture, setActiveCapture] = useState<ActiveCaptureState | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [activeMenuTab, setActiveMenuTab] = useState<MenuTab>("crafting");
  const [minimapSize, setMinimapSize] = useState<MiniMapSize>("medium");
  const [quickSlots, setQuickSlots] = useState<(string | null)[]>(() => Array.from({ length: quickSlotCount }, () => null));
  const sceneRef = useRef<GameWorldScene | null>(null);
  const inputRef = useRef<GameSceneInput>({ x: 0, y: 0, primary: false, secondary: false });
  const demoPositionRef = useRef<Vector2>({ x: 1500, y: 1500 });
  const demoDirectionRef = useRef<Direction>("down");
  const demoTileRef = useRef<MapTileRef>({ ...DEFAULT_PLAYER_TILE });
  const demoResourcesRef = useRef<ResourceNodeState[]>(createTileBasedDemoResources());
  const demoCreaturesRef = useRef<CreaturePublicState[]>(createTileBasedDemoCreatures());
  const demoBuildingsRef = useRef<BuildingState[]>(createTileBasedDemoBuildings());
  const demoTileIndexRef = useRef(createDemoTileIndex(demoResourcesRef.current, demoCreaturesRef.current, demoBuildingsRef.current));
  const lastDemoAttackAtRef = useRef(0);
  const lastUiSnapshotAtRef = useRef(0);

  const selectedPlacementBuilding = useMemo(() => selectedBuildingItemId ? getProgressionBuildingByItemId(selectedBuildingItemId) : null, [selectedBuildingItemId]);
  const placementBuildingType = selectedPlacementBuilding?.type as BuildingType | undefined;
  const selectedStation = selectedStationBuilding ? getCraftingStationByBuildingType(String(selectedStationBuilding.type)) : null;
  const getCurrentResources = useCallback(() => getAliveTileResources(demoTileIndexRef.current, demoTileRef.current), []);
  const getCurrentCreatures = useCallback(() => getAliveTileCreatures(demoTileIndexRef.current, demoTileRef.current), []);
  const getCurrentBuildings = useCallback(() => getTileBuildings(demoTileIndexRef.current, demoTileRef.current), []);

  const commitInventory = useCallback((nextInventory: InventoryState) => {
    const stored = writeStoredInventory(nextInventory);
    setInventory(stored);
    return stored;
  }, []);

  const updateInventory = useCallback((updater: (current: InventoryState) => InventoryState) => {
    setInventory((current) => {
      const base = current ?? readStoredInventory(createDemoInventory());
      return writeStoredInventory(updater(base));
    });
  }, []);

  const applyDemoSnapshot = useCallback((forceUiUpdate = false) => {
    const nextSnapshot = createDemoSnapshot(nickname, demoPositionRef.current, demoDirectionRef.current, demoTileRef.current, getCurrentResources(), getCurrentCreatures(), getCurrentBuildings());
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
  }, [getCurrentBuildings, getCurrentCreatures, getCurrentResources, nickname]);

  useEffect(() => {
    setNickname(createClientNickname());
    commitInventory(readStoredInventory(createDemoInventory()));
  }, [commitInventory]);

  useEffect(() => {
    const handleInventoryChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{ inventory?: InventoryState }>;
      if (customEvent.detail?.inventory) setInventory(customEvent.detail.inventory);
    };
    window.addEventListener("palpalworld:inventory-changed", handleInventoryChanged);
    return () => window.removeEventListener("palpalworld:inventory-changed", handleInventoryChanged);
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
      const next = clampPositionToTile({ x: demoPositionRef.current.x + normalized.x * 180 * deltaSeconds, y: demoPositionRef.current.y + normalized.y * 180 * deltaSeconds });
      demoPositionRef.current.x = next.x;
      demoPositionRef.current.y = next.y;
      moveDemoCreatures(getCurrentCreatures(), deltaSeconds, now, demoPositionRef.current);
      applyDemoSnapshot(false);
      lastTick = now;
      animationFrame = requestAnimationFrame(tick);
    };
    animationFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame);
  }, [applyDemoSnapshot, getCurrentCreatures]);

  const handleDemoInteract = useCallback(() => {
    const resource = findNearestResource(getCurrentResources(), demoPositionRef.current);
    if (!resource) {
      setChatLines((prev) => [...prev.slice(-5), "[demo] 현재 타일에서 가까운 자원이 없습니다."]);
      return;
    }
    const gainAmount = resource.resourceType === "berry" ? 4 : resource.resourceType === "fiber" ? 5 : resource.resourceType === "ore" || resource.resourceType === "coal" ? 4 : 8;
    resource.remainingAmount = Math.max(0, resource.remainingAmount - 25);
    updateInventory((current) => addInventoryStack(current, resource.resourceType, gainAmount));
    setChatLines((prev) => [...prev.slice(-5), `[demo] ${getItemLabel(resource.resourceType)} ${gainAmount}개 획득`]);
    applyDemoSnapshot(true);
  }, [applyDemoSnapshot, getCurrentResources, updateInventory]);

  const handleDemoAttack = useCallback(() => {
    if (activeCapture) return;
    const now = performance.now();
    if (now - lastDemoAttackAtRef.current < 380) return;
    lastDemoAttackAtRef.current = now;
    const target = findNearestCreature(getCurrentCreatures(), demoPositionRef.current);
    if (!target) {
      setChatLines((prev) => [...prev.slice(-5), "[demo] 현재 타일 공격 범위 안에 몬스터가 없습니다."]);
      return;
    }

    if (captureOrbReady) {
      if (getInventoryAmount(inventory, captureOrbReady) <= 0) {
        setCaptureOrbReady(null);
        setChatLines((prev) => [...prev.slice(-5), "[capture] 포획구가 부족합니다."]);
        return;
      }
      if (!canStartCapture(target)) {
        setChatLines((prev) => [...prev.slice(-5), "[capture] 체력이 30% 이하인 몬스터만 포획할 수 있습니다."]);
        return;
      }
      setActiveCapture({ creature: { ...target }, orbItemId: captureOrbReady, config: createCaptureMinigameConfig(target, captureOrbReady) });
      setChatLines((prev) => [...prev.slice(-5), `[capture] ${getPetSpeciesDefinition(target.speciesId).name} 포획 시도`]);
      return;
    }

    target.hp = Math.max(0, target.hp - 18);
    if (target.hp <= 0) {
      updateInventory((current) => addInventoryStack(current, "pal_essence", 1));
      setChatLines((prev) => [...prev.slice(-5), `[demo] ${target.speciesId} 처치! 펄 정수 획득`]);
    } else {
      setChatLines((prev) => [...prev.slice(-5), `[demo] ${target.speciesId}에게 18 피해`]);
    }
    applyDemoSnapshot(true);
  }, [activeCapture, applyDemoSnapshot, captureOrbReady, getCurrentCreatures, inventory, updateInventory]);

  const handleResolveCapture = useCallback((success: boolean) => {
    if (!activeCapture) return;
    const { creature, orbItemId } = activeCapture;
    updateInventory((current) => {
      const withoutOrb = removeInventoryStack(current, orbItemId, 1);
      return success ? addInventoryStack(withoutOrb, createPetItemId(creature.speciesId), 1) : withoutOrb;
    });
    if (success) {
      const liveCreature = getCurrentCreatures().find((candidate) => candidate.id === creature.id);
      if (liveCreature) liveCreature.hp = 0;
      setChatLines((prev) => [...prev.slice(-5), `[capture] ${getPetSpeciesDefinition(creature.speciesId).name} 포획 성공!`]);
    } else {
      setChatLines((prev) => [...prev.slice(-5), `[capture] ${getPetSpeciesDefinition(creature.speciesId).name} 포획 실패`]);
    }
    setActiveCapture(null);
    setCaptureOrbReady(null);
    applyDemoSnapshot(true);
  }, [activeCapture, applyDemoSnapshot, getCurrentCreatures, updateInventory]);

  const handleCancelCapture = useCallback(() => {
    setActiveCapture(null);
    setChatLines((prev) => [...prev.slice(-5), "[capture] 포획을 취소했습니다."]);
  }, []);

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
    updateInventory((current) => {
      const consumed = consumeInventoryItems(current, recipe.inputs);
      if (!consumed) return current;
      return recipe.outputs.reduce((next, output) => addCraftedItem(next, output.itemId, output.amount), consumed);
    });
    setChatLines((prev) => [...prev.slice(-5), `[demo] ${recipe.name} 제작 완료`]);
  }, [updateInventory]);

  const handleCraftBuildingItem = useCallback((buildingType: string) => {
    const building = getProgressionBuilding(buildingType);
    if (!building) return;
    const itemId = getBuildingItemId(building.type);
    updateInventory((current) => {
      const consumed = consumeInventoryItems(current, building.requires);
      if (!consumed) return current;
      return addInventoryStack(consumed, itemId, 1);
    });
    setChatLines((prev) => [...prev.slice(-5), `[demo] ${building.name} 제작 완료`]);
  }, [updateInventory]);

  const handleSelectBuildingItem = useCallback((itemId: string) => {
    const building = getProgressionBuildingByItemId(itemId);
    if (!building) return;
    setSelectedBuilding(null);
    setSelectedStationBuilding(null);
    setSelectedBuildingItemId((current) => current === itemId ? null : itemId);
    setInventoryOpen(false);
    setMenuOpen(false);
    setCaptureOrbReady(null);
    setChatLines((prev) => [...prev.slice(-5), `[build] ${building.name} 배치 모드`]);
  }, []);

  const handleWorldClick = useCallback((target: WorldClickTarget) => {
    if (target.kind === "building") {
      const station = getCraftingStationByBuildingType(String(target.building.type));
      setSelectedBuildingItemId(null);
      setCaptureOrbReady(null);
      setInventoryOpen(false);
      setMenuOpen(false);
      if (station) {
        setSelectedBuilding(null);
        setSelectedStationBuilding(target.building);
        setChatLines((prev) => [...prev.slice(-5), `[build] ${station.name} 상호작용`]);
      } else {
        setSelectedStationBuilding(null);
        setSelectedBuilding(target.building);
        setChatLines((prev) => [...prev.slice(-5), `[build] ${String(target.building.type)} 상호작용`]);
      }
      return;
    }
    if (!selectedBuildingItemId) return;
    const building = getProgressionBuildingByItemId(selectedBuildingItemId);
    if (!building || !target.validity.ok) {
      setChatLines((prev) => [...prev.slice(-5), `[build] ${target.validity.reason}`]);
      return;
    }
    updateInventory((current) => {
      const consumed = consumeInventoryItems(current, [{ itemId: selectedBuildingItemId, amount: 1 }]);
      if (!consumed) return current;
      const placedBuilding: BuildingState = {
        id: createPlacedBuildingId(building.type),
        type: building.type as BuildingType,
        ownerPlayerId: demoPlayerId,
        position: target.position,
        currentTile: { ...demoTileRef.current },
        hp: building.maxHp,
        maxHp: building.maxHp,
      } as BuildingState;
      demoBuildingsRef.current = [...demoBuildingsRef.current.filter((existing) => existing.id !== placedBuilding.id), placedBuilding];
      addBuildingToTileIndex(demoTileIndexRef.current, placedBuilding);
      setSelectedBuildingItemId(null);
      setSelectedBuilding(null);
      setSelectedStationBuilding(getCraftingStationByBuildingType(String(placedBuilding.type)) ? placedBuilding : null);
      setChatLines((prev) => [...prev.slice(-5), `[demo] ${building.name} 설치 완료`]);
      applyDemoSnapshot(true);
      return consumed;
    });
  }, [applyDemoSnapshot, selectedBuildingItemId, updateInventory]);

  const handleAssignQuickSlot = useCallback((slotIndex: number, entryKey: string | null) => {
    setQuickSlots((current) => current.map((slot, index) => index === slotIndex ? entryKey : slot));
  }, []);

  const handleClearQuickSlot = useCallback((slotIndex: number) => {
    setQuickSlots((current) => current.map((slot, index) => index === slotIndex ? null : slot));
  }, []);

  const handleUseQuickSlot = useCallback((slotIndex: number) => {
    const entry = findInventoryEntryByKey(inventory, quickSlots[slotIndex]);
    if (!entry) return;
    if (entry.category === "building") {
      handleSelectBuildingItem(entry.itemId);
      return;
    }
    if (isCaptureOrbItemId(entry.itemId)) {
      setSelectedBuildingItemId(null);
      setCaptureOrbReady((current) => current === entry.itemId ? null : entry.itemId);
      setChatLines((prev) => [...prev.slice(-5), `[capture] ${entry.label} ${captureOrbReady === entry.itemId ? "준비 해제" : "준비 완료"}`]);
      return;
    }
    setChatLines((prev) => [...prev.slice(-5), `[quick] ${entry.label} 사용`]);
  }, [captureOrbReady, handleSelectBuildingItem, inventory, quickSlots]);

  const handleSceneReady = useCallback((scene: GameWorldScene) => { sceneRef.current = scene; }, []);
  const handleInputChange = useCallback((input: GameSceneInput) => { inputRef.current = input; }, []);
  const objectiveText = useMemo(() => selectedBuildingItemId ? "배치 모드입니다. 설치할 필드 위치를 클릭하세요." : "타일마다 다른 자원과 몬스터가 배치됩니다.", [selectedBuildingItemId]);
  const cycleMinimapSize = useCallback(() => setMinimapSize((current) => minimapSizes[(minimapSizes.indexOf(current) + 1) % minimapSizes.length]), []);
  const openInventoryPanel = useCallback(() => { setInventoryOpen((value) => !value); setMenuOpen(false); setSelectedStationBuilding(null); setSelectedBuilding(null); }, []);
  const openCraftingMenu = useCallback(() => { setActiveMenuTab("crafting"); setMenuOpen(true); setInventoryOpen(false); setSelectedStationBuilding(null); setSelectedBuilding(null); }, []);

  const activeMenuContent = useMemo<ReactNode>(() => {
    switch (activeMenuTab) {
      case "status":
        return <CharacterPanel nickname={nickname} connectionState="offline-demo" serverEndpoint="tile-demo" snapshot={snapshot} />;
      case "objective":
        return <p className="feature-panel__hint">{objectiveText}</p>;
      case "equipment":
        return <EquipmentPanel inventory={inventory} />;
      case "crafting":
        return <CraftingPanel inventory={inventory} onCraft={handleCraft} onCraftBuildingItem={handleCraftBuildingItem} />;
      case "logs":
        return <LogPanel lines={chatLines} />;
      default:
        return null;
    }
  }, [activeMenuTab, chatLines, handleCraft, handleCraftBuildingItem, inventory, nickname, objectiveText, snapshot]);

  return (
    <main className={`game-shell ${selectedBuildingItemId ? "game-shell--placing" : ""}`}>
      <GameScene onReady={handleSceneReady} onInputChange={handleInputChange} onInteract={handleDemoInteract} onWorldClick={handleWorldClick} placementBuildingType={placementBuildingType} />
      <section className="game-hud" aria-label="Game HUD">
        <button className="hud-menu-button" onClick={() => { setMenuOpen((value) => !value); setInventoryOpen(false); setSelectedStationBuilding(null); setSelectedBuilding(null); }} aria-expanded={menuOpen}>☰ 메뉴</button>
        <FloatingQuickButton id="inventory" onOpen={openInventoryPanel} />
        <FloatingQuickButton id="crafting" onOpen={openCraftingMenu} />
        <section className={`hud-minimap hud-minimap--${minimapSize}`} aria-label="미니맵">
          <button className="hud-minimap__size-button" onClick={cycleMinimapSize} aria-label="미니맵 크기 변경">{minimapSizeLabels[minimapSize]}</button>
          <MiniMapPanel snapshot={snapshot} localPlayerId={demoPlayerId} />
        </section>
        {captureOrbReady ? <div className="capture-ready-badge">포획 준비: {getItemLabel(captureOrbReady)} · 체력 30% 이하 몬스터를 공격하세요</div> : null}
        {inventoryOpen ? (
          <section className="inventory-overlay-panel" aria-label="인벤토리">
            <button className="inventory-overlay-panel__close" onClick={() => setInventoryOpen(false)} aria-label="인벤토리 닫기">×</button>
            <InventoryGridPanel inventory={inventory} quickSlots={quickSlots} selectedBuildingItemId={selectedBuildingItemId} onSelectBuildingItem={handleSelectBuildingItem} onAssignQuickSlot={handleAssignQuickSlot} />
          </section>
        ) : null}
        {selectedBuilding ? (
          <BuildingInteractionPanel
            building={selectedBuilding}
            inventory={inventory}
            onInventoryChange={commitInventory}
            onClose={() => setSelectedBuilding(null)}
            onOpenCrafting={() => {
              const station = getCraftingStationByBuildingType(String(selectedBuilding.type));
              if (station) setSelectedStationBuilding(selectedBuilding);
              setSelectedBuilding(null);
            }}
          />
        ) : null}
        {selectedStationBuilding && selectedStation ? (
          <section className="station-overlay-panel" aria-label={`${selectedStation.name} 제작소`}>
            <header className="station-overlay-panel__header"><strong>{selectedStation.name}</strong><button onClick={() => setSelectedStationBuilding(null)}>닫기</button></header>
            <div className="station-overlay-panel__body">
              <CraftingPanel inventory={inventory} stationId={selectedStation.id} compact onCraft={handleCraft} onCraftBuildingItem={handleCraftBuildingItem} />
            </div>
          </section>
        ) : null}
        {menuOpen ? (
          <section className="hud-menu-panel" aria-label="게임 메뉴">
            <header className="hud-menu-panel__header"><strong>게임 메뉴</strong><button onClick={() => setMenuOpen(false)}>닫기</button></header>
            <nav className="hud-menu-tabs" aria-label="메뉴 탭">
              {menuTabs.map((tab) => <button key={tab.id} className={activeMenuTab === tab.id ? "hud-menu-tabs__button hud-menu-tabs__button--active" : "hud-menu-tabs__button"} onClick={() => setActiveMenuTab(tab.id)}>{tab.label}</button>)}
            </nav>
            <div className="hud-menu-panel__body">{activeMenuContent}</div>
          </section>
        ) : null}
        {activeCapture ? <CaptureMinigameOverlay creature={activeCapture.creature} config={activeCapture.config} onResolve={handleResolveCapture} onCancel={handleCancelCapture} /> : null}
        <QuickSlotBar inventory={inventory} quickSlots={quickSlots} onUseQuickSlot={handleUseQuickSlot} onClearQuickSlot={handleClearQuickSlot} />
        <MobileControls onInputChange={handleInputChange} onInteract={handleDemoInteract} />
      </section>
    </main>
  );
}

function FloatingQuickButton({ id, onOpen }: { id: QuickButtonId; onOpen: () => void }) {
  const config = quickButtonDefaults[id];
  const [position, setPosition] = useState({ x: config.x, y: config.y });
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; buttonX: number; buttonY: number; moved: boolean } | null>(null);
  useEffect(() => { setPosition((current) => clampHudButtonPosition(current)); }, []);
  return (
    <button className={`hud-quick-button hud-quick-button--${id}`} style={{ left: position.x, top: position.y }} aria-label={config.label} title={config.label}
      onPointerDown={(event) => { event.preventDefault(); dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, buttonX: position.x, buttonY: position.y, moved: false }; event.currentTarget.setPointerCapture(event.pointerId); }}
      onPointerMove={(event) => { const drag = dragRef.current; if (!drag || drag.pointerId !== event.pointerId) return; const dx = event.clientX - drag.startX; const dy = event.clientY - drag.startY; if (Math.hypot(dx, dy) > 4) drag.moved = true; setPosition(clampHudButtonPosition({ x: drag.buttonX + dx, y: drag.buttonY + dy })); }}
      onPointerUp={(event) => { const drag = dragRef.current; if (!drag || drag.pointerId !== event.pointerId) return; dragRef.current = null; event.currentTarget.releasePointerCapture(event.pointerId); if (!drag.moved) onOpen(); }}
      onPointerCancel={() => { dragRef.current = null; }}>
      <span>{config.icon}</span><small>{config.label}</small>
    </button>
  );
}

function MobileControls({ onInputChange, onInteract }: { onInputChange: (input: GameSceneInput) => void; onInteract: () => void }) {
  const [stick, setStick] = useState({ x: 0, y: 0 });
  const pointerIdRef = useRef<number | null>(null);
  const activeInputRef = useRef<GameSceneInput>({ x: 0, y: 0, primary: false, secondary: false });

  const emitInput = useCallback((patch: Partial<GameSceneInput>) => {
    const next = { ...activeInputRef.current, ...patch };
    activeInputRef.current = next;
    onInputChange(next);
  }, [onInputChange]);

  const updateStickFromPointer = useCallback((event: PointerEvent<HTMLDivElement>) => {
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
    setStick(visual);
    emitInput({
      x: distance === 0 ? 0 : visual.x / joystickRadius,
      y: distance === 0 ? 0 : visual.y / joystickRadius,
    });
  }, [emitInput]);

  const stopMovement = useCallback(() => {
    pointerIdRef.current = null;
    setStick({ x: 0, y: 0 });
    emitInput({ x: 0, y: 0 });
  }, [emitInput]);

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
        onPointerCancel={stopMovement}
      >
        <div className="joystick-base">
          <div className="joystick-cross joystick-cross--horizontal" />
          <div className="joystick-cross joystick-cross--vertical" />
          <div className="joystick-stick" style={{ transform: `translate(calc(-50% + ${stick.x}px), calc(-50% + ${stick.y}px))` }} />
        </div>
      </div>
      <div className="mobile-actions" aria-label="행동 버튼">
        <button
          className="mobile-action mobile-action--primary"
          onPointerDown={(event) => {
            event.preventDefault();
            emitInput({ primary: true });
          }}
          onPointerUp={(event) => {
            event.preventDefault();
            emitInput({ primary: false });
          }}
          onPointerCancel={() => emitInput({ primary: false })}
        >
          공격
        </button>
        <button
          className="mobile-action mobile-action--secondary"
          onPointerDown={(event) => event.preventDefault()}
          onClick={onInteract}
        >
          채집
        </button>
      </div>
    </>
  );
}
