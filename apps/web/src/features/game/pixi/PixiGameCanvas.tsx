"use client";

import type { BuildingState, CreaturePublicState, PlayerPublicState, ResourceNodeState, WorldSnapshot } from "@palpalworld/shared";
import { useEffect, useRef } from "react";
import { createPixiCamera, resizePixiCamera, centerPixiCameraOn } from "./PixiCamera";
import { BUILD_GRID_SIZE } from "../../buildings/buildGrid";
import { BUILD_PARTS, type BuildFloorLevel, type BuildPartId, type BuildPartRotation, type PlacedBuildPart } from "../../buildings/buildPartCatalog";
import { buildGridToIsoCenter, getIsoTilePolygon2p5d, getIsoWallPlane2p5d } from "../../buildings/buildProjection2p5d";
import { BUILD_2P5D_FLOOR_HEIGHT, getMaterialPalette } from "../../buildings/buildPartVisual2p5d";

export type PixiGameCanvasProps = {
  enabled?: boolean;
  snapshot: WorldSnapshot | null;
  localPlayerId: string;
};

type PixiModule = typeof import("pixi.js");
type AnyContainer = any;
type AnyGraphics = any;
type NodeRecord = { container: AnyContainer; graphics: AnyGraphics; lastSeenFrame: number };
type RemotePlayersEvent = CustomEvent<{ players?: PlayerPublicState[] }>;
type RemoteBuildingsEvent = CustomEvent<{ buildings?: BuildingState[] }>;
type PixiSnapshotEvent = CustomEvent<WorldSnapshot>;
type BuildPartPreviewState = { partId: BuildPartId; position: { x: number; y: number }; gridX?: number; gridY?: number; rotation: BuildPartRotation; floorLevel: BuildFloorLevel; valid: boolean };
type BuildPartsState = { parts: PlacedBuildPart[]; selectedPartId?: string | null; selectedHouseId?: string | null; preview?: BuildPartPreviewState | null };
type BuildPartsEvent = CustomEvent<BuildPartsState>;

type Layers = {
  world: AnyContainer;
  terrain: AnyContainer;
  buildings: AnyContainer;
  resources: AnyContainer;
  creatures: AnyContainer;
  buildParts: AnyContainer;
  players: AnyContainer;
  lighting: AnyContainer;
  debug: AnyContainer;
};

const terrainTileSize = 32;
const terrainPaddingTiles = 4;
let pixiLoaderPromise: Promise<PixiModule> | null = null;

function loadPixiRuntime() {
  if (!pixiLoaderPromise) pixiLoaderPromise = import("pixi.js");
  return pixiLoaderPromise;
}

function pixiDebugEnabled() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem("palpalworld.dev.pixiDebug") === "true";
}

function hashTile(x: number, y: number) {
  let value = x * 374761393 + y * 668265263;
  value = Math.imul(value ^ (value >> 13), 1274126177);
  return (value ^ (value >> 16)) >>> 0;
}

function tileKind(x: number, y: number) {
  const riverCenter = Math.sin(y * 0.11) * 9 + Math.cos(y * 0.035) * 5;
  const riverDistance = Math.abs(x - riverCenter);
  if (riverDistance < 2.2) return "water";
  if (riverDistance < 3.2) return "dirt";
  const path = Math.abs(y - Math.sin(x * 0.12) * 6 - 7);
  if (path < 1.2 && x > -18 && x < 42) return "dirt";
  const roll = hashTile(x, y) % 100;
  if (roll < 8) return "grass_dark";
  if (roll < 15) return "grass_light";
  if (roll < 20) return "flower";
  return "grass";
}

function tileColor(kind: string) {
  if (kind === "water") return 0x0ea5e9;
  if (kind === "dirt") return 0x92400e;
  if (kind === "grass_dark") return 0x166534;
  if (kind === "grass_light") return 0x4ade80;
  if (kind === "flower") return 0x22c55e;
  return 0x15803d;
}

function makeLayers(PIXI: PixiModule, app: any): Layers {
  const world = new PIXI.Container();
  const terrain = new PIXI.Container();
  const buildings = new PIXI.Container();
  const resources = new PIXI.Container();
  const creatures = new PIXI.Container();
  const buildParts = new PIXI.Container();
  const players = new PIXI.Container();
  const lighting = new PIXI.Container();
  const debug = new PIXI.Container();

  world.sortableChildren = true;
  terrain.zIndex = -100000;
  buildings.zIndex = 0;
  resources.zIndex = 10;
  creatures.zIndex = 20;
  buildParts.zIndex = 30;
  players.zIndex = 40;
  buildings.sortableChildren = true;
  resources.sortableChildren = true;
  creatures.sortableChildren = true;
  buildParts.sortableChildren = true;
  players.sortableChildren = true;

  world.addChild(terrain, buildings, resources, creatures, buildParts, players);
  app.stage.addChild(world, lighting, debug);
  return { world, terrain, buildings, resources, creatures, buildParts, players, lighting, debug };
}

