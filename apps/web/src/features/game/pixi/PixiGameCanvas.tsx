"use client";

import type { BuildingState, CreaturePublicState, Direction, PlayerPublicState, ResourceNodeState, WorldSnapshot } from "@palpalworld/shared";
import { useEffect, useRef } from "react";
import { createPixiCamera, resizePixiCamera, centerPixiCameraOn } from "./PixiCamera";
import { BUILD_GRID_SIZE } from "../../buildings/buildGrid";
import { BUILD_PARTS, type BuildPartId, type BuildPartRotation, type BuildFloorLevel, type PlacedBuildPart } from "../../buildings/buildPartCatalog";
import { buildGridToIsoCenter, getIsoTilePolygon2p5d, getIsoWallPlane2p5d } from "../../buildings/buildProjection2p5d";
import { BUILD_2P5D_FLOOR_HEIGHT, getMaterialPalette } from "../../buildings/buildPartVisual2p5d";
import { createPixiGameLayers, type PixiContainer } from "./PixiLayers";

declare global {
  interface Window {
    PIXI?: {
      Application: new () => {
        init: (options: Record<string, unknown>) => Promise<void>;
        canvas: HTMLCanvasElement;
        stage: { addChild: (...children: unknown[]) => void };
        ticker: { add: (callback: () => void) => void };
        destroy: (removeView?: boolean, options?: { children?: boolean }) => void;
      };
      Container: new () => PixiContainer;
      Texture: { from: (source: HTMLCanvasElement) => { source?: { update?: () => void }; update?: () => void; destroy?: (destroySource?: boolean) => void } };
      Sprite: new (texture: { source?: { update?: () => void }; update?: () => void; destroy?: (destroySource?: boolean) => void }) => PixiContainer & { texture: { source?: { update?: () => void }; update?: () => void; destroy?: (destroySource?: boolean) => void }; width: number; height: number; alpha: number; destroy?: (options?: { children?: boolean }) => void };
      Graphics: new () => {
        clear: () => void;
        moveTo: (x: number, y: number) => void;
        lineTo: (x: number, y: number) => void;
        stroke: (options: { width: number; color: number; alpha?: number }) => void;
        rect: (x: number, y: number, width: number, height: number) => void;
        roundRect: (x: number, y: number, width: number, height: number, radius: number) => void;
        ellipse: (x: number, y: number, halfWidth: number, halfHeight: number) => void;
        circle: (x: number, y: number, radius: number) => void;
        fill: (options: { color: number; alpha?: number }) => void;
        destroy?: () => void;
      };
    };
  }
}

type RemotePlayersEvent = CustomEvent<{ players?: PlayerPublicState[] }>;
type PixiGraphics = InstanceType<NonNullable<Window["PIXI"]>["Graphics"]>;
type PixiTransformNode = { position: { set: (x: number, y: number) => void }; scale: { set: (value: number) => void } };
type SmoothedRemotePlayer = { player: PlayerPublicState; x: number; y: number; lastSeenAt: number };
type DrawablePlayer = { player: PlayerPublicState; isLocal: boolean };
type PixiPlayerNode = { container: PixiContainer; graphics: PixiGraphics; lastSeenFrame: number };
type PixiCreatureNode = { container: PixiContainer; graphics: PixiGraphics; lastSeenFrame: number };
type PixiResourceNode = { container: PixiContainer; graphics: PixiGraphics; lastSeenFrame: number };
type PixiHitEffect = { id: string; x: number; y: number; damage: number; createdAt: number; durationMs: number };
type PixiHitEffectNode = { container: PixiContainer; graphics: PixiGraphics; lastSeenFrame: number };
type PixiBuildingNode = { container: PixiContainer; graphics: PixiGraphics; lastSeenFrame: number };
type PixiTerrainNode = { container: PixiContainer; graphics: PixiGraphics; lastSeenFrame: number };
type PixiBuildPartNode = { container: PixiContainer; graphics: PixiGraphics; lastSeenFrame: number };
type PixiBuildPartPreview = { partId: BuildPartId; position: { x: number; y: number }; gridX?: number; gridY?: number; rotation: BuildPartRotation; floorLevel: BuildFloorLevel; valid: boolean };
type PixiBuildPartsState = { parts: PlacedBuildPart[]; selectedPartId?: string | null; selectedHouseId?: string | null; preview?: PixiBuildPartPreview | null };
type PixiBuildPartsEvent = CustomEvent<PixiBuildPartsState>;
type SharedPixiBuildingState = BuildingState & { currentTile?: unknown; ownerNickname?: string; isRemoteSharedBuilding?: boolean };
type RemoteBuildingsEvent = CustomEvent<{ buildings?: SharedPixiBuildingState[] }>;
type PixiFeedbackState = { interactablePosition?: { x: number; y: number } | null; highlightedCreatureId?: string | null; placementPreview?: { position: { x: number; y: number }; ok: boolean } | null };
type PixiFeedbackEvent = CustomEvent<PixiFeedbackState>; 

export type PixiGameCanvasProps = {
  enabled?: boolean;
  snapshot: WorldSnapshot | null;
  localPlayerId: string;
};

const remoteLerpFactor = 0.22;
const remoteSnapDistance = 420;
const remoteStaleMs = 3500;
const terrainTileSize = 32;
const terrainPaddingTiles = 3;
let pixiLoaderPromise: Promise<NonNullable<Window["PIXI"]>> | null = null;

async function hashTerrainTile(x: number, y: number) {
  let value = x * 374761393 + y * 668265263;
  value = (value ^ (value >> 13)) * 1274126177;
  return (value ^ (value >> 16)) >>> 0;
}

function samplePixiTerrainTile(worldTileX: number, worldTileY: number) {
  const riverCenter = Math.sin(worldTileY * 0.11) * 9 + Math.cos(worldTileY * 0.035) * 5;
  const riverDistance = Math.abs(worldTileX - riverCenter);
  if (riverDistance < 2.2) return "water";
  if (riverDistance < 3.2) return "dirt";
  const dirtPath = Math.abs(worldTileY - Math.sin(worldTileX * 0.12) * 6 - 7);
  if (dirtPath < 1.2 && worldTileX > -18 && worldTileX < 42) return "dirt";
  const roll = hashTerrainTile(worldTileX, worldTileY) % 100;
  if (roll < 8) return "grass_dark";
  if (roll < 15) return "grass_light";
  if (roll < 20) return "flower";
  return "grass";
}

function getPixiTerrainColor(tileId: string) {
  if (tileId === "water") return 0x0ea5e9;
  if (tileId === "dirt") return 0x92400e;
  if (tileId === "grass_dark") return 0x166534;
  if (tileId === "grass_light") return 0x4ade80;
  if (tileId === "flower") return 0x22c55e;
  return 0x15803d;
}

