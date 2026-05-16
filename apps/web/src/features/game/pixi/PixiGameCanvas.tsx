"use client";

import type { BuildingState, CreaturePublicState, PlayerPublicState, ResourceNodeState, WorldSnapshot } from "@palpalworld/shared";
import { useEffect, useRef } from "react";
import { createPixiCamera, resizePixiCamera, centerPixiCameraOn } from "./PixiCamera";
import { BUILD_GRID_SIZE } from "../../buildings/buildGrid";
import { BUILD_PARTS, type BuildFloorLevel, type BuildPartId, type BuildPartRotation, type PlacedBuildPart } from "../../buildings/buildPartCatalog";
import { buildGridToIsoCenter, getIsoTilePolygon2p5d, getIsoWallPlane2p5d } from "../../buildings/buildProjection2p5d";
import { BUILD_2P5D_FLOOR_HEIGHT, getMaterialPalette } from "../../buildings/buildPartVisual2p5d";

export type PixiGameCanvasProps = { enabled?: boolean; snapshot: WorldSnapshot | null; localPlayerId: string };
type PIXIType = typeof import("pixi.js");
type G = any;
type C = any;
type NodeRecord = { container: C; graphics: G; lastSeenFrame: number; signature?: string };
type BuildPartPreviewState = { partId: BuildPartId; position: { x: number; y: number }; gridX?: number; gridY?: number; rotation: BuildPartRotation; floorLevel: BuildFloorLevel; valid: boolean };
type BuildPartsState = { parts: PlacedBuildPart[]; selectedPartId?: string | null; selectedHouseId?: string | null; preview?: BuildPartPreviewState | null };

const TILE = 32;
const PAD = 4;
let pixiPromise: Promise<PIXIType> | null = null;
function loadPixi() { pixiPromise ??= import("pixi.js"); return pixiPromise; }
function debugOn() { return typeof window !== "undefined" && window.localStorage.getItem("palpalworld.dev.pixiDebug") === "true"; }
function hash(x: number, y: number) { let v = x * 374761393 + y * 668265263; v = Math.imul(v ^ (v >> 13), 1274126177); return (v ^ (v >> 16)) >>> 0; }
function tileKind(x: number, y: number) { const r = Math.abs(x - (Math.sin(y * 0.11) * 9 + Math.cos(y * 0.035) * 5)); if (r < 2.2) return "water"; if (r < 3.2) return "dirt"; const p = Math.abs(y - Math.sin(x * 0.12) * 6 - 7); if (p < 1.2 && x > -18 && x < 42) return "dirt"; const roll = hash(x, y) % 100; return roll < 8 ? "grass_dark" : roll < 15 ? "grass_light" : roll < 20 ? "flower" : "grass"; }
function tileColor(k: string) { return k === "water" ? 0x0ea5e9 : k === "dirt" ? 0x92400e : k === "grass_dark" ? 0x166534 : k === "grass_light" ? 0x4ade80 : k === "flower" ? 0x22c55e : 0x15803d; }
function hex(c: string, fallback: number) { const n = Number.parseInt(c.replace("#", ""), 16); return Number.isFinite(n) ? n : fallback; }
function hasTorch(p: PlayerPublicState) { return (p as PlayerPublicState & { equippedWeaponItemId?: string | null }).equippedWeaponItemId === "torch"; }
function dirVector(d?: string) { return d === "left" ? { x: -1, y: 0 } : d === "right" ? { x: 1, y: 0 } : d === "up" ? { x: 0, y: -1 } : { x: 0, y: 1 }; }
function sameTile(a: PlayerPublicState, b: PlayerPublicState) { const ta = (a as any).currentTile; const tb = (b as any).currentTile; return !ta || !tb || (ta.regionId === tb.regionId && ta.tileX === tb.tileX && ta.tileY === tb.tileY); }