function upsertNode(PIXI: PixiModule, layer: AnyContainer, nodes: Map<string, NodeRecord>, id: string, frameId: number) {
  let node = nodes.get(id);
  if (!node) {
    const container = new PIXI.Container();
    const graphics = new PIXI.Graphics();
    container.addChild(graphics);
    layer.addChild(container);
    node = { container, graphics, lastSeenFrame: frameId };
    nodes.set(id, node);
  }
  node.lastSeenFrame = frameId;
  node.container.visible = true;
  node.graphics.clear();
  return node;
}

function pruneNodes(layer: AnyContainer, nodes: Map<string, NodeRecord>, frameId: number) {
  for (const [id, node] of nodes.entries()) {
    if (node.lastSeenFrame === frameId) continue;
    layer.removeChild(node.container);
    node.container.destroy({ children: true });
    nodes.delete(id);
  }
}

function drawTerrain(g: AnyGraphics, x: number, y: number) {
  const kind = tileKind(x, y);
  g.rect(0, 0, terrainTileSize, terrainTileSize).fill({ color: tileColor(kind), alpha: 1 });
  if (kind === "flower") {
    const seed = hashTile(x, y);
    for (let i = 0; i < 3; i += 1) {
      g.circle(7 + ((seed >> (i * 4)) & 15), 7 + ((seed >> (i * 5 + 3)) & 15), 1.6).fill({ color: i % 2 === 0 ? 0xf9a8d4 : 0xfef08a, alpha: 0.8 });
    }
  }
  if (kind === "water") {
    const waveA = 10 + ((x + y) % 3);
    const waveB = 22 + ((x - y) % 2);
    g.moveTo(3, waveA).lineTo(29, waveA).moveTo(1, waveB).lineTo(26, waveB).stroke({ width: 1, color: 0xbae6fd, alpha: 0.38 });
  }
}

function getDirectionVector(direction?: string) {
  if (direction === "left") return { x: -1, y: 0 };
  if (direction === "right") return { x: 1, y: 0 };
  if (direction === "up") return { x: 0, y: -1 };
  return { x: 0, y: 1 };
}

function hasTorch(player: PlayerPublicState) {
  return (player as PlayerPublicState & { equippedWeaponItemId?: string | null }).equippedWeaponItemId === "torch";
}

function drawPlayer(g: AnyGraphics, player: PlayerPublicState, isLocal: boolean) {
  const dir = getDirectionVector(player.direction);
  const jacket = isLocal ? 0x2563eb : 0x7c3aed;
  const step = Math.sin(Date.now() / 150 + player.position.x * 0.01 + player.position.y * 0.01) * 1.4;
  if (hasTorch(player)) {
    g.circle(0, 2, 74).fill({ color: 0xfacc15, alpha: 0.08 });
    g.circle(0, 2, 42).fill({ color: 0xf97316, alpha: 0.08 });
  }
  g.ellipse(0, 19, 18, 6).fill({ color: 0x000000, alpha: 0.24 });
  g.roundRect(-8, 9 + step, 5, 12, 3).roundRect(3, 9 - step, 5, 12, 3).fill({ color: 0x1e293b });
  g.roundRect(-11, -8, 22, 25, 7).fill({ color: jacket, alpha: 1 });
  g.roundRect(-4, -5, 8, 19, 3).fill({ color: isLocal ? 0x93c5fd : 0xe9d5ff, alpha: 0.52 });
  g.roundRect(-16 + dir.x * 5, -4 + dir.y * 3, 6, 17, 4).roundRect(10 + dir.x * 5, -4 + dir.y * 3, 6, 17, 4).fill({ color: jacket, alpha: 0.92 });
  g.circle(0, -19, 11).fill({ color: 0xffd3a7 });
  g.roundRect(-9, -30, 18, 9, 6).fill({ color: 0x1e293b });
  g.circle(-4 + dir.x * 2.2, -18 + Math.max(0, dir.y), 1.4).circle(4 + dir.x * 2.2, -18 + Math.max(0, dir.y), 1.4).fill({ color: 0x0f172a });
  g.moveTo(0, -34).lineTo(dir.x * 8, -34 + dir.y * 8).stroke({ width: 3, color: isLocal ? 0x60a5fa : 0xc4b5fd, alpha: 0.95 });
}