function loadPixiRuntime() {
  if (typeof window === "undefined") throw new Error("PixiJS can only load in the browser.");
  if (window.PIXI) return window.PIXI;
  if (pixiLoaderPromise) return pixiLoaderPromise;

  pixiLoaderPromise = (async () => {
    const mod = await import("pixi.js");
    const runtime = mod as unknown as NonNullable<Window["PIXI"]>;
    window.PIXI = runtime;
    return runtime;
  })();

  return pixiLoaderPromise;
}

function isNightModeActive() {
  return typeof document !== "undefined" && Boolean(document.querySelector(".game-shell--night"));
}

function hasTorchEquipped(player: PlayerPublicState) {
  return (player as PlayerPublicState & { equippedWeaponItemId?: string | null }).equippedWeaponItemId === "torch";
}

function getPlayerPalette(player: PlayerPublicState, isLocal: boolean) {
  if (isLocal) return { jacket: 0x2563eb, trim: 0x93c5fd, hair: 0x1e293b, skin: 0xffd3a7 };
  const seed = player.id.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const jackets = [0x7c3aed, 0x059669, 0xdc2626, 0xd97706, 0x0891b2, 0xbe185d];
  return { jacket: jackets[seed % jackets.length], trim: 0xe9d5ff, hair: 0x111827, skin: 0xf8caa2 };
}

function getCreaturePalette(creature: CreaturePublicState) {
  const raw = String((creature as CreaturePublicState & { speciesId?: string; type?: string }).speciesId ?? (creature as CreaturePublicState & { type?: string }).type ?? creature.id);
  const seed = raw.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const bodies = [0xef4444, 0xf97316, 0x84cc16, 0x14b8a6, 0x8b5cf6, 0xec4899];
  return { body: bodies[seed % bodies.length], belly: 0xffedd5, eye: 0x111827, horn: 0xfde68a };
}

function getBuildingPalette(building: BuildingState) {
  const type = String(building.type);
  if (type.includes("stone")) return { base: 0x64748b, roof: 0x475569, accent: 0xcbd5e1, light: 0xe2e8f0 };
  if (type.includes("storage")) return { base: 0x92400e, roof: 0x78350f, accent: 0xfacc15, light: 0xfef3c7 };
  if (type.includes("campfire")) return { base: 0x7c2d12, roof: 0xef4444, accent: 0xf97316, light: 0xfef3c7 };
  if (type.includes("farm")) return { base: 0x854d0e, roof: 0x365314, accent: 0x84cc16, light: 0xd9f99d };
  if (type.includes("core")) return { base: 0x1d4ed8, roof: 0x0f172a, accent: 0x38bdf8, light: 0xe0f2fe };
  return { base: 0x7c2d12, roof: 0x78350f, accent: 0xfbbf24, light: 0xfef3c7 };
}

function getResourcePalette(resource: ResourceNodeState) {
  const raw = String((resource as ResourceNodeState & { type?: string; resourceType?: string }).type ?? (resource as ResourceNodeState & { resourceType?: string }).resourceType ?? resource.id);
  if (raw.includes("stone") || raw.includes("rock") || raw.includes("ore")) return { body: 0x94a3b8, accent: 0x475569, leaf: 0xcbd5e1 };
  if (raw.includes("berry") || raw.includes("food")) return { body: 0x16a34a, accent: 0xdc2626, leaf: 0x86efac };
  if (raw.includes("wood") || raw.includes("tree")) return { body: 0x92400e, accent: 0x166534, leaf: 0x22c55e };
  if (raw.includes("fiber") || raw.includes("grass")) return { body: 0x65a30d, accent: 0x365314, leaf: 0xa3e635 };
  return { body: 0x15803d, accent: 0x854d0e, leaf: 0x86efac };
}

function getDirectionOffset(direction: Direction | undefined) {
  switch (direction) {
    case "left": return { x: -1, y: 0 };
    case "right": return { x: 1, y: 0 };
    case "up": return { x: 0, y: -1 };
    case "down":
    default: return { x: 0, y: 1 };
  }
}

function lerp(current: number, target: number, factor: number) {
  return current + (target - current) * factor;
}

function clonePlayerWithPosition(player: PlayerPublicState, x: number, y: number): PlayerPublicState {
  return { ...player, position: { x, y } };
}

function updateSmoothedRemotePlayers(remotePlayers: PlayerPublicState[], smoothMap: Map<string, SmoothedRemotePlayer>, now: number) {
  const liveIds = new Set<string>();
  for (const player of remotePlayers) {
    liveIds.add(player.id);
    const previous = smoothMap.get(player.id);
    if (!previous || !isSamePlayerTile(previous.player, player)) {
      smoothMap.set(player.id, { player, x: player.position.x, y: player.position.y, lastSeenAt: now });
      continue;
    }
    const dx = player.position.x - previous.x;
    const dy = player.position.y - previous.y;
    const distance = Math.hypot(dx, dy);
    const nextX = distance > remoteSnapDistance ? player.position.x : lerp(previous.x, player.position.x, remoteLerpFactor);
    const nextY = distance > remoteSnapDistance ? player.position.y : lerp(previous.y, player.position.y, remoteLerpFactor);
    smoothMap.set(player.id, { player, x: nextX, y: nextY, lastSeenAt: now });
  }
  for (const [playerId, cached] of smoothMap.entries()) {
    if (!liveIds.has(playerId) && now - cached.lastSeenAt > remoteStaleMs) smoothMap.delete(playerId);
  }
  return Array.from(smoothMap.values()).map((cached) => clonePlayerWithPosition(cached.player, cached.x, cached.y));
}

function drawPixiCharacterAtOrigin(graphics: PixiGraphics, player: PlayerPublicState, isLocal: boolean) {
  const localPlayer = clonePlayerWithPosition(player, 0, 0);
  drawPixiCharacter(graphics, localPlayer, isLocal);
}

