"use client";

import { useEffect, useRef } from "react";
import {
  WORLD,
  type BuildingState,
  type BuildingType,
  type EntityId,
  type ResourceNodeState,
  type Vector2,
  type WorldSnapshot,
} from "@palpalworld/shared";
import { MAP_TILE_SIZE, clampPositionToTile, getMapTile, getPortalPosition, type MapDirection } from "../../../../../packages/shared/src/worldTiles";
import { SpriteRenderer } from "../rendering/SpriteRenderer";
import { TileMapRenderer } from "../rendering/TileMapRenderer";

export type GameSceneInput = {
  x: number;
  y: number;
  primary: boolean;
  secondary: boolean;
};

export type PlacementValidity = {
  ok: boolean;
  reason: string;
};

export type WorldClickTarget =
  | { kind: "field"; position: Vector2; validity: PlacementValidity }
  | { kind: "building"; building: BuildingState };

function distance(a: Vector2, b: Vector2) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function normalizeSnapshotToCurrentTile(snapshot: WorldSnapshot): WorldSnapshot {
  for (const player of snapshot.players) player.position = clampPositionToTile(player.position);
  for (const resource of snapshot.resources) resource.position = clampPositionToTile(resource.position);
  for (const creature of snapshot.creatures) creature.position = clampPositionToTile(creature.position);
  for (const building of snapshot.buildings) building.position = clampPositionToTile(building.position);
  return snapshot;
}

const portalLabels: Record<MapDirection, string> = {
  north: "북쪽 포탈",
  south: "남쪽 포탈",
  west: "서쪽 포탈",
  east: "동쪽 포탈",
};

export class GameWorldScene {
  private root: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private renderer = new SpriteRenderer();
  private tileMapRenderer = new TileMapRenderer();
  private keys = new Set<string>();
  private animationFrame = 0;
  private snapshot: WorldSnapshot | null = null;
  private previousPlayerPositions = new Map<string, Vector2>();
  private movingPlayerIds = new Set<string>();
  private localPlayerId: string | null = null;
  private pointerWorldPosition: Vector2 | null = null;
  private hoverBuildingId: string | null = null;
  private placementPreviewBuildingType: BuildingType | null = null;
  private onInputChange: (input: GameSceneInput) => void;
  private onInteract: () => void;
  private onWorldClick: (target: WorldClickTarget) => void;

  constructor(
    root: HTMLDivElement,
    onInputChange: (input: GameSceneInput) => void,
    onInteract: () => void,
    onWorldClick: (target: WorldClickTarget) => void,
  ) {
    this.root = root;
    this.onInputChange = onInputChange;
    this.onInteract = onInteract;
    this.onWorldClick = onWorldClick;
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
    this.canvas.addEventListener("pointerdown", this.handlePointerDown);
    this.canvas.addEventListener("pointermove", this.handlePointerMove);
    this.canvas.addEventListener("pointerleave", this.handlePointerLeave);
    this.resize();
    this.loop();
  }

  destroy() {
    cancelAnimationFrame(this.animationFrame);
    window.removeEventListener("resize", this.resize);
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    this.canvas.removeEventListener("pointerdown", this.handlePointerDown);
    this.canvas.removeEventListener("pointermove", this.handlePointerMove);
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

    this.snapshot = normalizedSnapshot;
    this.localPlayerId = localPlayerId;
    window.dispatchEvent(new CustomEvent("palpalworld:world_snapshot", { detail: { snapshot: normalizedSnapshot, localPlayerId } }));
  }

  setPlacementPreviewBuildingType(buildingType: BuildingType | null) {
    this.placementPreviewBuildingType = buildingType;
    this.canvas.style.cursor = buildingType ? "none" : "default";
  }

  getNearestInteractableId(): EntityId | null {
    const localPlayer = this.getLocalPlayerPosition();
    if (!localPlayer || !this.snapshot) return null;

    let nearest: ResourceNodeState | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const resource of this.snapshot.resources) {
      const distance = Math.hypot(resource.position.x - localPlayer.x, resource.position.y - localPlayer.y);
      if (distance > WORLD.interactRange || distance >= nearestDistance) continue;
      nearest = resource;
      nearestDistance = distance;
    }