function creatureColor(creature: CreaturePublicState) {
  const raw = String((creature as CreaturePublicState & { speciesId?: string; type?: string }).speciesId ?? (creature as CreaturePublicState & { type?: string }).type ?? creature.id);
  const seed = raw.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return [0xef4444, 0xf97316, 0x84cc16, 0x14b8a6, 0x8b5cf6, 0xec4899][seed % 6];
}

function drawCreature(g: AnyGraphics, creature: CreaturePublicState) {
  const hpRatio = Math.max(0, Math.min(1, creature.maxHp > 0 ? creature.hp / creature.maxHp : 0));
  const bob = Math.sin(Date.now() / 220 + creature.position.x * 0.02) * 1.8;
  g.ellipse(0, 23, 24, 8).fill({ color: 0x000000, alpha: 0.23 });
  g.circle(0, bob, 21).fill({ color: creatureColor(creature), alpha: 0.96 });
  g.circle(0, 8 + bob, 12).fill({ color: 0xffedd5, alpha: 0.58 });
  g.circle(-8, -6 + bob, 3).circle(8, -6 + bob, 3).fill({ color: 0x111827 });
  g.roundRect(-23, -38, 46, 6, 3).fill({ color: 0x450a0a, alpha: 0.82 });
  g.roundRect(-23, -38, 46 * hpRatio, 6, 3).fill({ color: hpRatio > 0.45 ? 0x22c55e : 0xef4444, alpha: 0.92 });
}

function drawResource(g: AnyGraphics, resource: ResourceNodeState) {
  const raw = String((resource as ResourceNodeState & { type?: string; resourceType?: string }).type ?? (resource as ResourceNodeState & { resourceType?: string }).resourceType ?? resource.id);
  const tree = raw.includes("wood") || raw.includes("tree");
  const rock = raw.includes("stone") || raw.includes("rock") || raw.includes("ore");
  const body = rock ? 0x94a3b8 : tree ? 0x92400e : 0x65a30d;
  const leaf = rock ? 0xcbd5e1 : tree ? 0x22c55e : 0xa3e635;
  g.ellipse(0, 18, 20, 7).fill({ color: 0x000000, alpha: 0.18 });
  g.roundRect(-7, -6, 14, 29, 5).fill({ color: body, alpha: 0.92 });
  g.circle(-10, -12, 12).circle(2, -18, 14).circle(13, -8, 11).fill({ color: leaf, alpha: 0.82 });
}

function drawBuilding(g: AnyGraphics, building: BuildingState) {
  const type = String(building.type);
  const base = type.includes("stone") ? 0x64748b : type.includes("core") ? 0x1d4ed8 : 0x7c2d12;
  const roof = type.includes("stone") ? 0x475569 : type.includes("core") ? 0x0f172a : 0x78350f;
  g.roundRect(-30, -10, 60, 43, 7).fill({ color: base, alpha: 0.92 });
  g.moveTo(-36, -8).lineTo(0, -38).lineTo(36, -8).stroke({ width: 10, color: roof, alpha: 0.96 });
  g.roundRect(-8, 9, 16, 24, 3).fill({ color: roof, alpha: 0.72 });
}

function colorFromHex(hex: string, fallback: number) {
  const value = Number.parseInt(hex.replace("#", ""), 16);
  return Number.isFinite(value) ? value : fallback;
}

function getBuildPartRenderSort(part: PlacedBuildPart) {
  const definition = BUILD_PARTS[part.partId];
  const iso = buildGridToIsoCenter(part.gridX, part.gridY);
  const layerBias = definition?.category === "roof" ? 36 : definition?.category === "wall" || definition?.category === "door" || definition?.category === "window" ? 18 : 0;
  return iso.y + part.floorLevel * 96 + layerBias;
}

function drawBuildPartPolygon(g: AnyGraphics, points: Array<{ x: number; y: number }>, fill: number, alpha: number, stroke: number, strokeAlpha = 0.7) {
  if (points.length === 0) return;
  g.moveTo(points[0].x, points[0].y);
  for (const point of points.slice(1)) g.lineTo(point.x, point.y);
  g.lineTo(points[0].x, points[0].y).fill({ color: fill, alpha });
  g.moveTo(points[0].x, points[0].y);
  for (const point of points.slice(1)) g.lineTo(point.x, point.y);
  g.lineTo(points[0].x, points[0].y).stroke({ width: previewStrokeWidth(alpha), color: stroke, alpha: strokeAlpha });
}