function drawPixiCharacter(graphics: PixiGraphics, player: PlayerPublicState, isLocal: boolean) {
  const x = player.position.x;
  const y = player.position.y;
  const palette = getPlayerPalette(player, isLocal);
  const direction = getDirectionOffset(player.direction);
  const torch = hasTorchEquipped(player);

  if (torch) {
    graphics.circle(x, y + 2, 74);
    graphics.fill({ color: 0xfacc15, alpha: 0.08 });
    graphics.circle(x, y + 2, 42);
    graphics.fill({ color: 0xf97316, alpha: 0.08 });
  }

  graphics.ellipse(x, y + 19, 18, 6);
  graphics.fill({ color: 0x000000, alpha: 0.24 });
  const step = Math.sin(Date.now() / 150 + player.position.x * 0.01 + player.position.y * 0.01) * 1.4;
  graphics.roundRect(x - 8, y + 9 + step, 5, 12, 3);
  graphics.roundRect(x + 3, y + 9 - step, 5, 12, 3);
  graphics.fill({ color: 0x1e293b, alpha: 1 });
  graphics.roundRect(x - 11, y - 8, 22, 25, 7);
  graphics.fill({ color: palette.jacket, alpha: isLocal ? 1 : 0.94 });
  graphics.roundRect(x - 4, y - 5, 8, 19, 3);
  graphics.fill({ color: palette.trim, alpha: 0.52 });
  const armOffsetX = direction.x * 5;
  const armOffsetY = direction.y * 3;
  graphics.roundRect(x - 16 + armOffsetX, y - 4 + armOffsetY, 6, 17, 4);
  graphics.roundRect(x + 10 + armOffsetX, y - 4 + armOffsetY, 6, 17, 4);
  graphics.fill({ color: palette.jacket, alpha: 0.92 });
  graphics.circle(x, y - 19, 11);
  graphics.fill({ color: palette.skin, alpha: 1 });
  graphics.roundRect(x - 9, y - 30, 18, 9, 6);
  graphics.fill({ color: palette.hair, alpha: 1 });
  const eyeY = y - 18 + Math.max(0, direction.y) * 1.2;
  const eyeX = direction.x * 2.2;
  graphics.circle(x - 4 + eyeX, eyeY, 1.4);
  graphics.circle(x + 4 + eyeX, eyeY, 1.4);
  graphics.fill({ color: 0x0f172a, alpha: 0.9 });
  graphics.moveTo(x, y - 34);
  graphics.lineTo(x + direction.x * 8, y - 34 + direction.y * 8);
  graphics.stroke({ width: 3, color: isLocal ? 0x60a5fa : 0xc4b5fd, alpha: 0.72 });

  if (torch) {
    const handX = x + 17 + direction.x * 8;
    const handY = y - 2 + direction.y * 4;
    graphics.roundRect(handX - 2, handY - 8, 4, 18, 2);
    graphics.fill({ color: 0x7c2d12, alpha: 1 });
    graphics.circle(handX, handY - 12, 7);
    graphics.fill({ color: 0xfacc15, alpha: 0.5 });
    graphics.circle(handX, handY - 12, 3.5);
    graphics.fill({ color: 0xfb923c, alpha: 0.9 });
  }
}

function drawPixiCreatureAtOrigin(graphics: PixiGraphics, creature: CreaturePublicState) {
  const palette = getCreaturePalette(creature);
  const hpRatio = Math.max(0, Math.min(1, creature.maxHp > 0 ? creature.hp / creature.maxHp : 0));
  const bob = Math.sin(Date.now() / 220 + creature.position.x * 0.02) * 1.8;

  graphics.ellipse(0, 23, 24, 8);
  graphics.fill({ color: 0x000000, alpha: 0.23 });
  graphics.circle(0, 0 + bob, 21);
  graphics.fill({ color: palette.body, alpha: creature.hp > 0 ? 0.96 : 0.34 });
  graphics.circle(0, 8 + bob, 12);
  graphics.fill({ color: palette.belly, alpha: 0.58 });
  graphics.circle(-8, -6 + bob, 3);
  graphics.circle(8, -6 + bob, 3);
  graphics.fill({ color: palette.eye, alpha: 0.9 });
  graphics.moveTo(-13, -18 + bob);
  graphics.lineTo(-20, -30 + bob);
  graphics.lineTo(-7, -21 + bob);
  graphics.moveTo(13, -18 + bob);
  graphics.lineTo(20, -30 + bob);
  graphics.lineTo(7, -21 + bob);
  graphics.stroke({ width: 3, color: palette.horn, alpha: 0.82 });

  graphics.roundRect(-23, -38, 46, 6, 3);
  graphics.fill({ color: 0x450a0a, alpha: 0.82 });
  graphics.roundRect(-23, -38, 46 * hpRatio, 6, 3);
  graphics.fill({ color: hpRatio > 0.45 ? 0x22c55e : 0xef4444, alpha: 0.92 });
}

function drawPixiBuildingAtOrigin(graphics: PixiGraphics, building: BuildingState) {
  const palette = getBuildingPalette(building);
  const type = String(building.type);
  const hpRatio = Math.max(0.2, Math.min(1, building.maxHp > 0 ? building.hp / building.maxHp : 1));
  const isFarm = type.includes("farm");
  const isCampfire = type.includes("campfire");
  const isCore = type.includes("core");

  if (isFarm) {
    graphics.ellipse(0, 25, 42, 15);
    graphics.fill({ color: 0x000000, alpha: 0.18 });
    graphics.roundRect(-42, -10, 84, 46, 10);
    graphics.fill({ color: palette.base, alpha: 0.86 * hpRatio });
    for (let i = -30; i <= 30; i += 15) {
      graphics.moveTo(i, -6);
      graphics.lineTo(i + 8, 28);
    }
    graphics.stroke({ width: 3, color: palette.accent, alpha: 0.76 });
    return;
  }

  if (isCampfire) {
    graphics.ellipse(0, 22, 28, 9);
    graphics.fill({ color: 0x000000, alpha: 0.22 });
    graphics.roundRect(-27, 10, 54, 12, 5);
    graphics.fill({ color: palette.base, alpha: 0.92 });
    graphics.circle(0, -2, 22);
    graphics.fill({ color: palette.accent, alpha: 0.18 });
    graphics.moveTo(-9, 9);
    graphics.lineTo(0, -24);
    graphics.lineTo(10, 9);
    graphics.stroke({ width: 8, color: palette.roof, alpha: 0.86 });
    graphics.moveTo(-4, 8);
    graphics.lineTo(2, -13);
    graphics.lineTo(7, 8);
    graphics.stroke({ width: 6, color: palette.light, alpha: 0.92 });
    return;
  }

  graphics.ellipse(0, 33, 36, 11);
  graphics.fill({ color: 0x000000, alpha: 0.2 });
  graphics.roundRect(-30, -10, 60, 43, 7);
  graphics.fill({ color: palette.base, alpha: 0.92 * hpRatio });
  graphics.moveTo(-36, -8);
  graphics.lineTo(0, -38);
  graphics.lineTo(36, -8);
  graphics.stroke({ width: 10, color: palette.roof, alpha: 0.96 });
  graphics.roundRect(-8, 9, 16, 24, 3);
  graphics.fill({ color: palette.roof, alpha: 0.72 });
  graphics.roundRect(-23, 0, 14, 12, 3);
  graphics.roundRect(10, 0, 14, 12, 3);
  graphics.fill({ color: palette.light, alpha: 0.78 });
  if (isCore) {
    graphics.circle(0, -3, 11);
    graphics.fill({ color: palette.accent, alpha: 0.38 });
    graphics.circle(0, -3, 5);
    graphics.fill({ color: palette.accent, alpha: 0.86 });
  }
}

