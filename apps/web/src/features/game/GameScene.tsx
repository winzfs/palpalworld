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
  private keys = new Set<string>();
  private animationFrame = 0;
  private snapshot: WorldSnapshot | null = null;
  private remoteBuildings: SharedBuildingState[] = [];
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
      this.previousPlayerPositions.set(player.id, { ...player.position });
    }

    const damagedCreature = normalizedSnapshot.creatures.find((creature) => {
      const previousHp = this.previousCreatureHpById.get(creature.id);
      return previousHp !== undefined && creature.hp > 0 && creature.hp < previousHp;
    });
    if (damagedCreature) this.highlightedCreatureId = damagedCreature.id;

    if (this.highlightedCreatureId && !normalizedSnapshot.creatures.some((creature) => creature.id === this.highlightedCreatureId && creature.hp > 0)) {
      this.highlightedCreatureId = null;
    }
    this.previousCreatureHpById = new Map(normalizedSnapshot.creatures.map((creature) => [creature.id, creature.hp]));
    this.snapshot = normalizedSnapshot;
    this.localPlayerId = localPlayerId;
    this.localEquippedWeaponItemId = readStoredWeaponItemId();
    window.dispatchEvent(new CustomEvent("palpalworld:world_snapshot", { detail: { snapshot: normalizedSnapshot, localPlayerId } }));
  }

  setPlacementPreviewBuildingType(buildingType: BuildingType | null) {
    this.placementPreviewBuildingType = buildingType;
    this.placementDragStart = null;
    this.placementPointerId = null;
    this.canvas.style.cursor = buildingType ? "crosshair" : "default";
  }
  setHighlightedCreatureId(creatureId: string | null) { this.highlightedCreatureId = creatureId; }
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
    if (this.hoverBuildingId === buildingId) this.hoverBuildingId = null;
  };
  private handleRemoteBuildings = (event: RemoteBuildingsEvent) => {
    const localIds = new Set((this.snapshot?.buildings ?? []).map((building) => building.id));
    this.remoteBuildings = (event.detail?.buildings ?? []).filter((building) => {
      if (!building?.id || this.hiddenBuildingIds.has(building.id)) return false;
      if (localIds.has(building.id)) return false;
      return isSameTile(getTileRef(building), this.getCurrentTile());
    });
  };
  private getLocalPlayer() { return this.snapshot?.players.find((player) => player.id === this.localPlayerId) ?? this.snapshot?.players[0] ?? null; }
  private getCurrentTile() { return getTileRef(this.getLocalPlayer()); }
  private getSceneResources() { return this.snapshot?.resources ?? []; }
  private getSceneCreatures() { return this.snapshot?.creatures ?? []; }
  private getSceneBuildings() {
    const localBuildings = (this.snapshot?.buildings ?? []).filter((building) => !this.hiddenBuildingIds.has(building.id));
    const localIds = new Set(localBuildings.map((building) => building.id));
    const remoteBuildings = this.remoteBuildings.filter((building) => !localIds.has(building.id) && !this.hiddenBuildingIds.has(building.id));
    return [...localBuildings, ...remoteBuildings];
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
  private getCreatureAt(position: Vector2) { let nearest: CreaturePublicState | null = null; let nearestDistance = Number.POSITIVE_INFINITY; for (const creature of this.getSceneCreatures()) { if (creature.hp <= 0) continue; const hitDistance = distance(creature.position, position); if (hitDistance <= 46 && hitDistance < nearestDistance) { nearest = creature; nearestDistance = hitDistance; } } return nearest; }
  private getCameraOffset() { const rect = this.root.getBoundingClientRect(); const localPlayer = this.getLocalPlayer(); const target = localPlayer?.position ?? { x: rect.width / 2, y: rect.height / 2 }; return { x: Math.max(0, Math.min(Math.max(0, MAP_TILE_SIZE.width - rect.width), target.x - rect.width / 2)), y: Math.max(0, Math.min(Math.max(0, MAP_TILE_SIZE.height - rect.height), target.y - rect.height / 2)) }; }
  private getViewportBounds(cameraX: number, cameraY: number): ViewportBounds { const rect = this.root.getBoundingClientRect(); return { left: cameraX, top: cameraY, right: cameraX + rect.width, bottom: cameraY + rect.height }; }
  private screenToWorld(clientX: number, clientY: number): Vector2 { const rect = this.canvas.getBoundingClientRect(); const camera = this.getCameraOffset(); return clampPositionToTile({ x: clientX - rect.left + camera.x, y: clientY - rect.top + camera.y }); }
  private resize = () => { const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2)); const rect = this.root.getBoundingClientRect(); this.canvas.width = Math.floor(rect.width * dpr); this.canvas.height = Math.floor(rect.height * dpr); this.context.setTransform(dpr, 0, 0, dpr, 0, 0); this.context.imageSmoothingEnabled = false; };
  private emitPrimaryTap() { this.onInputChange({ x: 0, y: 0, primary: true, secondary: false }); window.setTimeout(() => this.onInputChange({ x: 0, y: 0, primary: false, secondary: false }), 90); }
  private commitPlacement(position: Vector2) { this.onWorldClick({ kind: "field", position, validity: this.getPlacementValidity(position) }); }
  private handlePointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    const position = this.screenToWorld(event.clientX, event.clientY);
    this.pointerWorldPosition = position;
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
    this.hoverCreatureId = this.placementPreviewBuildingType ? null : this.getCreatureAt(position)?.id ?? null;
    this.hoverBuildingId = this.placementPreviewBuildingType || this.hoverCreatureId ? null : this.getBuildingAt(position)?.id ?? null;
    if (!this.placementPreviewBuildingType) this.canvas.style.cursor = this.hoverCreatureId || this.hoverBuildingId ? "pointer" : "default";
  };
  private handlePointerUp = (event: PointerEvent) => {
    if (!this.placementPreviewBuildingType || this.placementPointerId !== event.pointerId) return;
    const position = this.screenToWorld(event.clientX, event.clientY);
    this.pointerWorldPosition = position;
    this.placementDragStart = null;
    this.placementPointerId = null;
    this.canvas.releasePointerCapture(event.pointerId);
    this.commitPlacement(position);
  };
  private handlePointerCancel = (event: PointerEvent) => {
    if (this.placementPointerId === event.pointerId) {
      this.placementDragStart = null;
      this.placementPointerId = null;
    }
  };
  private handlePointerLeave = () => { this.hoverBuildingId = null; this.hoverCreatureId = null; if (!this.placementPreviewBuildingType) { this.pointerWorldPosition = null; this.canvas.style.cursor = "default"; } };
  private handleKeyDown = (event: KeyboardEvent) => { const key = event.key.toLowerCase(); if (key === "e" && !this.keys.has(key)) this.onInteract(); this.keys.add(key); this.emitKeyboardInput(); };
  private handleKeyUp = (event: KeyboardEvent) => { this.keys.delete(event.key.toLowerCase()); this.emitKeyboardInput(); };
  private emitKeyboardInput() { const left = this.keys.has("a") || this.keys.has("arrowleft"); const right = this.keys.has("d") || this.keys.has("arrowright"); const up = this.keys.has("w") || this.keys.has("arrowup"); const down = this.keys.has("s") || this.keys.has("arrowdown"); this.onInputChange({ x: Number(right) - Number(left), y: Number(down) - Number(up), primary: this.keys.has(" "), secondary: this.keys.has("e") }); }
  private loop = () => { this.draw(); this.animationFrame = requestAnimationFrame(this.loop); };
  private draw() {
    const rect = this.root.getBoundingClientRect();
    const ctx = this.context;
    ctx.clearRect(0, 0, rect.width, rect.height);
    const camera = this.getCameraOffset();
    const viewport = this.getViewportBounds(camera.x, camera.y);
    const now = performance.now();
    this.tileMapRenderer.draw(ctx, rect.width, rect.height, camera.x, camera.y);
    this.drawMapBoundaryAndPortals(ctx, camera.x, camera.y);
    this.drawBuildings(ctx, camera.x, camera.y, viewport);
    this.drawResources(ctx, camera.x, camera.y, viewport);
    this.drawCreatures(ctx, camera.x, camera.y, viewport);
    this.drawPlayers(ctx, camera.x, camera.y, now, viewport);
    this.drawInteractionHint(ctx, camera.x, camera.y);
    this.drawPlacementPreview(ctx, camera.x, camera.y);
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
      this.renderer.drawPlayer(ctx, player, player.position.x - cameraX, player.position.y - cameraY, isLocal, isMoving, now, weaponItemId);
    }
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
  private drawInteractionHint(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {
    if (this.placementPreviewBuildingType) return;
    const nearestId = this.getNearestInteractableId();
    const target = this.getSceneResources().find((resource) => resource.id === nearestId);
    if (!target) return;
    const x = target.position.x - cameraX;
    const y = target.position.y - cameraY;
    ctx.strokeStyle = "#facc15"; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(x - 23, y - 23, 46, 46, 12); ctx.stroke(); ctx.fillStyle = "rgba(15, 23, 42, 0.82)"; ctx.beginPath(); ctx.roundRect(x - 55, y - 56, 110, 24, 8); ctx.fill(); ctx.fillStyle = "#ffffff"; ctx.font = "12px system-ui"; ctx.textAlign = "center"; ctx.fillText("E / 상호작용", x, y - 39);
  }
}

export function GameScene({ onReady, onInputChange, onInteract, onWorldClick, placementBuildingType, highlightedCreatureId }: { onReady: (scene: GameWorldScene) => void; onInputChange: (input: GameSceneInput) => void; onInteract: () => void; onWorldClick: (target: WorldClickTarget) => void; placementBuildingType?: BuildingType | null; highlightedCreatureId?: string | null }) {
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
  return <div ref={rootRef} className="game-canvas-root" aria-label="Game canvas" />;
}
