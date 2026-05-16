"use client";

import type { BuildingState, CreaturePublicState, PlayerPublicState, ResourceNodeState, WorldSnapshot } from "@palpalworld/shared";
import { useEffect, useRef } from "react";
import { createPixiCamera, resizePixiCamera, centerPixiCameraOn } from "./PixiCamera";

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

type Layers = {
  world: AnyContainer;
  terrain: AnyContainer;
  buildings: AnyContainer;
  resources: AnyContainer;
  creatures: AnyContainer;
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
  const players = new PIXI.Container();
  const lighting = new PIXI.Container();
  const debug = new PIXI.Container();

  world.sortableChildren = true;
  buildings.sortableChildren = true;
  resources.sortableChildren = true;
  creatures.sortableChildren = true;
  players.sortableChildren = true;

  world.addChild(terrain, buildings, resources, creatures, players);
  app.stage.addChild(world, lighting, debug);
  return { world, terrain, buildings, resources, creatures, players, lighting, debug };
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
  g.moveTo(0, -34).lineTo(dir.x * 8, -34 + dir.y * 8).stroke({ width: 3, color: isLocal ? 0xffff00 : 0xc4b5fd, alpha: 0.95 });
  if (isLocal) {
    g.moveTo(-22, 0).lineTo(22, 0).moveTo(0, -22).lineTo(0, 22).stroke({ width: 3, color: 0xffff00, alpha: 0.95 });
    g.circle(0, 0, 6).fill({ color: 0xff00ff, alpha: 0.9 });
  }
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
  const frameIdRef = useRef(0);

  useEffect(() => { snapshotRef.current = snapshot; }, [snapshot]);
  useEffect(() => { localPlayerIdRef.current = localPlayerId; }, [localPlayerId]);

  useEffect(() => {
    const onSnapshot = (event: Event) => { const detail = (event as PixiSnapshotEvent).detail; if (detail) snapshotRef.current = detail; };
    const onRemotePlayers = (event: Event) => { remotePlayersRef.current = (event as RemotePlayersEvent).detail?.players ?? []; };
    const onRemoteBuildings = (event: Event) => { remoteBuildingsRef.current = (event as RemoteBuildingsEvent).detail?.buildings ?? []; };
    window.addEventListener("palpalworld:pixi-snapshot", onSnapshot);
    window.addEventListener("palpalworld:remote-players", onRemotePlayers);
    window.addEventListener("palpalworld:remote-buildings", onRemoteBuildings);
    return () => {
      window.removeEventListener("palpalworld:pixi-snapshot", onSnapshot);
      window.removeEventListener("palpalworld:remote-players", onRemotePlayers);
      window.removeEventListener("palpalworld:remote-buildings", onRemoteBuildings);
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

      const app = new PIXI.Application();
      await app.init({ resizeTo: host, antialias: false, backgroundAlpha: 0, autoDensity: true, resolution: Math.min(window.devicePixelRatio || 1, 2) });
      if (disposed || !hostRef.current) { app.destroy(true); return; }
      app.canvas.style.display = "block";
      app.canvas.style.width = "100%";
      app.canvas.style.height = "100%";
      host.appendChild(app.canvas);

      const camera = createPixiCamera(host.clientWidth || 1, host.clientHeight || 1);
      const layers = makeLayers(PIXI, app);
      const terrainNodes = new Map<string, NodeRecord>();
      const playerNodes = new Map<string, NodeRecord>();
      const creatureNodes = new Map<string, NodeRecord>();
      const resourceNodes = new Map<string, NodeRecord>();
      const buildingNodes = new Map<string, NodeRecord>();
      const lightingGraphics = new PIXI.Graphics();
      const debugText = new PIXI.Text({ text: "pixi boot", style: { fill: 0xffffff, fontSize: 12, fontFamily: "monospace" } });
      layers.lighting.addChild(lightingGraphics);
      layers.debug.addChild(debugText);

      const resize = () => resizePixiCamera(camera, host.clientWidth || 1, host.clientHeight || 1);
      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(host);

      app.ticker.add(() => {
        if (disposed || !hostRef.current) return;
        const currentSnapshot = snapshotRef.current;
        const localPlayer = currentSnapshot?.players.find((player) => player.id === localPlayerIdRef.current) ?? currentSnapshot?.players[0];
        const frameId = ++frameIdRef.current;
        if (localPlayer) centerPixiCameraOn(camera, localPlayer.position);

        layers.world.position.set(-camera.x * camera.zoom, -camera.y * camera.zoom);
        layers.world.scale.set(camera.zoom);
        layers.lighting.position.set(0, 0);
        layers.lighting.scale.set(1);
        layers.debug.position.set(0, 0);
        layers.debug.scale.set(1);

        const startTileX = Math.floor(camera.x / terrainTileSize) - terrainPaddingTiles;
        const startTileY = Math.floor(camera.y / terrainTileSize) - terrainPaddingTiles;
        const endTileX = Math.ceil((camera.x + host.clientWidth) / terrainTileSize) + terrainPaddingTiles;
        const endTileY = Math.ceil((camera.y + host.clientHeight) / terrainTileSize) + terrainPaddingTiles;
        for (let tileY = startTileY; tileY <= endTileY; tileY += 1) {
          for (let tileX = startTileX; tileX <= endTileX; tileX += 1) {
            const key = `${tileX}:${tileY}`;
            const node = upsertNode(PIXI, layers.terrain, terrainNodes, key, frameId);
            node.container.position.set(tileX * terrainTileSize, tileY * terrainTileSize);
            node.container.zIndex = -100000 + tileY;
            drawTerrain(node.graphics, tileX, tileY);
          }
        }
        pruneNodes(layers.terrain, terrainNodes, frameId);

        const localBuildingIds = new Set((currentSnapshot?.buildings ?? []).map((building) => building.id));
        const buildings = [...(currentSnapshot?.buildings ?? []), ...remoteBuildingsRef.current.filter((building) => !localBuildingIds.has(building.id))];
        const resources = (currentSnapshot?.resources ?? []).filter((resource) => ((resource as ResourceNodeState & { remainingAmount?: number }).remainingAmount ?? 1) > 0);
        const creatures = (currentSnapshot?.creatures ?? []).filter((creature) => creature.hp > 0);
        const remotePlayers = remotePlayersRef.current.filter((player) => !localPlayer || (player.id !== localPlayer.id && sameTile(localPlayer, player)));
        const players = [
          ...(localPlayer ? [{ player: localPlayer, isLocal: true }] : []),
          ...remotePlayers.map((player) => ({ player, isLocal: false })),
        ].sort((a, b) => a.player.position.y - b.player.position.y);

        for (const building of buildings) {
          const node = upsertNode(PIXI, layers.buildings, buildingNodes, building.id, frameId);
          node.container.position.set(building.position.x, building.position.y);
          node.container.zIndex = building.position.y + 8;
          drawBuilding(node.graphics, building);
        }
        pruneNodes(layers.buildings, buildingNodes, frameId);

        for (const resource of resources) {
          const node = upsertNode(PIXI, layers.resources, resourceNodes, resource.id, frameId);
          node.container.position.set(resource.position.x, resource.position.y);
          node.container.zIndex = resource.position.y - 12;
          drawResource(node.graphics, resource);
        }
        pruneNodes(layers.resources, resourceNodes, frameId);

        for (const creature of creatures) {
          const node = upsertNode(PIXI, layers.creatures, creatureNodes, creature.id, frameId);
          node.container.position.set(creature.position.x, creature.position.y);
          node.container.zIndex = creature.position.y - 4;
          drawCreature(node.graphics, creature);
        }
        pruneNodes(layers.creatures, creatureNodes, frameId);

        for (const entry of players) {
          const node = upsertNode(PIXI, layers.players, playerNodes, entry.player.id, frameId);
          node.container.position.set(entry.player.position.x, entry.player.position.y);
          node.container.zIndex = entry.player.position.y + 24;
          drawPlayer(node.graphics, entry.player, entry.isLocal);
        }
        pruneNodes(layers.players, playerNodes, frameId);

        drawNight(lightingGraphics, host.clientWidth || 1, host.clientHeight || 1, camera.x, camera.y, players);
        debugText.text = `pixi p:${players.length} c:${creatures.length} r:${resources.length} b:${buildings.length} snap:${currentSnapshot ? 1 : 0}`;
        debugText.position.set(8, 8);
      });

      cleanup = () => {
        resizeObserver.disconnect();
        app.destroy(true, { children: true });
      };
    }

    void start();
    return () => { disposed = true; cleanup?.(); cleanup = null; };
  }, [enabled]);

  return <div ref={hostRef} className={enabled ? "pixi-game-canvas pixi-game-canvas--enabled" : "pixi-game-canvas"} aria-hidden={!enabled} />;
}