function drawPixiResourceAtOrigin(graphics: PixiGraphics, resource: ResourceNodeState) {
  const palette = getResourcePalette(resource);
  const remaining = Math.max(0, (resource as ResourceNodeState & { remainingAmount?: number }).remainingAmount ?? 1);
  const maxAmount = Math.max(1, (resource as ResourceNodeState & { maxAmount?: number }).maxAmount ?? remaining);
  const ratio = Math.max(0.18, Math.min(1, remaining / maxAmount));
  const sway = Math.sin(Date.now() / 420 + resource.position.x * 0.01) * 1.2;

  graphics.ellipse(0, 18, 20, 7);
  graphics.fill({ color: 0x000000, alpha: 0.18 });
  graphics.roundRect(-7, -6, 14, 29, 5);
  graphics.fill({ color: palette.body, alpha: 0.92 * ratio });
  graphics.circle(-10 + sway, -12, 12);
  graphics.circle(2 + sway, -18, 14);
  graphics.circle(13 + sway, -8, 11);
  graphics.fill({ color: palette.leaf, alpha: 0.82 * ratio });
  graphics.circle(-5, -3, 5);
  graphics.circle(8, -1, 4);
  graphics.fill({ color: palette.accent, alpha: 0.72 * ratio });
  graphics.roundRect(-18, 29, 36, 5, 3);
  graphics.fill({ color: 0x052e16, alpha: 0.72 });
  graphics.roundRect(-18, 29, 36 * ratio, 5, 3);
  graphics.fill({ color: 0x84cc16, alpha: 0.86 });
}

function drawPixiFeedback(graphics: PixiGraphics, feedback: PixiFeedbackState, creatures: CreaturePublicState[]) {
  graphics.clear();
  const interactable = feedback.interactablePosition;
  if (interactable) {
    const pulse = 0.65 + Math.sin(Date.now() / 160) * 0.18;
    graphics.roundRect(interactable.x - 25, interactable.y - 25, 50, 50, 12);
    graphics.stroke({ width: 3, color: 0xfacc15, alpha: pulse });
    graphics.circle(interactable.x, interactable.y - 42, 10);
    graphics.fill({ color: 0x0f172a, alpha: 0.82 });
    graphics.moveTo(interactable.x - 4, interactable.y - 45);
    graphics.lineTo(interactable.x + 5, interactable.y - 45);
    graphics.moveTo(interactable.x, interactable.y - 50);
    graphics.lineTo(interactable.x, interactable.y - 35);
    graphics.stroke({ width: 2, color: 0xffffff, alpha: 0.9 });
  }

  const highlightedCreature = feedback.highlightedCreatureId ? creatures.find((creature) => creature.id === feedback.highlightedCreatureId) : null;
  if (highlightedCreature) {
    graphics.ellipse(highlightedCreature.position.x, highlightedCreature.position.y + 22, 32, 13);
    graphics.stroke({ width: 4, color: 0xfacc15, alpha: 0.92 });
  }

  const preview = feedback.placementPreview;
  if (preview) {
    const accent = preview.ok ? 0x22c55e : 0xef4444;
    graphics.ellipse(preview.position.x, preview.position.y + 26, 42, 18);
    graphics.fill({ color: accent, alpha: 0.13 });
    graphics.ellipse(preview.position.x, preview.position.y + 26, 42, 18);
    graphics.stroke({ width: 3, color: accent, alpha: 0.86 });
    graphics.roundRect(preview.position.x - 28, preview.position.y - 18, 56, 42, 8);
    graphics.fill({ color: accent, alpha: 0.18 });
  }
}

function carvePixiNightLight(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, strength: number) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, `rgba(0,0,0,${Math.min(1, strength)})`);
  gradient.addColorStop(0.42, `rgba(0,0,0,${Math.min(1, strength * 0.82)})`);
  gradient.addColorStop(0.72, `rgba(0,0,0,${Math.min(1, strength * 0.34)})`);
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawPixiNightGlow(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, torch: boolean) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  if (torch) {
    gradient.addColorStop(0, "rgba(255,218,145,0.16)");
    gradient.addColorStop(0.46, "rgba(255,156,74,0.055)");
    gradient.addColorStop(1, "rgba(255,156,74,0)");
  } else {
    gradient.addColorStop(0, "rgba(191,219,254,0.065)");
    gradient.addColorStop(0.56, "rgba(147,197,253,0.022)");
    gradient.addColorStop(1, "rgba(147,197,253,0)");
  }
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawPixiNightLighting(maskCanvas: HTMLCanvasElement, maskContext: CanvasRenderingContext2D, maskTexture: { source?: { update?: () => void }; update?: () => void }, width: number, height: number, cameraX: number, cameraY: number, drawablePlayers: DrawablePlayer[]) {
  const canvasWidth = Math.max(1, Math.ceil(width));
  const canvasHeight = Math.max(1, Math.ceil(height));
  if (maskCanvas.width !== canvasWidth || maskCanvas.height !== canvasHeight) {
    maskCanvas.width = canvasWidth;
    maskCanvas.height = canvasHeight;
  }

  maskContext.setTransform(1, 0, 0, 1, 0, 0);
  maskContext.clearRect(0, 0, canvasWidth, canvasHeight);
  if (!isNightModeActive()) {
    maskTexture.source?.update?.();
    maskTexture.update?.();
    return;
  }

  maskContext.globalCompositeOperation = "source-over";
  maskContext.fillStyle = "rgba(1, 3, 10, 0.88)";
  maskContext.fillRect(0, 0, canvasWidth, canvasHeight);

  const lights: { x: number; y: number; radius: number; strength: number; torch: boolean }[] = [];
  for (const entry of drawablePlayers) {
    const screenX = entry.player.position.x - cameraX;
    const screenY = entry.player.position.y - cameraY + 2;
    if (screenX < -320 || screenY < -320 || screenX > width + 320 || screenY > height + 320) continue;
    const torch = hasTorchEquipped(entry.player);
    const radius = torch ? 238 : entry.isLocal ? 66 : 0;
    if (radius <= 0) continue;
    const flicker = torch ? 0.94 + Math.sin(Date.now() / 90 + screenX * 0.013) * 0.06 : 1;
    lights.push({ x: screenX, y: screenY, radius: radius * flicker, strength: torch ? 0.96 : 0.56, torch });
  }

  maskContext.globalCompositeOperation = "destination-out";
  for (const light of lights) carvePixiNightLight(maskContext, light.x, light.y, light.radius, light.strength);

  maskContext.globalCompositeOperation = "source-over";
  for (const light of lights) drawPixiNightGlow(maskContext, light.x, light.y, light.radius * 0.78, light.torch);

  maskContext.globalCompositeOperation = "source-over";
  maskTexture.source?.update?.();
  maskTexture.update?.();
}

function isSamePlayerTile(a: PlayerPublicState | null | undefined, b: PlayerPublicState | null | undefined) {
  if (!a || !b) return false;
  return String(a.currentTile?.regionId) === String(b.currentTile?.regionId)
    && a.currentTile?.tileX === b.currentTile?.tileX
    && a.currentTile?.tileY === b.currentTile?.tileY;
}