function makeLayers(PIXI: PIXIType, app: any) {
  const world = new PIXI.Container(); const terrain = new PIXI.Container(); const buildings = new PIXI.Container(); const resources = new PIXI.Container(); const creatures = new PIXI.Container(); const buildParts = new PIXI.Container(); const players = new PIXI.Container(); const lighting = new PIXI.Container(); const debug = new PIXI.Container();
  world.sortableChildren = true; buildings.sortableChildren = true; resources.sortableChildren = true; creatures.sortableChildren = true; buildParts.sortableChildren = true; players.sortableChildren = true;
  terrain.zIndex = -100000; buildings.zIndex = 0; resources.zIndex = 10; creatures.zIndex = 20; buildParts.zIndex = 30; players.zIndex = 40;
  world.addChild(terrain, buildings, resources, creatures, buildParts, players); app.stage.addChild(world, lighting, debug);
  return { world, terrain, buildings, resources, creatures, buildParts, players, lighting, debug };
}
function upsert(PIXI: PIXIType, layer: C, nodes: Map<string, NodeRecord>, id: string, frame: number) { let n = nodes.get(id); if (!n) { const container = new PIXI.Container(); const graphics = new PIXI.Graphics(); container.addChild(graphics); layer.addChild(container); n = { container, graphics, lastSeenFrame: frame }; nodes.set(id, n); } n.lastSeenFrame = frame; n.container.visible = true; return n; }
function prune(layer: C, nodes: Map<string, NodeRecord>, frame: number) { for (const [id, n] of nodes) if (n.lastSeenFrame !== frame) { layer.removeChild(n.container); n.container.destroy({ children: true }); nodes.delete(id); } }
function redraw(n: NodeRecord, sig: string, draw: () => void) { if (n.signature === sig) return; n.signature = sig; n.graphics.clear(); draw(); }