function previewStrokeWidth(alpha: number) {
  return alpha < 0.5 ? 2.5 : 1.5;
}

function drawBuildPartSelection(g: AnyGraphics, part: PlacedBuildPart, selected: boolean, preview = false, valid = true) {
  if (!selected && !preview) return;
  const definition = BUILD_PARTS[part.partId];
  if (!definition) return;
  const width = definition.width * BUILD_GRID_SIZE;
  const height = definition.height * BUILD_GRID_SIZE;
  const visualY = -part.floorLevel * BUILD_2P5D_FLOOR_HEIGHT + (definition.category === "roof" ? -48 : 0);
  const points = getIsoTilePolygon2p5d({ x: 0, y: visualY, width, height: height * 0.62 });
  const color = preview ? (valid ? 0x86efac : 0xfca5a5) : 0xfacc15;
  if (points.length > 0) {
    g.moveTo(points[0].x, points[0].y);
    for (const point of points.slice(1)) g.lineTo(point.x, point.y);
    g.lineTo(points[0].x, points[0].y).stroke({ width: preview ? 3 : 2, color, alpha: preview ? 0.96 : 0.78 });
  }
}

function drawBuildPart(g: AnyGraphics, part: PlacedBuildPart, preview = false, valid = true, selected = false) {
  const definition = BUILD_PARTS[part.partId];
  if (!definition) return;
  const palette = getMaterialPalette(definition.material);
  const base = preview ? (valid ? 0x22c55e : 0xef4444) : colorFromHex(palette.base, 0x8b5a2b);
  const side = colorFromHex(palette.side, 0x6b3f1d);
  const dark = colorFromHex(palette.dark, 0x3f2412);
  const light = colorFromHex(palette.light, 0xd6a15d);
  const width = definition.width * BUILD_GRID_SIZE;
  const height = definition.height * BUILD_GRID_SIZE;
  const visualY = -part.floorLevel * BUILD_2P5D_FLOOR_HEIGHT;

  if (definition.category === "wall" || definition.category === "door" || definition.category === "window") {
    const wallHeight = definition.id.includes("half") || definition.id.includes("railing") || definition.id.includes("fence") ? 34 : 72;
    const plane = getIsoWallPlane2p5d({ x: 0, y: visualY, width, height, rotation: part.rotation, wallHeight });
    drawBuildPartPolygon(g, [plane.baseStart, plane.baseEnd, plane.topEnd, plane.topStart], preview ? base : side, preview ? 0.25 : 0.92, preview ? base : dark, preview ? 0.95 : 0.72);
    if (!preview) {
      g.moveTo(plane.topStart.x, plane.topStart.y).lineTo(plane.topEnd.x, plane.topEnd.y).stroke({ width: 2, color: light, alpha: 0.32 });
    }
    if (definition.category === "door") {
      const mx = (plane.baseStart.x + plane.baseEnd.x) / 2;
      const my = (plane.baseStart.y + plane.baseEnd.y) / 2;
      g.roundRect(mx - 8, my - wallHeight * 0.68, 16, wallHeight * 0.62, 3).fill({ color: dark, alpha: preview ? 0.26 : 0.62 });
      g.circle(mx + 4, my - wallHeight * 0.38, 1.7).fill({ color: 0xfacc15, alpha: preview ? 0.35 : 0.84 });
    }
    if (definition.category === "window") {
      const mx = (plane.baseStart.x + plane.baseEnd.x) / 2;
      const my = (plane.baseStart.y + plane.baseEnd.y) / 2;
      g.roundRect(mx - 10, my - wallHeight * 0.62, 20, 14, 3).fill({ color: 0xbae6fd, alpha: preview ? 0.25 : 0.62 });
      g.moveTo(mx, my - wallHeight * 0.62).lineTo(mx, my - wallHeight * 0.62 + 14).stroke({ width: 1, color: 0x0f172a, alpha: 0.28 });
    }
    drawBuildPartSelection(g, part, selected, preview, valid);
    return;
  }

  const roofOffset = definition.category === "roof" ? -48 : 0;
  const points = getIsoTilePolygon2p5d({ x: 0, y: visualY + roofOffset, width, height: height * 0.62 });
  drawBuildPartPolygon(g, points, definition.category === "roof" && !preview ? dark : base, preview ? 0.25 : 0.94, definition.category === "roof" ? light : dark, preview ? 0.9 : 0.58);
  if (definition.category === "floor" && !preview) {
    const inner = getIsoTilePolygon2p5d({ x: 0, y: visualY, width: Math.max(0, width - 12), height: Math.max(0, height * 0.62 - 12) });
    if (inner.length > 0) {
      g.moveTo(inner[0].x, inner[0].y);
      for (const point of inner.slice(1)) g.lineTo(point.x, point.y);
      g.lineTo(inner[0].x, inner[0].y).stroke({ width: 1, color: light, alpha: 0.22 });
    }
  }
  drawBuildPartSelection(g, part, selected, preview, valid);
}