function getPixiPlayerNodeKey(entry: DrawablePlayer) {
  return entry.isLocal ? `local:${entry.player.id}` : `remote:${entry.player.id}`;
}

function upsertPixiPlayerNodes(PIXI: NonNullable<Window["PIXI"]>, playerLayer: PixiContainer, nodes: Map<string, PixiPlayerNode>, drawablePlayers: DrawablePlayer[], frameId: number) {
  for (const entry of drawablePlayers) {
    const key = getPixiPlayerNodeKey(entry);
    let node = nodes.get(key);
    if (!node) {
      const container = new PIXI.Container();
      const graphics = new PIXI.Graphics();
      container.addChild(graphics as unknown as PixiContainer);
      playerLayer.addChild(container);
      node = { container, graphics, lastSeenFrame: frameId };
      nodes.set(key, node);
    }
    node.lastSeenFrame = frameId;
    node.container.visible = true;
    node.container.zIndex = entry.player.position.y;
    node.container.position?.set(entry.player.position.x, entry.player.position.y);
    node.graphics.clear();
    drawPixiCharacterAtOrigin(node.graphics, entry.player, entry.isLocal);
  }
  for (const [key, node] of nodes.entries()) {
    if (node.lastSeenFrame === frameId) continue;
    node.container.visible = false;
    playerLayer.removeChild?.(node.container);
    node.container.destroy?.({ children: true });
    nodes.delete(key);
  }
}

function drawPixiPolygon(graphics: PixiGraphics, points: Array<{ x: number; y: number }>, fillColor: number, fillAlpha: number, strokeColor: number, strokeAlpha = 0.55, strokeWidth = 1) {
  if (points.length === 0) return;
  const [first, ...rest] = points;
  graphics.moveTo(first.x, first.y);
  for (const point of rest) graphics.lineTo(point.x, point.y);
  graphics.lineTo(first.x, first.y);
  graphics.fill({ color: fillColor, alpha: fillAlpha });
  graphics.moveTo(first.x, first.y);
  for (const point of rest) graphics.lineTo(point.x, point.y);
  graphics.lineTo(first.x, first.y);
  graphics.stroke({ width: strokeWidth, color: strokeColor, alpha: strokeAlpha });
}

function getPixiBuildPartPalette(part: PlacedBuildPart) {
  const definition = BUILD_PARTS[part.partId];
  const palette = definition ? getMaterialPalette(definition.material) : null;
  if (!palette) return { base: 0x8b5a2b, light: 0xd6a15d, side: 0x6b3f1d, dark: 0x3f2412 };
  return {
    base: Number.parseInt(palette.base.replace('#', ''), 16),
    light: Number.parseInt(palette.light.replace('#', ''), 16),
    side: Number.parseInt(palette.side.replace('#', ''), 16),
    dark: Number.parseInt(palette.dark.replace('#', ''), 16),
  };
}

function drawPixiIsoFloorPart(graphics: PixiGraphics, part: PlacedBuildPart, preview = false, valid = true) {
  const definition = BUILD_PARTS[part.partId];
  if (!definition) return;
  const palette = getPixiBuildPartPalette(part);
  const width = definition.width * BUILD_GRID_SIZE;
  const height = definition.height * BUILD_GRID_SIZE;
  const visualY = -part.floorLevel * BUILD_2P5D_FLOOR_HEIGHT;
  const points = getIsoTilePolygon2p5d({ x: 0, y: visualY, width, height: height * 0.62 });
  const color = preview ? (valid ? 0x22c55e : 0xef4444) : palette.base;
  drawPixiPolygon(graphics, points, color, preview ? 0.22 : 0.94, preview ? color : palette.dark, preview ? 0.9 : 0.66, preview ? 2 : 1.2);
  const grooveColor = definition.material === 'stone' ? palette.dark : palette.light;
  for (const t of [0.28, 0.5, 0.72]) {
    const left = { x: points[3].x + (points[2].x - points[3].x) * t, y: points[3].y + (points[2].y - points[3].y) * t };
    const right = { x: points[0].x + (points[1].x - points[0].x) * t, y: points[0].y + (points[1].y - points[0].y) * t };
    graphics.moveTo(left.x, left.y);
    graphics.lineTo(right.x, right.y);
  }
  graphics.stroke({ width: 1, color: grooveColor, alpha: preview ? 0.18 : 0.28 });
}

function drawPixiIsoWallPart(graphics: PixiGraphics, part: PlacedBuildPart, preview = false, valid = true) {
  const definition = BUILD_PARTS[part.partId];
  if (!definition) return;
  const palette = getPixiBuildPartPalette(part);
  const width = definition.width * BUILD_GRID_SIZE;
  const height = definition.height * BUILD_GRID_SIZE;
  const wallHeight = definition.id.includes('half') || definition.id.includes('railing') || definition.id.includes('fence') || definition.id.includes('gate') ? 34 : 72;
  const visualY = -part.floorLevel * BUILD_2P5D_FLOOR_HEIGHT;
  const plane = getIsoWallPlane2p5d({ x: 0, y: visualY, width, height, rotation: part.rotation, wallHeight });
  const color = preview ? (valid ? 0x22c55e : 0xef4444) : palette.side;
  drawPixiPolygon(graphics, [plane.baseStart, plane.baseEnd, plane.topEnd, plane.topStart], color, preview ? 0.25 : 0.92, preview ? color : palette.dark, preview ? 0.95 : 0.72, preview ? 2 : 1.2);
  graphics.moveTo(plane.baseStart.x, plane.baseStart.y);
  graphics.lineTo(plane.baseEnd.x, plane.baseEnd.y);
  graphics.stroke({ width: 2, color: preview ? color : palette.dark, alpha: 0.75 });
  if (definition.category === 'door') {
    const mx = (plane.baseStart.x + plane.baseEnd.x) / 2;
    const my = (plane.baseStart.y + plane.baseEnd.y) / 2;
    graphics.roundRect(mx - 8, my - wallHeight * 0.68, 16, wallHeight * 0.62, 3);
    graphics.fill({ color: palette.dark, alpha: 0.62 });
  }
  if (definition.category === 'window') {
    const mx = (plane.baseStart.x + plane.baseEnd.x) / 2;
    const my = (plane.baseStart.y + plane.baseEnd.y) / 2;
    graphics.roundRect(mx - 10, my - wallHeight * 0.62, 20, 14, 3);
    graphics.fill({ color: 0xbae6fd, alpha: 0.62 });
  }
}