    return nearest?.id ?? null;
  }

  getLocalPlayerPosition() {
    return this.getLocalPlayer()?.position ?? null;
  }

  private getLocalPlayer() {
    return this.snapshot?.players.find((player) => player.id === this.localPlayerId) ?? this.snapshot?.players[0] ?? null;
  }

  getPlacementValidity(position: Vector2): PlacementValidity {
    if (!this.placementPreviewBuildingType) return { ok: true, reason: "설치 모드가 아닙니다." };

    const localPlayer = this.getLocalPlayerPosition();
    if (!localPlayer) return { ok: false, reason: "플레이어 위치를 찾을 수 없습니다." };

    if (position.x < 0 || position.x > MAP_TILE_SIZE.width || position.y < 0 || position.y > MAP_TILE_SIZE.height) {
      return { ok: false, reason: "타일 밖에는 설치할 수 없습니다." };
    }

    if (distance(localPlayer, position) > WORLD.buildRange) {
      return { ok: false, reason: "너무 멀리 설치할 수 없습니다." };
    }

    for (const building of this.snapshot?.buildings ?? []) {
      if (distance(building.position, position) < WORLD.tileSize) {
        return { ok: false, reason: "이미 다른 건물이 있는 위치입니다." };
      }
    }

    return { ok: true, reason: "설치 가능" };
  }

  private getBuildingAt(position: Vector2) {
    if (!this.snapshot) return null;
    let nearest: BuildingState | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const building of this.snapshot.buildings) {
      const hitDistance = distance(building.position, position);
      if (hitDistance <= 42 && hitDistance < nearestDistance) {
        nearest = building;
        nearestDistance = hitDistance;
      }
    }

    return nearest;
  }

  private getCameraOffset() {
    const rect = this.root.getBoundingClientRect();
    const localPlayer = this.getLocalPlayer();
    const target = localPlayer?.position ?? { x: rect.width / 2, y: rect.height / 2 };
    return {
      x: Math.max(0, Math.min(Math.max(0, MAP_TILE_SIZE.width - rect.width), target.x - rect.width / 2)),
      y: Math.max(0, Math.min(Math.max(0, MAP_TILE_SIZE.height - rect.height), target.y - rect.height / 2)),
    };
  }

  private screenToWorld(clientX: number, clientY: number): Vector2 {
    const rect = this.canvas.getBoundingClientRect();
    const camera = this.getCameraOffset();
    return clampPositionToTile({
      x: clientX - rect.left + camera.x,
      y: clientY - rect.top + camera.y,
    });
  }

  private resize = () => {
    const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    const rect = this.root.getBoundingClientRect();
    this.canvas.width = Math.floor(rect.width * dpr);
    this.canvas.height = Math.floor(rect.height * dpr);
    this.context.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.context.imageSmoothingEnabled = false;
  };

  private handlePointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    const position = this.screenToWorld(event.clientX, event.clientY);
    this.pointerWorldPosition = position;

    if (!this.placementPreviewBuildingType) {
      const building = this.getBuildingAt(position);
      if (building) {
        this.onWorldClick({ kind: "building", building });
        return;
      }
    }

    this.onWorldClick({ kind: "field", position, validity: this.getPlacementValidity(position) });
  };

  private handlePointerMove = (event: PointerEvent) => {
    const position = this.screenToWorld(event.clientX, event.clientY);
    this.pointerWorldPosition = position;
    this.hoverBuildingId = this.placementPreviewBuildingType ? null : this.getBuildingAt(position)?.id ?? null;
    if (!this.placementPreviewBuildingType) this.canvas.style.cursor = this.hoverBuildingId ? "pointer" : "default";
  };

  private handlePointerLeave = () => {
    this.pointerWorldPosition = null;
    this.hoverBuildingId = null;
    if (!this.placementPreviewBuildingType) this.canvas.style.cursor = "default";
  };

  private handleKeyDown = (event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    if (key === "e" && !this.keys.has(key)) {
      this.onInteract();
    }
    this.keys.add(key);
    this.emitKeyboardInput();
  };

  private handleKeyUp = (event: KeyboardEvent) => {
    this.keys.delete(event.key.toLowerCase());
    this.emitKeyboardInput();
  };

  private emitKeyboardInput() {
    const left = this.keys.has("a") || this.keys.has("arrowleft");
    const right = this.keys.has("d") || this.keys.has("arrowright");
    const up = this.keys.has("w") || this.keys.has("arrowup");
    const down = this.keys.has("s") || this.keys.has("arrowdown");
    const localPlayer = this.getLocalPlayerPosition();
    let x = Number(right) - Number(left);
    let y = Number(down) - Number(up);

    if (localPlayer) {
      if (localPlayer.x <= 0 && x < 0) x = 0;
      if (localPlayer.x >= MAP_TILE_SIZE.width && x > 0) x = 0;
      if (localPlayer.y <= 0 && y < 0) y = 0;
      if (localPlayer.y >= MAP_TILE_SIZE.height && y > 0) y = 0;
    }

    this.onInputChange({
      x,
      y,
      primary: this.keys.has(" "),
      secondary: this.keys.has("e"),
    });
  }

  private loop = () => {
    this.draw();
    this.animationFrame = requestAnimationFrame(this.loop);
  };

  private draw() {
    const rect = this.root.getBoundingClientRect();
    const ctx = this.context;
    ctx.clearRect(0, 0, rect.width, rect.height);

    const camera = this.getCameraOffset();
    const now = performance.now();

    this.tileMapRenderer.draw(ctx, rect.width, rect.height, camera.x, camera.y);
    this.drawMapBoundaryAndPortals(ctx, camera.x, camera.y);
    this.drawBuildings(ctx, camera.x, camera.y);
    this.drawResources(ctx, camera.x, camera.y);
    this.drawCreatures(ctx, camera.x, camera.y);
    this.drawPlayers(ctx, camera.x, camera.y, now);
    this.drawInteractionHint(ctx, camera.x, camera.y);
    this.drawPlacementPreview(ctx, camera.x, camera.y);
  }

  private drawMapBoundaryAndPortals(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {
    const localPlayer = this.getLocalPlayer();
    const currentTile = (localPlayer as any)?.currentTile;
    const tile = getMapTile(currentTile);

    const x = -cameraX;
    const y = -cameraY;
    ctx.save();
    ctx.strokeStyle = "rgba(125, 211, 252, 0.42)";
    ctx.lineWidth = 4;
    ctx.setLineDash([12, 8]);
    ctx.strokeRect(x, y, MAP_TILE_SIZE.width, MAP_TILE_SIZE.height);
    ctx.restore();

    if (!tile) return;

    for (const direction of ["north", "south", "west", "east"] as MapDirection[]) {
      if (!tile.exits[direction]) continue;
      const portal = getPortalPosition(direction);
      const px = portal.x - cameraX;
      const py = portal.y - cameraY;

      ctx.save();
      ctx.fillStyle = "rgba(14, 165, 233, 0.18)";
      ctx.strokeStyle = "rgba(125, 211, 252, 0.95)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(px, py, MAP_TILE_SIZE.portalRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "rgba(224, 242, 254, 0.95)";
      ctx.font = "13px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(portalLabels[direction], px, py);
      ctx.restore();
    }
  }

  private drawBuildings(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {
    if (!this.snapshot) return;
    for (const building of this.snapshot.buildings) {
      const x = building.position.x - cameraX;
      const y = building.position.y - cameraY;
      this.renderer.drawBuilding(ctx, building, x, y);
      if (building.id === this.hoverBuildingId) {
        ctx.save();
        ctx.strokeStyle = "rgba(250, 204, 21, 0.9)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(x, y + 24, 32, 12, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  private drawResources(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {
    if (!this.snapshot) return;
    for (const resource of this.snapshot.resources) {
      this.renderer.drawResource(ctx, resource, resource.position.x - cameraX, resource.position.y - cameraY);
    }
  }

  private drawCreatures(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {
    if (!this.snapshot) return;
    for (const creature of this.snapshot.creatures) {
      this.renderer.drawCreature(ctx, creature, creature.position.x - cameraX, creature.position.y - cameraY);
    }
  }

  private drawPlayers(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number, now: number) {
    if (!this.snapshot) return;
    for (const player of this.snapshot.players) {
      const isLocal = player.id === this.localPlayerId;
      const isMoving = this.movingPlayerIds.has(player.id);
      this.renderer.drawPlayer(ctx, player, player.position.x - cameraX, player.position.y - cameraY, isLocal, isMoving, now);
    }
  }

  private drawPlacementPreview(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {
    if (!this.placementPreviewBuildingType || !this.pointerWorldPosition) return;

    const validity = this.getPlacementValidity(this.pointerWorldPosition);
    const previewBuilding: BuildingState = {
      id: "placement-preview",
      type: this.placementPreviewBuildingType,
      ownerPlayerId: this.localPlayerId ?? "preview",
      position: this.pointerWorldPosition,
      hp: 1,
      maxHp: 1,
    };

    const x = this.pointerWorldPosition.x - cameraX;
    const y = this.pointerWorldPosition.y - cameraY;
    const accent = validity.ok ? "34, 197, 94" : "239, 68, 68";

    ctx.save();
    ctx.globalAlpha = validity.ok ? 0.5 : 0.34;
    this.renderer.drawBuilding(ctx, previewBuilding, x, y);
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = `rgba(${accent}, 0.9)`;
    ctx.fillStyle = `rgba(${accent}, 0.16)`;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.ellipse(x, y + 24, 30, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = "rgba(15, 23, 42, 0.86)";
    ctx.strokeStyle = `rgba(${accent}, 0.82)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x - 82, y - 64, 164, 26, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = validity.ok ? "#bbf7d0" : "#fecaca";
    ctx.font = "12px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(validity.reason, x, y - 46);
    ctx.restore();
  }

  private drawInteractionHint(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {
    if (this.placementPreviewBuildingType) return;
    const nearestId = this.getNearestInteractableId();
    const target = this.snapshot?.resources.find((resource) => resource.id === nearestId);
    if (!target) return;

    const x = target.position.x - cameraX;
    const y = target.position.y - cameraY;
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(x - 23, y - 23, 46, 46, 12);
    ctx.stroke();

    ctx.fillStyle = "rgba(15, 23, 42, 0.82)";
    ctx.beginPath();
    ctx.roundRect(x - 55, y - 56, 110, 24, 8);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "12px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("E / 상호작용", x, y - 39);
  }
}

export function GameScene({
  onReady,
  onInputChange,
  onInteract,
  onWorldClick,
  placementBuildingType,
}: {
  onReady: (scene: GameWorldScene) => void;
  onInputChange: (input: GameSceneInput) => void;
  onInteract: () => void;
  onWorldClick: (target: WorldClickTarget) => void;
  placementBuildingType?: BuildingType | null;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<GameWorldScene | null>(null);

  useEffect(() => {
    if (!rootRef.current) return;
    const scene = new GameWorldScene(rootRef.current, onInputChange, onInteract, onWorldClick);
    sceneRef.current = scene;
    onReady(scene);
    return () => {
      scene.destroy();
      sceneRef.current = null;
    };
  }, [onInputChange, onInteract, onWorldClick, onReady]);

  useEffect(() => {
    sceneRef.current?.setPlacementPreviewBuildingType(placementBuildingType ?? null);
  }, [placementBuildingType]);

  return <div ref={rootRef} className="game-canvas-root" aria-label="Game canvas" />;
}