function sameTile(a: PlayerPublicState, b: PlayerPublicState) {
  const ta = (a as PlayerPublicState & { currentTile?: { regionId?: string; tileX?: number; tileY?: number } }).currentTile;
  const tb = (b as PlayerPublicState & { currentTile?: { regionId?: string; tileX?: number; tileY?: number } }).currentTile;
  if (!ta || !tb) return true;
  return ta.regionId === tb.regionId && ta.tileX === tb.tileX && ta.tileY === tb.tileY;
}

function drawNight(g: AnyGraphics, width: number, height: number, cameraX: number, cameraY: number, players: Array<{ player: PlayerPublicState; isLocal: boolean }>) {
  g.clear();
  if (typeof document === "undefined" || !document.querySelector(".game-shell--night")) return;
  g.rect(0, 0, width, height).fill({ color: 0x01030a, alpha: 0.54 });
  for (const entry of players) {
    const x = entry.player.position.x - cameraX;
    const y = entry.player.position.y - cameraY;
    const radius = hasTorch(entry.player) ? 172 : entry.isLocal ? 54 : 0;
    if (radius <= 0) continue;
    g.circle(x, y, radius).fill({ color: hasTorch(entry.player) ? 0xfacc15 : 0x93c5fd, alpha: hasTorch(entry.player) ? 0.13 : 0.055 });
    g.circle(x, y, radius * 0.62).fill({ color: hasTorch(entry.player) ? 0xffedd5 : 0xbfdbfe, alpha: hasTorch(entry.player) ? 0.095 : 0.04 });
  }
}

export function PixiGameCanvas({ enabled = false, snapshot, localPlayerId }: PixiGameCanvasProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const snapshotRef = useRef<WorldSnapshot | null>(snapshot);
  const localPlayerIdRef = useRef(localPlayerId);
  const remotePlayersRef = useRef<PlayerPublicState[]>([]);
  const remoteBuildingsRef = useRef<BuildingState[]>([]);
  const buildPartsStateRef = useRef<BuildPartsState>({ parts: [] });
  const frameIdRef = useRef(0);

  useEffect(() => { snapshotRef.current = snapshot; }, [snapshot]);
  useEffect(() => { localPlayerIdRef.current = localPlayerId; }, [localPlayerId]);

  useEffect(() => {
    const onSnapshot = (event: Event) => { const detail = (event as PixiSnapshotEvent).detail; if (detail) snapshotRef.current = detail; };
    const onRemotePlayers = (event: Event) => { remotePlayersRef.current = (event as RemotePlayersEvent).detail?.players ?? []; };
    const onRemoteBuildings = (event: Event) => { remoteBuildingsRef.current = (event as RemoteBuildingsEvent).detail?.buildings ?? []; };
    const onBuildParts = (event: Event) => { buildPartsStateRef.current = (event as BuildPartsEvent).detail ?? { parts: [] }; };
    window.addEventListener("palpalworld:pixi-snapshot", onSnapshot);
    window.addEventListener("palpalworld:remote-players", onRemotePlayers);
    window.addEventListener("palpalworld:remote-buildings", onRemoteBuildings);
    window.addEventListener("palpalworld:pixi-build-parts", onBuildParts);
    return () => {
      window.removeEventListener("palpalworld:pixi-snapshot", onSnapshot);
      window.removeEventListener("palpalworld:remote-players", onRemotePlayers);
      window.removeEventListener("palpalworld:remote-buildings", onRemoteBuildings);
      window.removeEventListener("palpalworld:pixi-build-parts", onBuildParts);
    };
  }, []);

  useEffect(() => {
    if (!enabled || !hostRef.current) return;
    let disposed = false;
    let cleanup: (() => void) | null = null;

    async function start() {
      const host = hostRef.current;
      if (!host || disposed) return;
      const PIXI = await loadPixiRuntime();
      if (!hostRef.current || disposed) return;