function drawPixiIsoRoofPart(graphics: PixiGraphics, part: PlacedBuildPart, preview = false, valid = true) {
  const definition = BUILD_PARTS[part.partId];
  if (!definition) return;
  const palette = getPixiBuildPartPalette(part);
  const width = definition.width * BUILD_GRID_SIZE;
  const height = definition.height * BUILD_GRID_SIZE;
  const visualY = -part.floorLevel * BUILD_2P5D_FLOOR_HEIGHT - 48;
  const points = getIsoTilePolygon2p5d({ x: 0, y: visualY, width, height: height * 0.62 });
  const color = preview ? (valid ? 0x22c55e : 0xef4444) : palette.dark;
  drawPixiPolygon(graphics, points, color, preview ? 0.25 : 0.94, preview ? color : palette.light, preview ? 0.9 : 0.55, preview ? 2 : 1.2);
}

function drawPixiBuildPartAtOrigin(graphics: PixiGraphics, part: PlacedBuildPart, options?: { preview?: boolean; valid?: boolean; selected?: boolean; houseSelected?: boolean }) {
  const definition = BUILD_PARTS[part.partId];
  if (!definition) return;
  const preview = options?.preview ?? false;
  const valid = options?.valid ?? true;
  if (definition.category === 'wall' || definition.category === 'door' || definition.category === 'window') drawPixiIsoWallPart(graphics, part, preview, valid);
  else if (definition.category === 'roof') drawPixiIsoRoofPart(graphics, part, preview, valid);
  else drawPixiIsoFloorPart(graphics, part, preview, valid);
  if (options?.selected || options?.houseSelected) {
    const accent = options.selected ? 0xfacc15 : 0x60a5fa;
    const width = definition.width * BUILD_GRID_SIZE;
    const height = definition.height * BUILD_GRID_SIZE;
    const visualY = -part.floorLevel * BUILD_2P5D_FLOOR_HEIGHT;
    const outline = getIsoTilePolygon2p5d({ x: 0, y: visualY, width, height: height * 0.62 });
    drawPixiPolygon(graphics, outline, accent, options.selected ? 0.08 : 0.03, accent, options.selected ? 0.92 : 0.48, options.selected ? 3 : 1.5);
  }
}

function upsertPixiBuildPartNodes(PIXI: NonNullable<Window['PIXI']>, layer: PixiContainer, nodes: Map<string, PixiBuildPartNode>, state: PixiBuildPartsState, frameId: number) {
  const parts = state.parts ?? [];
  for (const part of parts) {
    const definition = BUILD_PARTS[part.partId];
    if (!definition) continue;
    let node = nodes.get(part.id);
    if (!node) {
      const container = new PIXI.Container();
      const graphics = new PIXI.Graphics();
      container.addChild(graphics as unknown as PixiContainer);
      layer.addChild(container);
      node = { container, graphics, lastSeenFrame: frameId };
      nodes.set(part.id, node);
    }
    const iso = buildGridToIsoCenter(part.gridX, part.gridY);
    node.lastSeenFrame = frameId;
    node.container.visible = true;
    node.container.zIndex = iso.y + part.floorLevel * 96 + (definition.layer === 'roof' ? 48 : definition.layer === 'wall' ? 24 : 0);
    node.container.position?.set(iso.x, iso.y);
    node.graphics.clear();
    drawPixiBuildPartAtOrigin(node.graphics, part, { selected: state.selectedPartId === part.id, houseSelected: Boolean(state.selectedHouseId && part.houseId === state.selectedHouseId) });
  }

  if (state.preview) {
    const previewId = '__preview_build_part__';
    const preview = state.preview;
    const gridX = typeof preview.gridX === 'number' ? preview.gridX : Math.round(preview.position.x / BUILD_GRID_SIZE);
    const gridY = typeof preview.gridY === 'number' ? preview.gridY : Math.round(preview.position.y / BUILD_GRID_SIZE);
    const previewPart: PlacedBuildPart = { id: previewId, partId: preview.partId, ownerPlayerId: 'preview', regionId: 'preview', tileX: 0, tileY: 0, gridX, gridY, floorLevel: preview.floorLevel, rotation: preview.rotation, hp: 1, maxHp: 1, createdAt: 0, updatedAt: 0 };
    let node = nodes.get(previewId);
    if (!node) {
      const container = new PIXI.Container();
      const graphics = new PIXI.Graphics();
      container.addChild(graphics as unknown as PixiContainer);
      layer.addChild(container);
      node = { container, graphics, lastSeenFrame: frameId };
      nodes.set(previewId, node);
    }
    const iso = buildGridToIsoCenter(previewPart.gridX, previewPart.gridY);
    node.lastSeenFrame = frameId;
    node.container.visible = true;
    node.container.zIndex = iso.y + 96;
    node.container.position?.set(iso.x, iso.y);
    node.graphics.clear();
    drawPixiBuildPartAtOrigin(node.graphics, previewPart, { preview: true, valid: preview.valid });
  }

  for (const [key, node] of nodes.entries()) {
    if (node.lastSeenFrame === frameId) continue;
    node.container.visible = false;
    layer.removeChild?.(node.container);
    node.container.destroy?.({ children: true });
    nodes.delete(key);
  }
}

function drawPixiTerrainTileAtOrigin(graphics: PixiGraphics, tileX: number, tileY: number) {
  const tileId = samplePixiTerrainTile(tileX, tileY);
  const color = getPixiTerrainColor(tileId);
  graphics.rect(0, 0, terrainTileSize, terrainTileSize);
  graphics.fill({ color, alpha: 1 });
  if (tileId === "flower") {
    const seed = hashTerrainTile(tileX, tileY);
    for (let i = 0; i < 3; i += 1) {
      const px = 7 + ((seed >> (i * 4)) & 15);
      const py = 7 + ((seed >> (i * 5 + 3)) & 15);
      graphics.circle(px, py, 1.6);
      graphics.fill({ color: i % 2 === 0 ? 0xf9a8d4 : 0xfef08a, alpha: 0.8 });
    }
  }
  if (tileId === "water") {
    const waveA = 10 + ((tileX + tileY) % 3);
    const waveB = 22 + ((tileX - tileY) % 2);
    graphics.moveTo(3, waveA);
    graphics.lineTo(29, waveA);
    graphics.moveTo(1, waveB);
    graphics.lineTo(26, waveB);
    graphics.stroke({ width: 1, color: 0xbae6fd, alpha: 0.38 });
  }
}

