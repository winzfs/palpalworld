"use client";

import { useEffect, useRef } from "react";
import {
  WORLD,
  type BuildingState,
  type BuildingType,
  type CreaturePublicState,
  type EntityId,
  type ResourceNodeState,
  type Vector2,
  type WorldSnapshot,
} from "@palpalworld/shared";
import {
  DEFAULT_PLAYER_TILE,
  MAP_TILE_SIZE,
  clampPositionToTile,
  getMapTile,
  getNeighborTile,
  getPortalDirectionAtPosition,
  getSpawnPositionAfterTravel,
  isSameTile,
  type MapDirection,
  type MapTileRef,
} from "../../../../../packages/shared/src/worldTiles";
import { SpriteRenderer } from "../rendering/SpriteRenderer";
import { TileMapRenderer } from "../rendering/TileMapRenderer";
import { BuildPartRenderer } from "../rendering/BuildPartRenderer";
import { buildGridToIsoCenter, worldCameraToIsoBuildCamera, screenToIsoBuildGrid } from "../buildings/buildProjection2p5d";
import { getBuildPartSortKey } from "../buildings/buildPartVisual2p5d";
import { getBuildPartVisibility } from "../buildings/houseVisibility2p5d";
import { findStairAtPosition, getFloorLevelOnStair, getFloorYOffsetOnStair } from "../buildings/stairTraversal2p5d";
import { findWalkableFloorAtPosition, getFloorYOffset } from "../buildings/floorTraversal2p5d";
import { getBuildCollisionAtPosition, isOnStairTransition, isOverWalkableBuildCell } from "../buildings/buildCollision2p5d";
import { BUILD_GRID_SIZE, buildGridToWorld, worldToBuildGrid } from "../buildings/buildGrid";
import { BUILD_PARTS, rotateBuildPart, type BuildFloorLevel, type BuildPartId, type BuildPartRotation, type PlacedBuildPart } from "../buildings/buildPartCatalog";
import { canReplaceWallWithPart, findReplaceableWallForPart, getBuildPartOccupancy, getOccupiedKeys, getPlacedBuildPartOccupancy, getOccupancyKey } from "../buildings/buildPartOccupancy";
import { createPlacedBuildPart, getBuildPartsForHouse, getBuildPartsForTile, moveBuildPart, readStoredBuildParts, removeBuildPart, removeBuildParts, rotatePlacedBuildPart, writeStoredBuildParts } from "../buildings/buildPartStore";

export type GameSceneInput = { x: number; y: number; primary: boolean; secondary: boolean };
export type PlacementValidity = { ok: boolean; reason: string };
export type WorldClickTarget =
  | { kind: "field"; position: Vector2; validity: PlacementValidity }
  | { kind: "building"; building: BuildingState }
  | { kind: "creature"; creature: CreaturePublicState };

type ViewportBounds = { left: number; top: number; right: number; bottom: number };
type EquipmentChangedEvent = CustomEvent<{ weaponItemId?: string | null }>;
type BuildingDismantledEvent = CustomEvent<{ buildingId?: string; building?: BuildingState }>;
type SharedBuildingState = BuildingState & {
  currentTile?: MapTileRef;
  ownerNickname?: string;
  isRemoteSharedBuilding?: boolean;
};
type RemoteBuildingsEvent = CustomEvent<{ buildings?: SharedBuildingState[] }>;
type BuildPartsChangedEvent = CustomEvent<{ parts?: PlacedBuildPart[] }>;

const fallbackPlayerTiles = new Map<string, MapTileRef>();
const cullPadding = 96;
const equippedWeaponStorageKey = "palpalworld.demo.equippedWeaponItemId";
const buildingTypeLabels: Partial<Record<BuildingType | string, string>> = {
  base_core: "거점 코어",
  workbench: "작업대",
  storage_box: "보관함",
  campfire: "모닥불",
  farm_plot: "밭",
  cold_storage: "냉장고",
};

function distance(a: Vector2, b: Vector2) { return Math.hypot(a.x - b.x, a.y - b.y); }
function getTileRef(entity: unknown) { return (entity as { currentTile?: MapTileRef })?.currentTile ?? DEFAULT_PLAYER_TILE; }
function getBuildingDisplayName(building: BuildingState) { return buildingTypeLabels[String(building.type)] ?? String(building.type); }
function getBuildingOwnerLabel(building: BuildingState) {
  const shared = building as SharedBuildingState;
  if (!shared.isRemoteSharedBuilding) return null;
  return `${shared.ownerNickname ?? "Unknown"}의 ${getBuildingDisplayName(building)}`;
}
function getBuildingHitRadius(building: Pick<BuildingState, "type">) {
  return String(building.type) === "farm_plot" ? 62 : 42;
}
function getBuildingOverlapRadius(building: Pick<BuildingState, "type">) {
  return String(building.type) === "farm_plot" ? 76 : WORLD.tileSize;
}
function getBuildingHoverEllipse(building: Pick<BuildingState, "type">) {
  return String(building.type) === "farm_plot" ? { rx: 58, ry: 22, offsetY: 34 } : { rx: 32, ry: 12, offsetY: 24 };
}
function readStoredWeaponItemId() {
  if (typeof window === "undefined") return null;
  const directWeaponItemId = window.localStorage.getItem(equippedWeaponStorageKey);
  if (directWeaponItemId) return directWeaponItemId;
  try {
    const raw = window.localStorage.getItem("palpalworld.demo.equipment");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { slots?: { weapon?: string } };
    const weaponInstanceId = parsed.slots?.weapon;
    if (!weaponInstanceId) return null;
    if (weaponInstanceId.startsWith("quick-")) return weaponInstanceId.replace(/^quick-/, "");
    const inventoryRaw = window.localStorage.getItem("palpalworld.demo.inventory");
    if (!inventoryRaw) return null;
    const inventory = JSON.parse(inventoryRaw) as { itemInstances?: { instanceId: string; itemId: string }[] };
    return inventory.itemInstances?.find((item) => item.instanceId === weaponInstanceId)?.itemId ?? null;
  } catch { return null; }
}
function setPositionInPlace(target: Vector2, next: Vector2) { target.x = next.x; target.y = next.y; }
function isPositionInViewport(position: Vector2, viewport: ViewportBounds, padding = cullPadding) { return position.x >= viewport.left - padding && position.x <= viewport.right + padding && position.y >= viewport.top - padding && position.y <= viewport.bottom + padding; }
function normalizeSnapshotToCurrentTile(snapshot: WorldSnapshot): WorldSnapshot {
  for (const player of snapshot.players) {
    const serverTile = getTileRef(player);
    const rememberedTile = fallbackPlayerTiles.get(player.id);
    const currentTile = rememberedTile && isSameTile(serverTile, DEFAULT_PLAYER_TILE) ? rememberedTile : serverTile;
    const clamped = clampPositionToTile(player.position);
    const direction = getPortalDirectionAtPosition(clamped, currentTile);
    const nextTile = direction ? getNeighborTile(currentTile, direction) : null;
    if (direction && nextTile) {
      const spawn = getSpawnPositionAfterTravel(direction, clamped);
      (player as any).currentTile = { ...nextTile };
      fallbackPlayerTiles.set(player.id, { ...nextTile });
      setPositionInPlace(player.position, spawn);
    } else {
      (player as any).currentTile = currentTile;
      fallbackPlayerTiles.set(player.id, { ...currentTile });
      setPositionInPlace(player.position, clamped);
    }
  }
  for (const resource of snapshot.resources) setPositionInPlace(resource.position, clampPositionToTile(resource.position));
  for (const creature of snapshot.creatures) setPositionInPlace(creature.position, clampPositionToTile(creature.position));
  for (const building of snapshot.buildings) setPositionInPlace(building.position, clampPositionToTile(building.position));
  return snapshot;
}