function drawTerrain(g: G, x: number, y: number) { const k = tileKind(x, y); g.rect(0, 0, TILE, TILE).fill({ color: tileColor(k), alpha: 1 }); if (k === "flower") { const s = hash(x, y); for (let i = 0; i < 3; i++) g.circle(7 + ((s >> (i * 4)) & 15), 7 + ((s >> (i * 5 + 3)) & 15), 1.6).fill({ color: i % 2 ? 0xfef08a : 0xf9a8d4, alpha: 0.8 }); } if (k === "water") g.moveTo(3, 10).lineTo(29, 10).moveTo(1, 22).lineTo(26, 22).stroke({ width: 1, color: 0xbae6fd, alpha: 0.38 }); }
function drawPlayer(g: G, p: PlayerPublicState, local: boolean) { const d = dirVector(p.direction); const jacket = local ? 0x2563eb : 0x7c3aed; const step = Math.sin(Date.now() / 150 + p.position.x * 0.01) * 1.4; if (hasTorch(p)) { g.circle(0, 2, 74).fill({ color: 0xfacc15, alpha: 0.08 }); g.circle(0, 2, 42).fill({ color: 0xf97316, alpha: 0.08 }); } g.ellipse(0, 19, 18, 6).fill({ color: 0x000000, alpha: 0.24 }); g.roundRect(-8, 9 + step, 5, 12, 3).roundRect(3, 9 - step, 5, 12, 3).fill({ color: 0x1e293b }); g.roundRect(-11, -8, 22, 25, 7).fill({ color: jacket }); g.roundRect(-4, -5, 8, 19, 3).fill({ color: local ? 0x93c5fd : 0xe9d5ff, alpha: 0.52 }); g.roundRect(-16 + d.x * 5, -4 + d.y * 3, 6, 17, 4).roundRect(10 + d.x * 5, -4 + d.y * 3, 6, 17, 4).fill({ color: jacket, alpha: 0.92 }); g.circle(0, -19, 11).fill({ color: 0xffd3a7 }); g.roundRect(-9, -30, 18, 9, 6).fill({ color: 0x1e293b }); g.circle(-4 + d.x * 2.2, -18 + Math.max(0, d.y), 1.4).circle(4 + d.x * 2.2, -18 + Math.max(0, d.y), 1.4).fill({ color: 0x0f172a }); g.moveTo(0, -34).lineTo(d.x * 8, -34 + d.y * 8).stroke({ width: 3, color: local ? 0x60a5fa : 0xc4b5fd, alpha: 0.95 }); }
function drawCreature(g: G, c: CreaturePublicState) { const hp = Math.max(0, Math.min(1, c.maxHp > 0 ? c.hp / c.maxHp : 0)); const bob = Math.sin(Date.now() / 220 + c.position.x * 0.02) * 1.8; const seed = String((c as any).speciesId ?? (c as any).type ?? c.id).split("").reduce((s, ch) => s + ch.charCodeAt(0), 0); const body = [0xef4444, 0xf97316, 0x84cc16, 0x14b8a6, 0x8b5cf6, 0xec4899][seed % 6]; g.ellipse(0, 23, 24, 8).fill({ color: 0, alpha: 0.23 }); g.circle(0, bob, 21).fill({ color: body, alpha: 0.96 }); g.circle(0, 8 + bob, 12).fill({ color: 0xffedd5, alpha: 0.58 }); g.circle(-8, -6 + bob, 3).circle(8, -6 + bob, 3).fill({ color: 0x111827 }); g.roundRect(-23, -38, 46, 6, 3).fill({ color: 0x450a0a, alpha: 0.82 }); g.roundRect(-23, -38, 46 * hp, 6, 3).fill({ color: hp > 0.45 ? 0x22c55e : 0xef4444, alpha: 0.92 }); }
function drawResource(g: G, r: ResourceNodeState) { const raw = String((r as any).type ?? (r as any).resourceType ?? r.id); const rock = raw.includes("stone") || raw.includes("rock") || raw.includes("ore"); const tree = raw.includes("wood") || raw.includes("tree"); g.ellipse(0, 18, 20, 7).fill({ color: 0, alpha: 0.18 }); g.roundRect(-7, -6, 14, 29, 5).fill({ color: rock ? 0x94a3b8 : tree ? 0x92400e : 0x65a30d, alpha: 0.92 }); g.circle(-10, -12, 12).circle(2, -18, 14).circle(13, -8, 11).fill({ color: rock ? 0xcbd5e1 : tree ? 0x22c55e : 0xa3e635, alpha: 0.82 }); }
function drawBuilding(g: G, b: BuildingState) { const t = String(b.type); const base = t.includes("stone") ? 0x64748b : t.includes("core") ? 0x1d4ed8 : 0x7c2d12; const roof = t.includes("stone") ? 0x475569 : t.includes("core") ? 0x0f172a : 0x78350f; g.roundRect(-30, -10, 60, 43, 7).fill({ color: base, alpha: 0.92 }); g.moveTo(-36, -8).lineTo(0, -38).lineTo(36, -8).stroke({ width: 10, color: roof, alpha: 0.96 }); g.roundRect(-8, 9, 16, 24, 3).fill({ color: roof, alpha: 0.72 }); }
function poly(g: G, pts: Array<{ x: number; y: number }>, fill: number, alpha: number, stroke: number, sw = 1.5) { if (!pts.length) return; g.moveTo(pts[0].x, pts[0].y); for (const p of pts.slice(1)) g.lineTo(p.x, p.y); g.lineTo(pts[0].x, pts[0].y).fill({ color: fill, alpha }); g.moveTo(pts[0].x, pts[0].y); for (const p of pts.slice(1)) g.lineTo(p.x, p.y); g.lineTo(pts[0].x, pts[0].y).stroke({ width: sw, color: stroke, alpha: 0.7 }); }
function buildSort(part: PlacedBuildPart) { const def = BUILD_PARTS[part.partId]; const iso = buildGridToIsoCenter(part.gridX, part.gridY); const bias = def?.category === "roof" ? 36 : def?.category === "wall" || def?.category === "door" || def?.category === "window" ? 18 : 0; return iso.y + part.floorLevel * 96 + bias; }
function buildSig(p: PlacedBuildPart, selected: boolean, preview = false, valid = true) { return `${p.partId}:${p.gridX}:${p.gridY}:${p.floorLevel}:${p.rotation}:${selected ? 1 : 0}:${preview ? 1 : 0}:${valid ? 1 : 0}`; }
function drawBuildPart(g: G, part: PlacedBuildPart, preview = false, valid = true, selected = false) { const def = BUILD_PARTS[part.partId]; if (!def) return; const pal = getMaterialPalette(def.material); const base = preview ? (valid ? 0x22c55e : 0xef4444) : hex(pal.base, 0x8b5a2b); const side = hex(pal.side, 0x6b3f1d); const dark = hex(pal.dark, 0x3f2412); const light = hex(pal.light, 0xd6a15d); const w = def.width * BUILD_GRID_SIZE; const h = def.height * BUILD_GRID_SIZE; const y = -part.floorLevel * BUILD_2P5D_FLOOR_HEIGHT; if (def.category === "wall" || def.category === "door" || def.category === "window") { const wh = def.id.includes("half") || def.id.includes("railing") || def.id.includes("fence") ? 34 : 72; const pl = getIsoWallPlane2p5d({ x: 0, y, width: w, height: h, rotation: part.rotation, wallHeight: wh }); poly(g, [pl.baseStart, pl.baseEnd, pl.topEnd, pl.topStart], preview ? base : side, preview ? 0.25 : 0.92, preview ? base : dark, preview ? 2.5 : 1.5); if (!preview) g.moveTo(pl.topStart.x, pl.topStart.y).lineTo(pl.topEnd.x, pl.topEnd.y).stroke({ width: 2, color: light, alpha: 0.32 }); if (def.category === "door") { const mx = (pl.baseStart.x + pl.baseEnd.x) / 2; const my = (pl.baseStart.y + pl.baseEnd.y) / 2; g.roundRect(mx - 8, my - wh * 0.68, 16, wh * 0.62, 3).fill({ color: dark, alpha: preview ? 0.26 : 0.62 }); g.circle(mx + 4, my - wh * 0.38, 1.7).fill({ color: 0xfacc15, alpha: preview ? 0.35 : 0.84 }); } if (def.category === "window") { const mx = (pl.baseStart.x + pl.baseEnd.x) / 2; const my = (pl.baseStart.y + pl.baseEnd.y) / 2; g.roundRect(mx - 10, my - wh * 0.62, 20, 14, 3).fill({ color: 0xbae6fd, alpha: preview ? 0.25 : 0.62 }); } } else { const ry = y + (def.category === "roof" ? -48 : 0); const pts = getIsoTilePolygon2p5d({ x: 0, y: ry, width: w, height: h * 0.62 }); poly(g, pts, def.category === "roof" && !preview ? dark : base, preview ? 0.25 : 0.94, def.category === "roof" ? light : dark, preview ? 2.5 : 1.5); } if (preview || selected) { const pts = getIsoTilePolygon2p5d({ x: 0, y: y + (def.category === "roof" ? -48 : 0), width: w, height: h * 0.62 }); if (pts.length) { g.moveTo(pts[0].x, pts[0].y); for (const p of pts.slice(1)) g.lineTo(p.x, p.y); g.lineTo(pts[0].x, pts[0].y).stroke({ width: preview ? 3 : 2, color: preview ? (valid ? 0x86efac : 0xfca5a5) : 0xfacc15, alpha: preview ? 0.96 : 0.78 }); } } }
function drawNight(g: G, w: number, h: number, cx: number, cy: number, players: Array<{ player: PlayerPublicState; isLocal: boolean }>) { g.clear(); if (typeof document === "undefined" || !document.querySelector(".game-shell--night")) return; g.rect(0, 0, w, h).fill({ color: 0x01030a, alpha: 0.54 }); for (const e of players) { const r = hasTorch(e.player) ? 172 : e.isLocal ? 54 : 0; if (!r) continue; const x = e.player.position.x - cx, y = e.player.position.y - cy; g.circle(x, y, r).fill({ color: hasTorch(e.player) ? 0xfacc15 : 0x93c5fd, alpha: hasTorch(e.player) ? 0.13 : 0.055 }); g.circle(x, y, r * 0.62).fill({ color: hasTorch(e.player) ? 0xffedd5 : 0xbfdbfe, alpha: hasTorch(e.player) ? 0.095 : 0.04 }); } }

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
    const onSnapshot = (e: Event) => { const d = (e as CustomEvent<WorldSnapshot>).detail; if (d) snapshotRef.current = d; };
    const onRemotePlayers = (e: Event) => { remotePlayersRef.current = (e as CustomEvent<{ players?: PlayerPublicState[] }>).detail?.players ?? []; };
    const onRemoteBuildings = (e: Event) => { remoteBuildingsRef.current = (e as CustomEvent<{ buildings?: BuildingState[] }>).detail?.buildings ?? []; };
    const onBuildParts = (e: Event) => { buildPartsStateRef.current = (e as CustomEvent<BuildPartsState>).detail ?? { parts: [] }; };
    window.addEventListener("palpalworld:pixi-snapshot", onSnapshot); window.addEventListener("palpalworld:remote-players", onRemotePlayers); window.addEventListener("palpalworld:remote-buildings", onRemoteBuildings); window.addEventListener("palpalworld:pixi-build-parts", onBuildParts);
    return () => { window.removeEventListener("palpalworld:pixi-snapshot", onSnapshot); window.removeEventListener("palpalworld:remote-players", onRemotePlayers); window.removeEventListener("palpalworld:remote-buildings", onRemoteBuildings); window.removeEventListener("palpalworld:pixi-build-parts", onBuildParts); };
  }, []);

  useEffect(() => {
    if (!enabled || !hostRef.current) return;
    let disposed = false; let cleanup: (() => void) | null = null;
    async function start() {
      const host = hostRef.current; if (!host || disposed) return;
      const PIXI = await loadPixi(); if (!hostRef.current || disposed) return;
      const app = new PIXI.Application();
      await app.init({ resizeTo: host, antialias: false, backgroundAlpha: 0, autoDensity: true, resolution: Math.min(window.devicePixelRatio || 1, 1.5) });
      if (disposed || !hostRef.current) { app.destroy(true); return; }
      app.canvas.style.display = "block"; app.canvas.style.width = "100%"; app.canvas.style.height = "100%"; host.appendChild(app.canvas);
      const camera = createPixiCamera(host.clientWidth || 1, host.clientHeight || 1);
      const layers = makeLayers(PIXI, app);
      const terrainNodes = new Map<string, NodeRecord>(), playerNodes = new Map<string, NodeRecord>(), creatureNodes = new Map<string, NodeRecord>(), resourceNodes = new Map<string, NodeRecord>(), buildingNodes = new Map<string, NodeRecord>(), buildPartNodes = new Map<string, NodeRecord>();
      const lightingGraphics = new PIXI.Graphics(); const debugText = new PIXI.Text({ text: "", style: { fill: 0xffffff, fontSize: 12, fontFamily: "monospace", stroke: { color: 0x000000, width: 3 } } });
      layers.lighting.addChild(lightingGraphics); layers.debug.addChild(debugText);
      const resize = () => resizePixiCamera(camera, host.clientWidth || 1, host.clientHeight || 1); const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(host);
      app.ticker.add(() => {
        if (disposed || !hostRef.current) return;
        const snap = snapshotRef.current; const local = snap?.players.find((p) => p.id === localPlayerIdRef.current) ?? snap?.players[0]; const frame = ++frameIdRef.current;
        if (local) centerPixiCameraOn(camera, local.position);
        layers.world.position.set(-camera.x * camera.zoom, -camera.y * camera.zoom); layers.world.scale.set(camera.zoom); layers.lighting.position.set(0, 0); layers.debug.position.set(0, 0);
        const sx = Math.floor(camera.x / TILE) - PAD, sy = Math.floor(camera.y / TILE) - PAD, ex = Math.ceil((camera.x + host.clientWidth) / TILE) + PAD, ey = Math.ceil((camera.y + host.clientHeight) / TILE) + PAD;
        for (let y = sy; y <= ey; y++) for (let x = sx; x <= ex; x++) { const key = `${x}:${y}`; const n = upsert(PIXI, layers.terrain, terrainNodes, key, frame); n.container.position.set(x * TILE, y * TILE); n.container.zIndex = -100000 + y; redraw(n, key, () => drawTerrain(n.graphics, x, y)); }
        prune(layers.terrain, terrainNodes, frame);
        const localBuildingIds = new Set((snap?.buildings ?? []).map((b) => b.id)); const buildings = [...(snap?.buildings ?? []), ...remoteBuildingsRef.current.filter((b) => !localBuildingIds.has(b.id))]; const resources = (snap?.resources ?? []).filter((r) => ((r as any).remainingAmount ?? 1) > 0); const creatures = (snap?.creatures ?? []).filter((c) => c.hp > 0); const players = [...(local ? [{ player: local, isLocal: true }] : []), ...remotePlayersRef.current.filter((p) => !local || (p.id !== local.id && sameTile(local, p))).map((p) => ({ player: p, isLocal: false }))].sort((a, b) => a.player.position.y - b.player.position.y);
        for (const b of buildings) { const n = upsert(PIXI, layers.buildings, buildingNodes, b.id, frame); n.container.position.set(b.position.x, b.position.y); n.container.zIndex = b.position.y + 8; redraw(n, `${b.type}:${b.hp}:${b.maxHp}:${Math.round(b.position.x)}:${Math.round(b.position.y)}`, () => drawBuilding(n.graphics, b)); } prune(layers.buildings, buildingNodes, frame);
        for (const r of resources) { const n = upsert(PIXI, layers.resources, resourceNodes, r.id, frame); n.container.position.set(r.position.x, r.position.y); n.container.zIndex = r.position.y - 12; redraw(n, `${(r as any).type ?? (r as any).resourceType}:${(r as any).remainingAmount ?? 1}`, () => drawResource(n.graphics, r)); } prune(layers.resources, resourceNodes, frame);
        for (const c of creatures) { const n = upsert(PIXI, layers.creatures, creatureNodes, c.id, frame); n.container.position.set(c.position.x, c.position.y); n.container.zIndex = c.position.y - 4; n.graphics.clear(); drawCreature(n.graphics, c); } prune(layers.creatures, creatureNodes, frame);
        const parts = buildPartsStateRef.current.parts ?? []; const selected = buildPartsStateRef.current.selectedPartId ?? null;
        for (const p of parts) { const def = BUILD_PARTS[p.partId]; if (!def) continue; const n = upsert(PIXI, layers.buildParts, buildPartNodes, p.id, frame); const iso = buildGridToIsoCenter(p.gridX, p.gridY); n.container.position.set(iso.x, iso.y); n.container.zIndex = buildSort(p); redraw(n, buildSig(p, selected === p.id), () => drawBuildPart(n.graphics, p, false, true, selected === p.id)); }
        const preview = buildPartsStateRef.current.preview; if (preview) { const gridX = typeof preview.gridX === "number" ? preview.gridX : Math.round(preview.position.x / BUILD_GRID_SIZE); const gridY = typeof preview.gridY === "number" ? preview.gridY : Math.round(preview.position.y / BUILD_GRID_SIZE); const p: PlacedBuildPart = { id: "__preview_build_part__", partId: preview.partId, ownerPlayerId: "preview", regionId: "preview", tileX: 0, tileY: 0, gridX, gridY, floorLevel: preview.floorLevel, rotation: preview.rotation, hp: 1, maxHp: 1, createdAt: 0, updatedAt: 0 }; const n = upsert(PIXI, layers.buildParts, buildPartNodes, p.id, frame); const iso = buildGridToIsoCenter(gridX, gridY); n.container.position.set(iso.x, iso.y); n.container.zIndex = buildSort(p) + 999; redraw(n, buildSig(p, false, true, preview.valid), () => drawBuildPart(n.graphics, p, true, preview.valid)); }
        prune(layers.buildParts, buildPartNodes, frame);
        for (const e of players) { const n = upsert(PIXI, layers.players, playerNodes, e.player.id, frame); n.container.position.set(e.player.position.x, e.player.position.y); n.container.zIndex = e.player.position.y + 24; n.graphics.clear(); drawPlayer(n.graphics, e.player, e.isLocal); } prune(layers.players, playerNodes, frame);
        drawNight(lightingGraphics, host.clientWidth || 1, host.clientHeight || 1, camera.x, camera.y, players);
        if (debugOn()) { debugText.visible = true; debugText.text = `pixi p:${players.length} c:${creatures.length} r:${resources.length} b:${buildings.length} parts:${parts.length} snap:${snap ? 1 : 0}`; debugText.position.set(10, Math.max(72, (host.clientHeight || 120) - 34)); } else { debugText.visible = false; debugText.text = ""; }
      });
      cleanup = () => { resizeObserver.disconnect(); app.destroy(true, { children: true }); };
    }
    void start(); return () => { disposed = true; cleanup?.(); cleanup = null; };
  }, [enabled]);
  return <div ref={hostRef} className={enabled ? "pixi-game-canvas pixi-game-canvas--enabled" : "pixi-game-canvas"} aria-hidden={!enabled} />;
}