function upsertPixiTerrainNodes(PIXI: NonNullable<Window["PIXI"]>, terrainLayer: PixiContainer, nodes: Map<string, PixiTerrainNode>, cameraX: number, cameraY: number, width: number, height: number, frameId: number) {
  const startTileX = Math.floor(cameraX / terrainTileSize) - terrainPaddingTiles;
  const startTileY = Math.floor(cameraY / terrainTileSize) - terrainPaddingTiles;
  const endTileX = Math.ceil((cameraX + width) / terrainTileSize) + terrainPaddingTiles;
  const endTileY = Math.ceil((cameraY + height) / terrainTileSize) + terrainPaddingTiles;
  for (let tileY = startTileY; tileY <= endTileY; tileY += 1) {
    for (let tileX = startTileX; tileX <= endTileX; tileX += 1) {
      const key = tileX + ":" + tileY;
      let node = nodes.get(key);
      if (!node) {
        const container = new PIXI.Container();
        const graphics = new PIXI.Graphics();
        container.addChild(graphics as unknown as PixiContainer);
        terrainLayer.addChild(container);
        node = { container, graphics, lastSeenFrame: frameId };
        nodes.set(key, node);
      }
      node.lastSeenFrame = frameId;
      node.container.visible = true;
      node.container.zIndex = -100000 + tileY;
      node.container.position?.set(tileX * terrainTileSize, tileY * terrainTileSize);
      node.graphics.clear();
      drawPixiTerrainTileAtOrigin(node.graphics, tileX, tileY);
    }
  }
  for (const [key, node] of nodes.entries()) {
    if (node.lastSeenFrame === frameId) continue;
    node.container.visible = false;
    terrainLayer.removeChild?.(node.container);
    node.container.destroy?.({ children: true });
    nodes.delete(key);
  }
}

function upsertPixiBuildingNodes(PIXI: NonNullable<Window["PIXI"]>, buildingLayer: PixiContainer, nodes: Map<string, PixiBuildingNode>, buildings: BuildingState[], frameId: number) {
  for (const building of buildings) {
    let node = nodes.get(building.id);
    if (!node) {
      const container = new PIXI.Container();
      const graphics = new PIXI.Graphics();
      container.addChild(graphics as unknown as PixiContainer);
      buildingLayer.addChild(container);
      node = { container, graphics, lastSeenFrame: frameId };
      nodes.set(building.id, node);
    }
    node.lastSeenFrame = frameId;
    node.container.visible = true;
    node.container.zIndex = building.position.y + 8;
    node.container.position?.set(building.position.x, building.position.y);
    node.graphics.clear();
    drawPixiBuildingAtOrigin(node.graphics, building);
  }
  for (const [key, node] of nodes.entries()) {
    if (node.lastSeenFrame === frameId) continue;
    node.container.visible = false;
    buildingLayer.removeChild?.(node.container);
    node.container.destroy?.({ children: true });
    nodes.delete(key);
  }
}

function upsertPixiResourceNodes(PIXI: NonNullable<Window["PIXI"]>, resourceLayer: PixiContainer, nodes: Map<string, PixiResourceNode>, resources: ResourceNodeState[], frameId: number) {
  for (const resource of resources) {
    let node = nodes.get(resource.id);
    if (!node) {
      const container = new PIXI.Container();
      const graphics = new PIXI.Graphics();
      container.addChild(graphics as unknown as PixiContainer);
      resourceLayer.addChild(container);
      node = { container, graphics, lastSeenFrame: frameId };
      nodes.set(resource.id, node);
    }
    node.lastSeenFrame = frameId;
    node.container.visible = true;
    node.container.zIndex = resource.position.y - 12;
    node.container.position?.set(resource.position.x, resource.position.y);
    node.graphics.clear();
    drawPixiResourceAtOrigin(node.graphics, resource);
  }
  for (const [key, node] of nodes.entries()) {
    if (node.lastSeenFrame === frameId) continue;
    node.container.visible = false;
    resourceLayer.removeChild?.(node.container);
    node.container.destroy?.({ children: true });
    nodes.delete(key);
  }
}

function upsertPixiCreatureNodes(PIXI: NonNullable<Window["PIXI"]>, creatureLayer: PixiContainer, nodes: Map<string, PixiCreatureNode>, creatures: CreaturePublicState[], frameId: number) {
  for (const creature of creatures) {
    let node = nodes.get(creature.id);
    if (!node) {
      const container = new PIXI.Container();
      const graphics = new PIXI.Graphics();
      container.addChild(graphics as unknown as PixiContainer);
      creatureLayer.addChild(container);
      node = { container, graphics, lastSeenFrame: frameId };
      nodes.set(creature.id, node);
    }
    node.lastSeenFrame = frameId;
    node.container.visible = true;
    node.container.zIndex = creature.position.y - 4;
    node.container.position?.set(creature.position.x, creature.position.y);
    node.graphics.clear();
    drawPixiCreatureAtOrigin(node.graphics, creature);
  }
  for (const [key, node] of nodes.entries()) {
    if (node.lastSeenFrame === frameId) continue;
    node.container.visible = false;
    creatureLayer.removeChild?.(node.container);
    node.container.destroy?.({ children: true });
    nodes.delete(key);
  }
}