const portalLabels: Record<MapDirection, string> = { north: "북쪽 포탈", south: "남쪽 포탈", west: "서쪽 포탈", east: "동쪽 포탈" };

export class GameWorldScene {
  private root: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private renderer = new SpriteRenderer();
  private tileMapRenderer = new TileMapRenderer();
  private buildPartRenderer = new BuildPartRenderer();
  private keys = new Set<string>();
  private animationFrame = 0;
  private snapshot: WorldSnapshot | null = null;
  private remoteBuildings: SharedBuildingState[] = [];
  private placedBuildParts: PlacedBuildPart[] = readStoredBuildParts();
  private previousCreatureHpById = new Map<string, number>();
  private previousPlayerPositions = new Map<string, Vector2>();
  private movingPlayerIds = new Set<string>();
  private hiddenBuildingIds = new Set<string>();
  private localPlayerId: string | null = null;
  private localEquippedWeaponItemId: string | null = null;
  private pointerWorldPosition: Vector2 | null = null;
  private placementDragStart: Vector2 | null = null;
  private placementPointerId: number | null = null;
  private hoverBuildingId: string | null = null;
  private hoverCreatureId: string | null = null;
  private highlightedCreatureId: string | null = null;
  private placementPreviewBuildingType: BuildingType | null = null;
  private selectedBuildPartId: BuildPartId | null = null;
  private selectedBuildPartRotation: BuildPartRotation = 0;
  private selectedBuildFloorLevel: BuildFloorLevel = 0;
  private buildPartDragPointerId: number | null = null;
  private buildPartDragPosition: Vector2 | null = null;
  private selectedPlacedBuildPartId: string | null = null;
  private selectedHouseId: string | null = null;
  private editingBuildPartPointerId: number | null = null;
  private demolitionMode = false;
  private demolitionPointerId: number | null = null;
  private demolitionDragStart: Vector2 | null = null;
  private demolitionDragCurrent: Vector2 | null = null;
  private demolitionSelectedPartIds = new Set<string>();
  private localPlayerFloorLevel = 0;
  private localPlayerFloorYOffset = 0;
  private localPlayerBuildCollisionReason: string | null = null;
  private cachedRootRectWidth = 0;
  private cachedRootRectHeight = 0;
  private cachedCanvasClientLeft = 0;
  private cachedCanvasClientTop = 0;
  private cachedSceneBuildings: BuildingState[] | null = null;
  private cachedSceneBuildPartsForPerf: PlacedBuildPart[] | null = null;
  private cachedSceneBuildPartsSource: PlacedBuildPart[] | null = null;
  private cachedSceneBuildPartsTileX: number | null = null;
  private cachedSceneBuildPartsTileY: number | null = null;
  private lastSnapshotDispatchAt = 0;
  private readonly snapshotDispatchIntervalMs = 50;
  private onInputChange: (input: GameSceneInput) => void;
  private onInteract: () => void;
  private onWorldClick: (target: WorldClickTarget) => void;

  constructor(root: HTMLDivElement, onInputChange: (input: GameSceneInput) => void, onInteract: () => void, onWorldClick: (target: WorldClickTarget) => void) {
    this.root = root;
    this.onInputChange = onInputChange;
    this.onInteract = onInteract;
    this.onWorldClick = onWorldClick;
    this.localEquippedWeaponItemId = readStoredWeaponItemId();
    this.canvas = document.createElement("canvas");
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.canvas.style.display = "block";
    this.context = this.canvas.getContext("2d") as CanvasRenderingContext2D;
    this.context.imageSmoothingEnabled = false;
    this.root.appendChild(this.canvas);
    window.addEventListener("resize", this.resize);
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    window.addEventListener("palpalworld:equipment-changed", this.handleEquipmentChanged as EventListener);
    window.addEventListener("palpalworld:building-dismantled", this.handleBuildingDismantled as EventListener);
    window.addEventListener("palpalworld:remote-buildings", this.handleRemoteBuildings as EventListener);
    window.addEventListener("palpalworld:build-parts-changed", this.handleBuildPartsChanged as EventListener);
    this.canvas.addEventListener("pointerdown", this.handlePointerDown);
    this.canvas.addEventListener("pointermove", this.handlePointerMove);
    this.canvas.addEventListener("pointerup", this.handlePointerUp);
    this.canvas.addEventListener("pointercancel", this.handlePointerCancel);
    this.canvas.addEventListener("pointerleave", this.handlePointerLeave);
    this.resize();
    this.loop();
  }

  destroy() {
    cancelAnimationFrame(this.animationFrame);
    window.removeEventListener("resize", this.resize);
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    window.removeEventListener("palpalworld:equipment-changed", this.handleEquipmentChanged as EventListener);
    window.removeEventListener("palpalworld:building-dismantled", this.handleBuildingDismantled as EventListener);
    window.removeEventListener("palpalworld:remote-buildings", this.handleRemoteBuildings as EventListener);
    window.removeEventListener("palpalworld:build-parts-changed", this.handleBuildPartsChanged as EventListener);
    this.canvas.removeEventListener("pointerdown", this.handlePointerDown);
    this.canvas.removeEventListener("pointermove", this.handlePointerMove);
    this.canvas.removeEventListener("pointerup", this.handlePointerUp);
    this.canvas.removeEventListener("pointercancel", this.handlePointerCancel);
    this.canvas.removeEventListener("pointerleave", this.handlePointerLeave);
    this.canvas.remove();
  }

  applySnapshot(snapshot: WorldSnapshot, localPlayerId: string | null) {
    const normalizedSnapshot = normalizeSnapshotToCurrentTile(snapshot);
    this.movingPlayerIds.clear();
    for (const player of normalizedSnapshot.players) {
      const previous = this.previousPlayerPositions.get(player.id);
      const moved = previous ? Math.hypot(player.position.x - previous.x, player.position.y - previous.y) > 0.15 : false;
      if (moved) this.movingPlayerIds.add(player.id);
      const __prev = this.previousPlayerPositions.get(player.id);
      if (__prev) { __prev.x = player.position.x; __prev.y = player.position.y; }
      else this.previousPlayerPositions.set(player.id, { x: player.position.x, y: player.position.y });
    }

    const damagedCreature = normalizedSnapshot.creatures.find((creature) => {
      const previousHp = this.previousCreatureHpById.get(creature.id);
      return previousHp !== undefined && creature.hp > 0 && creature.hp < previousHp;
    });
    if (damagedCreature) this.highlightedCreatureId = damagedCreature.id;

    if (this.highlightedCreatureId && !normalizedSnapshot.creatures.some((creature) => creature.id === this.highlightedCreatureId && creature.hp > 0)) {
      this.highlightedCreatureId = null;
    }
    const __liveCreatureIds = new Set<string>();
    for (const creature of normalizedSnapshot.creatures) {
      this.previousCreatureHpById.set(creature.id, creature.hp);
      __liveCreatureIds.add(creature.id);
    }
    for (const id of Array.from(this.previousCreatureHpById.keys())) {
      if (!__liveCreatureIds.has(id)) this.previousCreatureHpById.delete(id);
    }
    this.snapshot = normalizedSnapshot;
    this.localPlayerId = localPlayerId;
    this.localEquippedWeaponItemId = readStoredWeaponItemId();
    this.cachedSceneBuildings = null;
    const __now = performance.now();
    if (__now - this.lastSnapshotDispatchAt >= this.snapshotDispatchIntervalMs) {
      this.lastSnapshotDispatchAt = __now;
      window.dispatchEvent(new CustomEvent("palpalworld:world_snapshot", { detail: { snapshot: normalizedSnapshot, localPlayerId } }));
    }
  }