export function PixiGameCanvas({ enabled = false, snapshot, localPlayerId }: PixiGameCanvasProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const snapshotRef = useRef<WorldSnapshot | null>(snapshot);
  const localPlayerIdRef = useRef(localPlayerId);
  const remotePlayersRef = useRef<PlayerPublicState[]>([]);
  const smoothedRemotePlayersRef = useRef(new Map<string, SmoothedRemotePlayer>());
  const playerNodesRef = useRef(new Map<string, PixiPlayerNode>());
  const creatureNodesRef = useRef(new Map<string, PixiCreatureNode>());
  const resourceNodesRef = useRef(new Map<string, PixiResourceNode>());
  const hitEffectNodesRef = useRef(new Map<string, PixiHitEffectNode>());
  const hitEffectsRef = useRef<PixiHitEffect[]>([]);
  const previousCreatureHpRef = useRef(new Map<string, number>());
  const buildingNodesRef = useRef(new Map<string, PixiBuildingNode>());
  const terrainNodesRef = useRef(new Map<string, PixiTerrainNode>());
  const buildPartNodesRef = useRef(new Map<string, PixiBuildPartNode>());
  const buildPartsStateRef = useRef<PixiBuildPartsState>({ parts: [] });
  const remoteBuildingsRef = useRef<SharedPixiBuildingState[]>([]);
  const frameIdRef = useRef(0);
  const feedbackRef = useRef<PixiFeedbackState>({});

  useEffect(() => { snapshotRef.current = snapshot; }, [snapshot]);
  useEffect(() => { localPlayerIdRef.current = localPlayerId; }, [localPlayerId]);

  useEffect(() => {
    const handlePixiBuildParts = (event: Event) => {
      const customEvent = event as PixiBuildPartsEvent;
      buildPartsStateRef.current = customEvent.detail ?? { parts: [] };
    };
    window.addEventListener("palpalworld:pixi-build-parts", handlePixiBuildParts);
    return () => window.removeEventListener("palpalworld:pixi-build-parts", handlePixiBuildParts);
  }, []);

  useEffect(() => {
    const handleFeedback = (event: Event) => {
      const customEvent = event as PixiFeedbackEvent;
      feedbackRef.current = customEvent.detail ?? {};
    };
    window.addEventListener("palpalworld:pixi-feedback", handleFeedback);
    return () => window.removeEventListener("palpalworld:pixi-feedback", handleFeedback);
  }, []);

  useEffect(() => {
    const handleRemoteBuildings = (event: Event) => {
      const customEvent = event as RemoteBuildingsEvent;
      remoteBuildingsRef.current = customEvent.detail?.buildings ?? [];
    };
    window.addEventListener("palpalworld:remote-buildings", handleRemoteBuildings);
    return () => window.removeEventListener("palpalworld:remote-buildings", handleRemoteBuildings);
  }, []);

  useEffect(() => {
    const handleRemotePlayers = (event: Event) => {
      const customEvent = event as RemotePlayersEvent;
      remotePlayersRef.current = customEvent.detail?.players ?? [];
    };
    window.addEventListener("palpalworld:remote-players", handleRemotePlayers);
    return () => window.removeEventListener("palpalworld:remote-players", handleRemotePlayers);
  }, []);

  useEffect(() => {
    if (!enabled || !hostRef.current) return;
    let disposed = false;
    let cleanup: (() => void) | null = null;

    async function start() {
      const host = hostRef.current;
      if (!host || disposed) return;
      const PIXI = await loadPixiRuntime();
      if (disposed || !hostRef.current) return;

      const app = new PIXI.Application();
      await app.init({ resizeTo: host, antialias: false, backgroundAlpha: 0, autoDensity: true, resolution: Math.min(window.devicePixelRatio || 1, 2) });
      host.appendChild(app.canvas);
      const camera = createPixiCamera(host.clientWidth, host.clientHeight);
      const layers = createPixiGameLayers(app, PIXI);
      const lightingGraphics = new PIXI.Graphics();
      const feedbackGraphics = new PIXI.Graphics();
      layers.effects.addChild(feedbackGraphics as unknown as PixiContainer);
      layers.lighting.addChild(lightingGraphics as unknown as PixiContainer);

      const resize = () => resizePixiCamera(camera, host.clientWidth, host.clientHeight);
      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(host);

      app.ticker.add(() => {
        const currentSnapshot = snapshotRef.current;
        const localPlayer = currentSnapshot?.players.find((player) => player.id === localPlayerIdRef.current);
        const now = Date.now();
        const frameId = ++frameIdRef.current;
        if (localPlayer) centerPixiCameraOn(camera, localPlayer.position);
        const root = layers.root as unknown as PixiTransformNode;
        root.position.set(-camera.x * camera.zoom, -camera.y * camera.zoom);
        root.scale.set(camera.zoom);
        const lighting = nightMaskSprite as unknown as PixiTransformNode;
        lighting.position.set(0, 0);
        lighting.scale.set(1);
        nightMaskSprite.width = host.clientWidth;
        nightMaskSprite.height = host.clientHeight;
        const feedbackLayer = feedbackGraphics as unknown as PixiTransformNode;
        feedbackLayer.position.set(0, 0);
        feedbackLayer.scale.set(1);

        upsertPixiTerrainNodes(PIXI, layers.terrain, terrainNodesRef.current, camera.x, camera.y, host.clientWidth, host.clientHeight, frameId);
        const smoothRemotePlayers = updateSmoothedRemotePlayers(remotePlayersRef.current, smoothedRemotePlayersRef.current, now);
        const drawablePlayers = [
          ...(localPlayer ? [{ player: localPlayer, isLocal: true }] : []),
          ...smoothRemotePlayers
            .filter((remotePlayer) => remotePlayer.id !== localPlayerIdRef.current)
            .filter((remotePlayer) => !localPlayer || isSamePlayerTile(localPlayer, remotePlayer))
            .map((remotePlayer) => ({ player: remotePlayer, isLocal: false })),
        ].sort((a, b) => a.player.position.y - b.player.position.y);
        const drawableCreatures = (currentSnapshot?.creatures ?? []).filter((creature) => creature.hp > 0);
        const drawableResources = (currentSnapshot?.resources ?? []).filter((resource) => ((resource as ResourceNodeState & { remainingAmount?: number }).remainingAmount ?? 1) > 0);
        syncPixiHitEffects(drawableCreatures, previousCreatureHpRef.current, hitEffectsRef.current, now);
        const localBuildingIds = new Set((currentSnapshot?.buildings ?? []).map((building) => building.id));
        const drawableBuildings = [...(currentSnapshot?.buildings ?? []), ...remoteBuildingsRef.current.filter((building) => !localBuildingIds.has(building.id))];

        upsertPixiBuildingNodes(PIXI, layers.buildingsBack, buildingNodesRef.current, drawableBuildings, frameId);
        upsertPixiBuildPartNodes(PIXI, layers.buildingsBack, buildPartNodesRef.current, buildPartsStateRef.current, frameId);
        upsertPixiResourceNodes(PIXI, layers.resources, resourceNodesRef.current, drawableResources, frameId);
        upsertPixiCreatureNodes(PIXI, layers.creatures, creatureNodesRef.current, drawableCreatures, frameId);
        upsertPixiPlayerNodes(PIXI, layers.players, playerNodesRef.current, drawablePlayers, frameId);
        upsertPixiHitEffectNodes(PIXI, layers.effects, hitEffectNodesRef.current, hitEffectsRef.current, now, frameId);
        drawPixiFeedback(feedbackGraphics, feedbackRef.current, drawableCreatures);
        drawPixiNightLighting(nightMaskCanvas, nightMaskContext, nightMaskTexture, host.clientWidth, host.clientHeight, camera.x, camera.y, drawablePlayers);
      });

      cleanup = () => {
        resizeObserver.disconnect();
        for (const node of playerNodesRef.current.values()) node.container.destroy?.({ children: true });
        for (const node of creatureNodesRef.current.values()) node.container.destroy?.({ children: true });
        for (const node of resourceNodesRef.current.values()) node.container.destroy?.({ children: true });
        for (const node of hitEffectNodesRef.current.values()) node.container.destroy?.({ children: true });
        for (const node of buildingNodesRef.current.values()) node.container.destroy?.({ children: true });
        for (const node of terrainNodesRef.current.values()) node.container.destroy?.({ children: true });
        for (const node of buildPartNodesRef.current.values()) node.container.destroy?.({ children: true });
        playerNodesRef.current.clear();
        creatureNodesRef.current.clear();
        resourceNodesRef.current.clear();
        hitEffectNodesRef.current.clear();
        hitEffectsRef.current.length = 0;
        previousCreatureHpRef.current.clear();
        buildingNodesRef.current.clear();
        terrainNodesRef.current.clear();
        buildPartNodesRef.current.clear();
        buildPartsStateRef.current = { parts: [] };
        app.destroy(true, { children: true });
      };
    }

    void start();
    return () => { disposed = true; cleanup?.(); cleanup = null; };
  }, [enabled]);

  return <div ref={hostRef} className={enabled ? "pixi-game-canvas pixi-game-canvas--enabled" : "pixi-game-canvas"} aria-hidden={!enabled} />;
}