  setPlacementPreviewBuildingType(buildingType: BuildingType | null) {
    this.placementPreviewBuildingType = buildingType;
    this.placementDragStart = null;
    this.placementPointerId = null;
    this.canvas.style.cursor = buildingType ? "crosshair" : "default";
  }
  setHighlightedCreatureId(creatureId: string | null) { this.highlightedCreatureId = creatureId; }
  setBuildPartPlacement(partId: BuildPartId | null, rotation: BuildPartRotation, floorLevel: BuildFloorLevel) {
    this.selectedBuildPartId = partId;
    this.selectedBuildPartRotation = rotation;
    this.selectedBuildFloorLevel = floorLevel;
    this.buildPartDragPointerId = null;
    this.buildPartDragPosition = null;
    this.canvas.style.cursor = partId ? "crosshair" : this.placementPreviewBuildingType ? "crosshair" : "default";
  }
  getSelectedPlacedBuildPartForUi() {
    return this.getSelectedPlacedBuildPart();
  }
  getSelectedHousePartCountForUi() {
    return this.selectedHouseId ? getBuildPartsForHouse(this.placedBuildParts, this.selectedHouseId).length : 0;
  }
  rotateSelectedPlacedBuildPartForUi() {
    const selected = this.getSelectedPlacedBuildPart();
    if (!selected) return;
    this.placedBuildParts = rotatePlacedBuildPart(selected.id, rotateBuildPart(selected.rotation));
    this.dispatchBuildPartSelection();
  }
  deleteSelectedPlacedBuildPartForUi() {
    if (!this.selectedPlacedBuildPartId) return;
    this.placedBuildParts = removeBuildPart(this.selectedPlacedBuildPartId);
    this.selectedPlacedBuildPartId = null;
    this.selectedHouseId = null;
    this.dispatchBuildPartSelection();
  }
  clearBuildPartSelectionForUi() {
    this.selectedPlacedBuildPartId = null;
    this.selectedHouseId = null;
    this.demolitionSelectedPartIds.clear();
    this.dispatchBuildPartSelection();
  }
  setBuildDemolitionMode(enabled: boolean) {
    this.demolitionMode = enabled;
    this.demolitionPointerId = null;
    this.demolitionDragStart = null;
    this.demolitionDragCurrent = null;
    this.buildPartDragPointerId = null;
    this.editingBuildPartPointerId = null;
    if (enabled) {
      this.selectedBuildPartId = null;
      this.canvas.style.cursor = "crosshair";
    } else {
      this.demolitionSelectedPartIds.clear();
      this.canvas.style.cursor = this.placementPreviewBuildingType ? "crosshair" : "default";
    }
    this.dispatchBuildPartSelection();
  }
  getDemolitionSelectionCountForUi() {
    return this.demolitionSelectedPartIds.size;
  }
  dismantleDemolitionSelectionForUi() {
    if (this.demolitionSelectedPartIds.size <= 0) return;
    const selectedIds = new Set(this.demolitionSelectedPartIds);
    this.placedBuildParts = removeBuildParts(selectedIds);
    this.demolitionSelectedPartIds.clear();
    if (this.selectedPlacedBuildPartId && selectedIds.has(this.selectedPlacedBuildPartId)) {
      this.selectedPlacedBuildPartId = null;
      this.selectedHouseId = null;
    }
    this.dispatchBuildPartSelection();
  }
  focusSelectedHouseForUi() {
    const selected = this.getSelectedPlacedBuildPart();
    if (!selected?.houseId) return;
    this.selectedHouseId = selected.houseId;
    this.dispatchBuildPartSelection();
  }
  getNearestInteractableId(): EntityId | null {
    const localPlayer = this.getLocalPlayerPosition();
    if (!localPlayer || !this.snapshot) return null;
    let nearest: ResourceNodeState | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const resource of this.getSceneResources()) {
      const hitDistance = Math.hypot(resource.position.x - localPlayer.x, resource.position.y - localPlayer.y);
      if (hitDistance > WORLD.interactRange || hitDistance >= nearestDistance) continue;
      nearest = resource;
      nearestDistance = hitDistance;
    }
    return nearest?.id ?? null;
  }
  getLocalPlayerPosition() { return this.getLocalPlayer()?.position ?? null; }
  private handleEquipmentChanged = (event: EquipmentChangedEvent) => { this.localEquippedWeaponItemId = event.detail?.weaponItemId ?? readStoredWeaponItemId(); };
  private handleBuildingDismantled = (event: BuildingDismantledEvent) => {
    const buildingId = event.detail?.buildingId;
    if (!buildingId) return;
    this.hiddenBuildingIds.add(buildingId);
    this.remoteBuildings = this.remoteBuildings.filter((building) => building.id !== buildingId);
    this.cachedSceneBuildings = null;
    if (this.hoverBuildingId === buildingId) this.hoverBuildingId = null;
  };
  private handleRemoteBuildings = (event: RemoteBuildingsEvent) => {
    const localIds = new Set((this.snapshot?.buildings ?? []).map((building) => building.id));
    this.remoteBuildings = (event.detail?.buildings ?? []).filter((building) => {
      if (!building?.id || this.hiddenBuildingIds.has(building.id)) return false;
      if (localIds.has(building.id)) return false;
      return isSameTile(getTileRef(building), this.getCurrentTile());
    });
    this.cachedSceneBuildings = null;
  };
  private getLocalPlayer() { return this.snapshot?.players.find((player) => player.id === this.localPlayerId) ?? this.snapshot?.players[0] ?? null; }
  private getCurrentTile() { return getTileRef(this.getLocalPlayer()); }
  private getSceneResources() { return this.snapshot?.resources ?? []; }
  private getSceneCreatures() { return this.snapshot?.creatures ?? []; }
  private getSceneBuildings() {
    if (this.cachedSceneBuildings) return this.cachedSceneBuildings;
    const localBuildings = (this.snapshot?.buildings ?? []).filter((building) => !this.hiddenBuildingIds.has(building.id));
    const localIds = new Set(localBuildings.map((building) => building.id));
    const remoteBuildings = this.remoteBuildings.filter((building) => !localIds.has(building.id) && !this.hiddenBuildingIds.has(building.id));
    const combined = remoteBuildings.length > 0 ? [...localBuildings, ...remoteBuildings] : localBuildings;
    this.cachedSceneBuildings = combined;
    return combined;
  }

  getBuildPartPlacementValidity(position: Vector2, movingPartId?: string | null): PlacementValidity {
    if (!this.selectedBuildPartId && !movingPartId) return { ok: true, reason: "부품 설치 모드가 아닙니다." };
    const localPlayer = this.getLocalPlayerPosition();
    if (!localPlayer) return { ok: false, reason: "플레이어 위치를 찾을 수 없습니다." };
    const movingPart = movingPartId ? this.placedBuildParts.find((part) => part.id === movingPartId) ?? null : null;
    const partId = movingPart?.partId ?? this.selectedBuildPartId;
    if (!partId) return { ok: false, reason: "선택한 부품이 없습니다." };
    const part = BUILD_PARTS[partId];
    if (!part) return { ok: false, reason: "알 수 없는 건축 부품입니다." };
    const floorLevel = movingPart?.floorLevel ?? this.selectedBuildFloorLevel;
    const grid = worldToBuildGrid(position);
    const snapped = buildGridToWorld(grid);
    if (snapped.x < 0 || snapped.x > MAP_TILE_SIZE.width || snapped.y < 0 || snapped.y > MAP_TILE_SIZE.height) return { ok: false, reason: "타일 밖에는 설치할 수 없습니다." };
    const buildPartRange = WORLD.buildRange + 220;
    if (distance(localPlayer, snapped) > buildPartRange) return { ok: false, reason: "너무 멀리 설치할 수 없습니다." };
    const sceneParts = this.getSceneBuildParts().filter((existing) => existing.id !== movingPartId);
    const candidateOccupancy = getBuildPartOccupancy(part, grid.gridX, grid.gridY, floorLevel, movingPart?.rotation ?? this.selectedBuildPartRotation);
    const occupiedKeys = getOccupiedKeys(sceneParts);
    const replaceableWall = findReplaceableWallForPart({ parts: sceneParts, candidateDefinition: part, gridX: grid.gridX, gridY: grid.gridY, floorLevel, rotation: movingPart?.rotation ?? this.selectedBuildPartRotation });
    const hasBlockingOccupancy = candidateOccupancy.some((occupancy) => occupiedKeys.has(getOccupancyKey(occupancy)));
    if (hasBlockingOccupancy && !replaceableWall) return { ok: false, reason: "같은 위치에 이미 부품이 있습니다." };

    if (part.requiresSupport && floorLevel > 0) {
      const supported = sceneParts.some((existing) => {
        const existingDefinition = BUILD_PARTS[existing.partId];
        if (!existingDefinition?.supportsUpperFloor) return false;
        return getPlacedBuildPartOccupancy(existing).some((occupancy) => occupancy.gridX === grid.gridX && occupancy.gridY === grid.gridY && occupancy.floorLevel === floorLevel - 1);
      });
      if (!supported) return { ok: false, reason: "아래층 지지대가 필요합니다." };
    }

    if (part.requiresWall) {
      const hasWall = Boolean(replaceableWall);
      if (!hasWall) return { ok: false, reason: "벽 위치에 설치해야 합니다." };
    }
    return { ok: true, reason: this.buildPartDragPointerId !== null || this.editingBuildPartPointerId !== null ? "손을 떼면 적용됩니다." : "그리드에 맞춰 설치됩니다." };
  }

  getPlacementValidity(position: Vector2): PlacementValidity {
    if (!this.placementPreviewBuildingType) return { ok: true, reason: "설치 모드가 아닙니다." };
    const localPlayer = this.getLocalPlayerPosition();
    if (!localPlayer) return { ok: false, reason: "플레이어 위치를 찾을 수 없습니다." };
    if (position.x < 0 || position.x > MAP_TILE_SIZE.width || position.y < 0 || position.y > MAP_TILE_SIZE.height) return { ok: false, reason: "타일 밖에는 설치할 수 없습니다." };
    if (distance(localPlayer, position) > WORLD.buildRange) return { ok: false, reason: "너무 멀리 설치할 수 없습니다." };
    const previewRadius = getBuildingOverlapRadius({ type: this.placementPreviewBuildingType });
    for (const building of this.getSceneBuildings()) {
      const existingRadius = getBuildingOverlapRadius(building);
      if (distance(building.position, position) < Math.max(previewRadius, existingRadius)) return { ok: false, reason: "이미 다른 건물이 있는 위치입니다." };
    }
    return { ok: true, reason: this.placementDragStart ? "손을 떼면 설치됩니다." : "드래그해서 위치 선택" };
  }
  private getBuildingAt(position: Vector2) { let nearest: BuildingState | null = null; let nearestDistance = Number.POSITIVE_INFINITY; for (const building of this.getSceneBuildings()) { const hitDistance = distance(building.position, position); const hitRadius = getBuildingHitRadius(building); if (hitDistance <= hitRadius && hitDistance < nearestDistance) { nearest = building; nearestDistance = hitDistance; } } return nearest; }
  private getBuildPartAt(position: Vector2) {
    const __vw = this.cachedRootRectWidth || this.root.clientWidth;
    const __vh = this.cachedRootRectHeight || this.root.clientHeight;
    const __cam = this.getCameraOffset();
    const __isoCam = worldCameraToIsoBuildCamera(__cam.x, __cam.y, __vw, __vh);
    const __sx = position.x - __cam.x;
    const __sy = position.y - __cam.y;
    const __isoGrid = screenToIsoBuildGrid(__sx, __sy, __isoCam.x, __isoCam.y);
    let nearest: PlacedBuildPart | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const part of this.getSceneBuildParts()) {
      const definition = BUILD_PARTS[part.partId];
      const gRange = Math.max(1, definition?.width ?? 1, definition?.height ?? 1) + 1;
      if (Math.abs(part.gridX - __isoGrid.gridX) > gRange || Math.abs(part.gridY - __isoGrid.gridY) > gRange) continue;
      const partIso = buildGridToIsoCenter(part.gridX, part.gridY);
      const partSX = partIso.x - __isoCam.x;
      const partSY = partIso.y - __isoCam.y;
      const partDistance = Math.hypot(__sx - partSX, __sy - partSY);
      const hitRadius = Math.max(24, (BUILD_GRID_SIZE * Math.max(definition?.width ?? 1, definition?.height ?? 1)) / 2 + 8);
      if (partDistance <= hitRadius && partDistance < nearestDistance) {
        nearest = part;
        nearestDistance = partDistance;
      }
    }
    return nearest;
  }
  private getBuildPartsInWorldRect(start: Vector2, end: Vector2) {
    const __vw = this.cachedRootRectWidth || this.root.clientWidth;
    const __vh = this.cachedRootRectHeight || this.root.clientHeight;
    const __cam = this.getCameraOffset();
    const __isoCam = worldCameraToIsoBuildCamera(__cam.x, __cam.y, __vw, __vh);
    const startSX = start.x - __cam.x;
    const startSY = start.y - __cam.y;
    const endSX = end.x - __cam.x;
    const endSY = end.y - __cam.y;
    const gridA = screenToIsoBuildGrid(startSX, startSY, __isoCam.x, __isoCam.y);
    const gridB = screenToIsoBuildGrid(endSX, endSY, __isoCam.x, __isoCam.y);
    const minGX = Math.min(gridA.gridX, gridB.gridX) - 1;
    const maxGX = Math.max(gridA.gridX, gridB.gridX) + 1;
    const minGY = Math.min(gridA.gridY, gridB.gridY) - 1;
    const maxGY = Math.max(gridA.gridY, gridB.gridY) + 1;
    const scrLeft = Math.min(startSX, endSX);
    const scrRight = Math.max(startSX, endSX);
    const scrTop = Math.min(startSY, endSY);
    const scrBottom = Math.max(startSY, endSY);
    return this.getSceneBuildParts().filter((part) => {
      if (part.gridX < minGX || part.gridX > maxGX || part.gridY < minGY || part.gridY > maxGY) return false;
      const partIso = buildGridToIsoCenter(part.gridX, part.gridY);
      const partSX = partIso.x - __isoCam.x;
      const partSY = partIso.y - __isoCam.y;
      return partSX >= scrLeft && partSX <= scrRight && partSY >= scrTop && partSY <= scrBottom;
    });
  }
  private getCreatureAt(position: Vector2) { let nearest: CreaturePublicState | null = null; let nearestDistance = Number.POSITIVE_INFINITY; for (const creature of this.getSceneCreatures()) { if (creature.hp <= 0) continue; const hitDistance = distance(creature.position, position); if (hitDistance <= 46 && hitDistance < nearestDistance) { nearest = creature; nearestDistance = hitDistance; } } return nearest; }
  private getCameraOffset() {
    const width = this.cachedRootRectWidth || this.root.clientWidth;
    const height = this.cachedRootRectHeight || this.root.clientHeight;
    const localPlayer = this.getLocalPlayer();
    const target = localPlayer?.position ?? { x: width / 2, y: height / 2 };
    return {
      x: Math.max(0, Math.min(Math.max(0, MAP_TILE_SIZE.width - width), target.x - width / 2)),
      y: Math.max(0, Math.min(Math.max(0, MAP_TILE_SIZE.height - height), target.y - height / 2)),
    };
  }
  private getViewportBounds(cameraX: number, cameraY: number): ViewportBounds {
    const width = this.cachedRootRectWidth || this.root.clientWidth;
    const height = this.cachedRootRectHeight || this.root.clientHeight;
    return { left: cameraX, top: cameraY, right: cameraX + width, bottom: cameraY + height };
  }
  private screenToWorld(clientX: number, clientY: number): Vector2 {
    const camera = this.getCameraOffset();
    return clampPositionToTile({ x: clientX - this.cachedCanvasClientLeft + camera.x, y: clientY - this.cachedCanvasClientTop + camera.y });
  }
  private resize = () => {
    const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    const rect = this.root.getBoundingClientRect();
    this.canvas.width = Math.floor(rect.width * dpr);
    this.canvas.height = Math.floor(rect.height * dpr);
    this.context.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.context.imageSmoothingEnabled = false;
    this.cachedRootRectWidth = rect.width;
    this.cachedRootRectHeight = rect.height;
    const canvasRect = this.canvas.getBoundingClientRect();
    this.cachedCanvasClientLeft = canvasRect.left;
    this.cachedCanvasClientTop = canvasRect.top;
  };
  private emitPrimaryTap() { this.onInputChange({ x: 0, y: 0, primary: true, secondary: false }); window.setTimeout(() => this.onInputChange({ x: 0, y: 0, primary: false, secondary: false }), 90); }
  private commitPlacement(position: Vector2) { this.onWorldClick({ kind: "field", position, validity: this.getPlacementValidity(position) }); }
  private commitBuildPartPlacement(position: Vector2) {
    if (!this.selectedBuildPartId) return;
    const validity = this.getBuildPartPlacementValidity(position);
    if (!validity.ok) {
      window.dispatchEvent(new CustomEvent("palpalworld:build-placement-failed", { detail: { reason: validity.reason } }));
      return;
    }
    const grid = worldToBuildGrid(position);
    const placedPart = createPlacedBuildPart({
      partId: this.selectedBuildPartId,
      ownerPlayerId: this.localPlayerId ?? "demo-player",
      currentTile: this.getCurrentTile(),
      gridX: grid.gridX,
      gridY: grid.gridY,
      floorLevel: this.selectedBuildFloorLevel,
      rotation: this.selectedBuildPartRotation,
      existingParts: this.placedBuildParts,
      houseId: this.selectedHouseId,
    });
    this.selectedPlacedBuildPartId = placedPart.id;
    this.selectedHouseId = placedPart.houseId ?? null;
    const candidateDefinition = this.selectedBuildPartId ? BUILD_PARTS[this.selectedBuildPartId] : null;
    const replaceableWall = candidateDefinition && canReplaceWallWithPart(candidateDefinition)
      ? findReplaceableWallForPart({ parts: this.placedBuildParts, candidateDefinition, gridX: grid.gridX, gridY: grid.gridY, floorLevel: this.selectedBuildFloorLevel, rotation: this.selectedBuildPartRotation })
      : null;
    const nextParts = replaceableWall ? this.placedBuildParts.filter((part) => part.id !== replaceableWall.id) : this.placedBuildParts;
    if (replaceableWall) removeBuildPart(replaceableWall.id);
    this.selectedPlacedBuildPartId = placedPart.id;
    this.selectedHouseId = placedPart.houseId ?? replaceableWall?.houseId ?? null;
    this.placedBuildParts = writeStoredBuildParts([...nextParts, { ...placedPart, houseId: placedPart.houseId ?? replaceableWall?.houseId }]);
    this.dispatchBuildPartSelection();
  }
  private commitSelectedBuildPartMove(position: Vector2) {
    const selected = this.getSelectedPlacedBuildPart();
    if (!selected) return;
    const validity = this.getBuildPartPlacementValidity(position, selected.id);
    if (!validity.ok) {
      window.dispatchEvent(new CustomEvent("palpalworld:build-placement-failed", { detail: { reason: validity.reason } }));
      return;
    }
    const grid = worldToBuildGrid(position);
    this.placedBuildParts = moveBuildPart(selected.id, grid.gridX, grid.gridY, selected.floorLevel);
    this.dispatchBuildPartSelection();
  }
  private handlePointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    const position = this.screenToWorld(event.clientX, event.clientY);
    this.pointerWorldPosition = position;
    if (this.demolitionMode) {
      this.demolitionPointerId = event.pointerId;
      this.demolitionDragStart = position;
      this.demolitionDragCurrent = position;
      this.canvas.setPointerCapture(event.pointerId);
      return;
    }
    if (this.selectedBuildPartId && !this.placementPreviewBuildingType) {
      this.buildPartDragPointerId = event.pointerId;
      this.buildPartDragPosition = position;
      this.canvas.setPointerCapture(event.pointerId);
      return;
    }
    const buildPart = this.getBuildPartAt(position);
    if (buildPart) {
      this.selectedPlacedBuildPartId = buildPart.id;
      this.selectedHouseId = buildPart.houseId ?? null;
      this.dispatchBuildPartSelection();
      this.editingBuildPartPointerId = event.pointerId;
      this.buildPartDragPosition = position;
      this.canvas.setPointerCapture(event.pointerId);
      return;
    }
    if (this.placementPreviewBuildingType) {
      this.placementDragStart = position;
      this.placementPointerId = event.pointerId;
      this.canvas.setPointerCapture(event.pointerId);
      return;
    }
    const creature = this.getCreatureAt(position);
    if (creature) { this.onWorldClick({ kind: "creature", creature }); this.emitPrimaryTap(); return; }
    const building = this.getBuildingAt(position);
    if (building) { this.onWorldClick({ kind: "building", building }); return; }
    this.onWorldClick({ kind: "field", position, validity: this.getPlacementValidity(position) });
  };
  private handlePointerMove = (event: PointerEvent) => {
    const position = this.screenToWorld(event.clientX, event.clientY);
    this.pointerWorldPosition = position;
    if (this.demolitionPointerId === event.pointerId) {
      this.demolitionDragCurrent = position;
      return;
    }
    if (this.buildPartDragPointerId === event.pointerId || this.editingBuildPartPointerId === event.pointerId) this.buildPartDragPosition = position;
    const isBuildPartMode = this.demolitionMode || Boolean(this.selectedBuildPartId) || Boolean(this.selectedPlacedBuildPartId);
    this.hoverCreatureId = this.placementPreviewBuildingType || isBuildPartMode ? null : this.getCreatureAt(position)?.id ?? null;
    this.hoverBuildingId = this.placementPreviewBuildingType || isBuildPartMode || this.hoverCreatureId ? null : this.getBuildingAt(position)?.id ?? null;
    if (!this.placementPreviewBuildingType) this.canvas.style.cursor = isBuildPartMode ? "crosshair" : this.hoverCreatureId || this.hoverBuildingId ? "pointer" : "default";
  };
  private handlePointerUp = (event: PointerEvent) => {
    if (this.demolitionMode && this.demolitionPointerId === event.pointerId) {
      const position = this.screenToWorld(event.clientX, event.clientY);
      const start = this.demolitionDragStart ?? position;
      const dragDistance = distance(start, position);
      this.demolitionPointerId = null;
      this.demolitionDragStart = null;
      this.demolitionDragCurrent = null;
      this.canvas.releasePointerCapture(event.pointerId);
      if (dragDistance < 8) {
        const part = this.getBuildPartAt(position);
        if (part) {
          if (this.demolitionSelectedPartIds.has(part.id)) this.demolitionSelectedPartIds.delete(part.id);
          else this.demolitionSelectedPartIds.add(part.id);
          this.selectedPlacedBuildPartId = part.id;
          this.selectedHouseId = part.houseId ?? null;
        }
      } else {
        for (const part of this.getBuildPartsInWorldRect(start, position)) this.demolitionSelectedPartIds.add(part.id);
      }
      this.dispatchBuildPartSelection();
      return;
    }
    if (this.selectedPlacedBuildPartId && this.editingBuildPartPointerId === event.pointerId) {
      const position = this.screenToWorld(event.clientX, event.clientY);
      this.pointerWorldPosition = position;
      this.editingBuildPartPointerId = null;
      this.buildPartDragPosition = null;
      this.canvas.releasePointerCapture(event.pointerId);
      this.commitSelectedBuildPartMove(position);
      return;
    }
    if (this.selectedBuildPartId && this.buildPartDragPointerId === event.pointerId) {
      const position = this.screenToWorld(event.clientX, event.clientY);
      this.pointerWorldPosition = position;
      this.buildPartDragPointerId = null;
      this.buildPartDragPosition = null;
      this.canvas.releasePointerCapture(event.pointerId);
      this.commitBuildPartPlacement(position);
      return;
    }
    if (!this.placementPreviewBuildingType || this.placementPointerId !== event.pointerId) return;
    const position = this.screenToWorld(event.clientX, event.clientY);
    this.pointerWorldPosition = position;
    this.placementDragStart = null;
    this.placementPointerId = null;
    this.canvas.releasePointerCapture(event.pointerId);
    this.commitPlacement(position);
  };
  private handlePointerCancel = (event: PointerEvent) => {
    if (this.demolitionPointerId === event.pointerId) {
      this.demolitionPointerId = null;
      this.demolitionDragStart = null;
      this.demolitionDragCurrent = null;
    }
    if (this.editingBuildPartPointerId === event.pointerId) {
      this.editingBuildPartPointerId = null;
      this.buildPartDragPosition = null;
    }
    if (this.buildPartDragPointerId === event.pointerId) {
      this.buildPartDragPointerId = null;
      this.buildPartDragPosition = null;
    }
    if (this.placementPointerId === event.pointerId) {
      this.placementDragStart = null;
      this.placementPointerId = null;
    }
  };
  private handlePointerLeave = () => { this.hoverBuildingId = null; this.hoverCreatureId = null; if (!this.placementPreviewBuildingType) { this.pointerWorldPosition = null; this.canvas.style.cursor = "default"; } };
  private handleKeyDown = (event: KeyboardEvent) => { const key = event.key.toLowerCase(); if ((key === "delete" || key === "backspace") && this.selectedPlacedBuildPartId) { this.placedBuildParts = removeBuildPart(this.selectedPlacedBuildPartId); this.selectedPlacedBuildPartId = null; this.selectedHouseId = null; this.dispatchBuildPartSelection(); return; } if ((key === "r") && this.selectedPlacedBuildPartId) { const selected = this.getSelectedPlacedBuildPart(); if (selected) { const nextRotation = rotateBuildPart(selected.rotation); this.placedBuildParts = rotatePlacedBuildPart(selected.id, nextRotation); this.dispatchBuildPartSelection(); } return; } if (key === "escape") { this.selectedPlacedBuildPartId = null; this.selectedHouseId = null; this.dispatchBuildPartSelection(); } if (key === "e" && !this.keys.has(key)) this.onInteract(); this.keys.add(key); this.emitKeyboardInput(); };
  private handleKeyUp = (event: KeyboardEvent) => { this.keys.delete(event.key.toLowerCase()); this.emitKeyboardInput(); };
  private getCollisionAdjustedInput(input: GameSceneInput): GameSceneInput {
    const player = this.getLocalPlayerPosition();
    if (!player || (input.x === 0 && input.y === 0)) return input;
    const parts = this.getSceneBuildParts();
    const length = Math.hypot(input.x, input.y) || 1;
    const step = 24;
    const normalizedX = input.x / length;
    const normalizedY = input.y / length;
    const fullTarget = { x: player.x + normalizedX * step, y: player.y + normalizedY * step };
    const fullCollision = getBuildCollisionAtPosition({ parts, position: fullTarget, floorLevel: this.localPlayerFloorLevel });
    if (!fullCollision.blocked) return input;

    const xTarget = { x: player.x + normalizedX * step, y: player.y };
    const yTarget = { x: player.x, y: player.y + normalizedY * step };
    const xBlocked = Math.abs(input.x) > 0 && getBuildCollisionAtPosition({ parts, position: xTarget, floorLevel: this.localPlayerFloorLevel }).blocked;
    const yBlocked = Math.abs(input.y) > 0 && getBuildCollisionAtPosition({ parts, position: yTarget, floorLevel: this.localPlayerFloorLevel }).blocked;

    return {
      ...input,
      x: xBlocked ? 0 : input.x,
      y: yBlocked ? 0 : input.y,
    };
  }

  private emitKeyboardInput() { const left = this.keys.has("a") || this.keys.has("arrowleft"); const right = this.keys.has("d") || this.keys.has("arrowright"); const up = this.keys.has("w") || this.keys.has("arrowup"); const down = this.keys.has("s") || this.keys.has("arrowdown"); this.onInputChange(this.getCollisionAdjustedInput({ x: Number(right) - Number(left), y: Number(down) - Number(up), primary: this.keys.has(" "), secondary: this.keys.has("e") })); }
  private loop = () => { this.draw(); this.animationFrame = requestAnimationFrame(this.loop); };
  private draw() {
    const width = this.cachedRootRectWidth || this.root.clientWidth;
    const height = this.cachedRootRectHeight || this.root.clientHeight;
    const ctx = this.context;
    ctx.clearRect(0, 0, width, height);
    const camera = this.getCameraOffset();
    const viewport = this.getViewportBounds(camera.x, camera.y);
    const now = performance.now();
    this.tileMapRenderer.draw(ctx, width, height, camera.x, camera.y);
    this.drawMapBoundaryAndPortals(ctx, camera.x, camera.y);
    const __isoCam = worldCameraToIsoBuildCamera(camera.x, camera.y, width, height);
    this.drawBuildParts(ctx, camera.x, camera.y, viewport, __isoCam.x, __isoCam.y);
    this.drawBuildings(ctx, camera.x, camera.y, viewport);
    this.drawResources(ctx, camera.x, camera.y, viewport);
    this.drawCreatures(ctx, camera.x, camera.y, viewport);
    this.drawPlayers(ctx, camera.x, camera.y, now, viewport);
    this.drawInteractionHint(ctx, camera.x, camera.y);
    this.drawBuildFloorDebug(ctx);
    this.drawPlacementPreview(ctx, camera.x, camera.y);
    this.drawDemolitionSelectionRect(ctx, camera.x, camera.y);
    this.drawBuildPartPreview(ctx, camera.x, camera.y, __isoCam.x, __isoCam.y);
  }
  private drawMapBoundaryAndPortals(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {
    const currentTile = this.getCurrentTile();
    const tile = getMapTile(currentTile);
    const x = -cameraX;
    const y = -cameraY;
    ctx.save(); ctx.strokeStyle = "rgba(125, 211, 252, 0.42)"; ctx.lineWidth = 4; ctx.setLineDash([12, 8]); ctx.strokeRect(x, y, MAP_TILE_SIZE.width, MAP_TILE_SIZE.height); ctx.restore();
    if (!tile) return;
    const edge = MAP_TILE_SIZE.portalRadius;
    ctx.save(); ctx.setLineDash([]); ctx.fillStyle = "rgba(14, 165, 233, 0.18)"; ctx.strokeStyle = "rgba(125, 211, 252, 0.9)"; ctx.lineWidth = 2; ctx.font = "13px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    if (tile.exits.north) { ctx.fillRect(x, y, MAP_TILE_SIZE.width, edge); ctx.strokeRect(x, y, MAP_TILE_SIZE.width, edge); ctx.fillStyle = "rgba(224, 242, 254, 0.95)"; ctx.fillText(portalLabels.north, x + MAP_TILE_SIZE.width / 2, y + edge / 2); ctx.fillStyle = "rgba(14, 165, 233, 0.18)"; }
    if (tile.exits.south) { ctx.fillRect(x, y + MAP_TILE_SIZE.height - edge, MAP_TILE_SIZE.width, edge); ctx.strokeRect(x, y + MAP_TILE_SIZE.height - edge, MAP_TILE_SIZE.width, edge); ctx.fillStyle = "rgba(224, 242, 254, 0.95)"; ctx.fillText(portalLabels.south, x + MAP_TILE_SIZE.width / 2, y + MAP_TILE_SIZE.height - edge / 2); ctx.fillStyle = "rgba(14, 165, 233, 0.18)"; }
    if (tile.exits.west) { ctx.fillRect(x, y, edge, MAP_TILE_SIZE.height); ctx.strokeRect(x, y, edge, MAP_TILE_SIZE.height); ctx.fillStyle = "rgba(224, 242, 254, 0.95)"; ctx.fillText(portalLabels.west, x + edge / 2, y + MAP_TILE_SIZE.height / 2); ctx.fillStyle = "rgba(14, 165, 233, 0.18)"; }
    if (tile.exits.east) { ctx.fillRect(x + MAP_TILE_SIZE.width - edge, y, edge, MAP_TILE_SIZE.height); ctx.strokeRect(x + MAP_TILE_SIZE.width - edge, y, edge, MAP_TILE_SIZE.height); ctx.fillStyle = "rgba(224, 242, 254, 0.95)"; ctx.fillText(portalLabels.east, x + MAP_TILE_SIZE.width - edge / 2, y + MAP_TILE_SIZE.height / 2); }
    ctx.restore();
  }
  private drawBuildingOwnerLabel(ctx: CanvasRenderingContext2D, building: BuildingState, x: number, y: number) {
    const label = getBuildingOwnerLabel(building);
    if (!label) return;
    ctx.save();
    ctx.font = "12px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const width = Math.min(190, Math.max(76, ctx.measureText(label).width + 18));
    ctx.fillStyle = "rgba(15, 23, 42, 0.82)";
    ctx.strokeStyle = "rgba(250, 204, 21, 0.58)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x - width / 2, y - 70, width, 24, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#fde68a";
    ctx.fillText(label, x, y - 58, width - 12);
    ctx.restore();
  }
  private drawBuildParts(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number, viewport: ViewportBounds, isoCamX: number, isoCamY: number) {
    const sortedBuildParts = [...this.getSceneBuildParts()].sort((a, b) => {
      const definitionA = BUILD_PARTS[a.partId];
      const definitionB = BUILD_PARTS[b.partId];
      if (!definitionA || !definitionB) return 0;
      return getBuildPartSortKey(definitionA, a.gridX, a.gridY, a.floorLevel) - getBuildPartSortKey(definitionB, b.gridX, b.gridY, b.floorLevel);
    });
    for (const part of sortedBuildParts) {
      const world = buildGridToWorld(part);
      if (!isPositionInViewport(world, viewport)) continue;
      const activeFloorLevel = this.selectedHouseId ? this.selectedBuildFloorLevel : Math.round(this.localPlayerFloorLevel);
      const visibility = getBuildPartVisibility({ part, selectedHouseId: this.selectedHouseId, activeFloorLevel, mode: "editing" });
      if (visibility.hide) continue;
      ctx.save();
      ctx.globalAlpha *= visibility.alpha;
      this.buildPartRenderer.drawPlacedPart(ctx, part, isoCamX, isoCamY);
      ctx.restore();
      const __demolitionSel = this.demolitionSelectedPartIds.has(part.id);
      if (__demolitionSel || (part.houseId && part.houseId === this.selectedHouseId)) {
        this.buildPartRenderer.drawPlacedPartOutline(ctx, part, isoCamX, isoCamY, {
          alpha: part.id === this.selectedPlacedBuildPartId ? 1 : __demolitionSel ? 0.9 : visibility.outlineAlpha,
          strokeStyle: __demolitionSel ? "rgba(248, 113, 113, 0.98)" : part.id === this.selectedPlacedBuildPartId ? "rgba(250, 204, 21, 0.95)" : "rgba(96, 165, 250, 0.68)",
          lineWidth: __demolitionSel || part.id === this.selectedPlacedBuildPartId ? 3 : 1,
          dashed: !__demolitionSel && part.id !== this.selectedPlacedBuildPartId,
          fillStyle: __demolitionSel ? "rgba(248, 113, 113, 0.08)" : part.id === this.selectedPlacedBuildPartId ? "rgba(250, 204, 21, 0.08)" : undefined,
        });
      }
    }
  }
  private drawBuildings(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number, viewport: ViewportBounds) {
    for (const building of this.getSceneBuildings()) {
      if (!isPositionInViewport(building.position, viewport)) continue;
      const x = building.position.x - cameraX;
      const y = building.position.y - cameraY;
      this.renderer.drawBuilding(ctx, building, x, y);
      this.drawBuildingOwnerLabel(ctx, building, x, y);
      if (building.id === this.hoverBuildingId) { const hover = getBuildingHoverEllipse(building); ctx.save(); ctx.strokeStyle = "rgba(250, 204, 21, 0.9)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y + hover.offsetY, hover.rx, hover.ry, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
    }
  }
  private drawResources(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number, viewport: ViewportBounds) { for (const resource of this.getSceneResources()) if (isPositionInViewport(resource.position, viewport)) this.renderer.drawResource(ctx, resource, resource.position.x - cameraX, resource.position.y - cameraY); }
  private drawCreatures(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number, viewport: ViewportBounds) {
    for (const creature of this.getSceneCreatures()) {
      if (!isPositionInViewport(creature.position, viewport)) continue;
      const x = creature.position.x - cameraX;
      const y = creature.position.y - cameraY;
      this.renderer.drawCreature(ctx, creature, x, y);
      if (creature.id === this.highlightedCreatureId) {
        ctx.save();
        ctx.strokeStyle = "rgba(250, 204, 21, 0.96)";
        ctx.lineWidth = 3;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.ellipse(x, y + 22, 29, 11, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
  }
  private drawPlayers(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number, now: number, viewport: ViewportBounds) {
    if (!this.snapshot) return;
    const currentTile = this.getCurrentTile();
    for (const player of this.snapshot.players) {
      if (!isSameTile(getTileRef(player), currentTile) || !isPositionInViewport(player.position, viewport)) continue;
      const isLocal = player.id === this.localPlayerId;
      const isMoving = this.movingPlayerIds.has(player.id);
      const weaponItemId = isLocal ? this.localEquippedWeaponItemId : null;
      const floorYOffset = this.getPlayerFloorYOffset(player.position, isLocal);
      this.renderer.drawPlayer(ctx, player, player.position.x - cameraX, player.position.y - cameraY - floorYOffset, isLocal, isMoving, now, weaponItemId);
      if (floorYOffset > 2) {
        ctx.save();
        ctx.globalAlpha = 0.24;
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.beginPath();
        ctx.ellipse(player.position.x - cameraX, player.position.y - cameraY + 22, 20, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }
  private drawBuildFloorDebug(ctx: CanvasRenderingContext2D) {
    if (this.localPlayerFloorLevel <= 0 && !this.localPlayerBuildCollisionReason) return;
    ctx.save();
    ctx.font = "11px system-ui";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    const label = `층 ${this.localPlayerFloorLevel.toFixed(1)}${this.localPlayerBuildCollisionReason ? ` · 충돌:${this.localPlayerBuildCollisionReason}` : ""}`;
    ctx.fillStyle = "rgba(15, 23, 42, 0.76)";
    ctx.strokeStyle = "rgba(125, 211, 252, 0.45)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(12, 88, Math.max(92, ctx.measureText(label).width + 18), 24, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#bfdbfe";
    ctx.fillText(label, 21, 94);
    ctx.restore();
  }

  private drawPlacementPreview(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {
    if (!this.placementPreviewBuildingType || !this.pointerWorldPosition) return;
    const validity = this.getPlacementValidity(this.pointerWorldPosition);
    const previewBuilding: BuildingState = { id: "placement-preview", type: this.placementPreviewBuildingType, ownerPlayerId: this.localPlayerId ?? "preview", position: this.pointerWorldPosition, hp: 1, maxHp: 1 };
    const x = this.pointerWorldPosition.x - cameraX;
    const y = this.pointerWorldPosition.y - cameraY;
    const accent = validity.ok ? "34, 197, 94" : "239, 68, 68";
    ctx.save(); ctx.globalAlpha = validity.ok ? 0.5 : 0.34; this.renderer.drawBuilding(ctx, previewBuilding, x, y); ctx.restore();
    const hover = getBuildingHoverEllipse(previewBuilding);
    ctx.save(); ctx.strokeStyle = `rgba(${accent}, 0.9)`; ctx.fillStyle = `rgba(${accent}, 0.16)`; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.ellipse(x, y + hover.offsetY, hover.rx, hover.ry, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore();
    ctx.save(); ctx.fillStyle = "rgba(15, 23, 42, 0.86)"; ctx.strokeStyle = `rgba(${accent}, 0.82)`; ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect(x - 98, y - 70, 196, 32, 8); ctx.fill(); ctx.stroke(); ctx.fillStyle = validity.ok ? "#bbf7d0" : "#fecaca"; ctx.font = "12px system-ui"; ctx.textAlign = "center"; ctx.fillText(validity.reason, x, y - 50); ctx.restore();
  }
  private drawBuildPartPreview(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number, isoCamX: number, isoCamY: number) {
    const movingSelected = this.getSelectedPlacedBuildPart();
    if (movingSelected && this.buildPartDragPosition) {
      const grid = worldToBuildGrid(this.buildPartDragPosition);
      const isoPos = buildGridToIsoCenter(grid.gridX, grid.gridY);
      const snapped = buildGridToWorld(grid);
      const validity = this.getBuildPartPlacementValidity(snapped, movingSelected.id);
      this.buildPartRenderer.drawPreview(ctx, movingSelected.partId, isoPos.x - isoCamX, isoPos.y - isoCamY, movingSelected.rotation, validity.ok, 0.55, movingSelected.floorLevel);
      return;
    }
    if (!this.selectedBuildPartId || !this.pointerWorldPosition) return;
    const previewPosition = this.buildPartDragPosition ?? this.pointerWorldPosition;
    const grid = worldToBuildGrid(previewPosition);
    const isoPos = buildGridToIsoCenter(grid.gridX, grid.gridY);
    const snapped = buildGridToWorld(grid);
    const validity = this.getBuildPartPlacementValidity(snapped);
    this.buildPartRenderer.drawPreview(ctx, this.selectedBuildPartId, isoPos.x - isoCamX, isoPos.y - isoCamY, this.selectedBuildPartRotation, validity.ok, this.buildPartDragPointerId !== null ? 0.52 : 0.42, this.selectedBuildFloorLevel);
  }
  private drawDemolitionSelectionRect(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {
    if (!this.demolitionMode || !this.demolitionDragStart || !this.demolitionDragCurrent) return;
    const left = Math.min(this.demolitionDragStart.x, this.demolitionDragCurrent.x) - cameraX;
    const top = Math.min(this.demolitionDragStart.y, this.demolitionDragCurrent.y) - cameraY;
    const width = Math.abs(this.demolitionDragCurrent.x - this.demolitionDragStart.x);
    const height = Math.abs(this.demolitionDragCurrent.y - this.demolitionDragStart.y);
    ctx.save();
    ctx.fillStyle = "rgba(248, 113, 113, 0.12)";
    ctx.strokeStyle = "rgba(248, 113, 113, 0.92)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.fillRect(left, top, width, height);
    ctx.strokeRect(left, top, width, height);
    ctx.restore();
  }

  private drawInteractionHint(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {
    if (this.placementPreviewBuildingType || this.selectedBuildPartId) return;
    const nearestId = this.getNearestInteractableId();
    const target = this.getSceneResources().find((resource) => resource.id === nearestId);
    if (!target) return;
    const x = target.position.x - cameraX;
    const y = target.position.y - cameraY;
    ctx.strokeStyle = "#facc15"; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(x - 23, y - 23, 46, 46, 12); ctx.stroke(); ctx.fillStyle = "rgba(15, 23, 42, 0.82)"; ctx.beginPath(); ctx.roundRect(x - 55, y - 56, 110, 24, 8); ctx.fill(); ctx.fillStyle = "#ffffff"; ctx.font = "12px system-ui"; ctx.textAlign = "center"; ctx.fillText("E / 상호작용", x, y - 39);
  }
}

export function GameScene({ onReady, onInputChange, onInteract, onWorldClick, placementBuildingType, highlightedCreatureId, selectedBuildPartId, selectedBuildPartRotation = 0, selectedBuildFloorLevel = 0, demolitionMode = false }: { onReady: (scene: GameWorldScene) => void; onInputChange: (input: GameSceneInput) => void; onInteract: () => void; onWorldClick: (target: WorldClickTarget) => void; placementBuildingType?: BuildingType | null; highlightedCreatureId?: string | null; selectedBuildPartId?: BuildPartId | null; selectedBuildPartRotation?: BuildPartRotation; selectedBuildFloorLevel?: BuildFloorLevel; demolitionMode?: boolean }) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<GameWorldScene | null>(null);
  useEffect(() => {
    if (!rootRef.current) return;
    const scene = new GameWorldScene(rootRef.current, onInputChange, onInteract, onWorldClick);
    sceneRef.current = scene;
    onReady(scene);
    return () => { scene.destroy(); sceneRef.current = null; };
  }, [onInputChange, onInteract, onWorldClick, onReady]);
  useEffect(() => { sceneRef.current?.setPlacementPreviewBuildingType(placementBuildingType ?? null); }, [placementBuildingType]);
  useEffect(() => { sceneRef.current?.setHighlightedCreatureId(highlightedCreatureId ?? null); }, [highlightedCreatureId]);
  useEffect(() => { sceneRef.current?.setBuildPartPlacement(demolitionMode ? null : selectedBuildPartId ?? null, selectedBuildPartRotation, selectedBuildFloorLevel); }, [demolitionMode, selectedBuildPartId, selectedBuildPartRotation, selectedBuildFloorLevel]);
  useEffect(() => { sceneRef.current?.setBuildDemolitionMode(demolitionMode); }, [demolitionMode]);
  return <div ref={rootRef} className="game-canvas-root" aria-label="Game canvas" />;
}
