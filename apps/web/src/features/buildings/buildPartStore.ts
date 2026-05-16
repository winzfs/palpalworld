import type { RealtimeChannel } from "@supabase/supabase-js";
import type { MapTileRef } from "../../../../../packages/shared/src/worldTiles";
import type { BuildFloorLevel, BuildPartId, BuildPartRotation, PlacedBuildPart } from "./buildPartCatalog";
import { BUILD_PARTS } from "./buildPartCatalog";
import { getBuildGridManhattanDistance } from "./buildGrid";
import {
  deleteWorldBuildPart,
  fetchWorldBuildParts,
  getBuildPartSyncClient,
  isBuildPartSyncEnabled,
  subscribeWorldBuildParts,
  upsertWorldBuildPart,
} from "../multiplayer/supabaseBuildParts";

const buildPartStorageKey = "palpalworld.demo.buildParts";
let syncChannel: RealtimeChannel | null = null;
let syncStarted = false;

type TileLike = MapTileRef & { x?: number; y?: number; tileX?: number; tileY?: number; regionId?: string };

function getTileX(tile: TileLike) {
  return typeof tile.tileX === "number" ? tile.tileX : typeof tile.x === "number" ? tile.x : 0;
}

function getTileY(tile: TileLike) {
  return typeof tile.tileY === "number" ? tile.tileY : typeof tile.y === "number" ? tile.y : 0;
}

function getRegionId(tile: TileLike) {
  return tile.regionId ?? "starter_meadow";
}

function clonePart(part: PlacedBuildPart): PlacedBuildPart {
  return { ...part };
}

function normalizePartTile(part: PlacedBuildPart): PlacedBuildPart {
  return {
    ...part,
    regionId: part.regionId && part.regionId !== "undefined:undefined" ? part.regionId : "starter_meadow",
    tileX: Number.isFinite(part.tileX) ? part.tileX : 0,
    tileY: Number.isFinite(part.tileY) ? part.tileY : 0,
  };
}

function createHouseId(tile: MapTileRef, ownerPlayerId: string) {
  const tileLike = tile as TileLike;
  return `house-${ownerPlayerId}-${getRegionId(tileLike)}-${getTileX(tileLike)}-${getTileY(tileLike)}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

function mergeBuildParts(localParts: PlacedBuildPart[], remoteParts: PlacedBuildPart[]) {
  const byId = new Map<string, PlacedBuildPart>();
  for (const part of localParts.map(normalizePartTile)) byId.set(part.id, clonePart(part));
  for (const part of remoteParts.map(normalizePartTile)) {
    const current = byId.get(part.id);
    if (!current || part.updatedAt >= current.updatedAt) byId.set(part.id, clonePart(part));
  }
  return [...byId.values()];
}

function upsertLocalPart(parts: PlacedBuildPart[], part: PlacedBuildPart) {
  const normalized = normalizePartTile(part);
  return [...parts.filter((existing) => existing.id !== normalized.id), clonePart(normalized)];
}

export function readStoredBuildParts(): PlacedBuildPart[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(buildPartStorageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PlacedBuildPart[];
    return Array.isArray(parsed) ? parsed.map((part) => normalizePartTile(clonePart(part))) : [];
  } catch {
    return [];
  }
}

export function writeStoredBuildParts(parts: PlacedBuildPart[]) {
  const next = parts.map((part) => normalizePartTile(clonePart(part)));
  if (typeof window !== "undefined") {
    window.localStorage.setItem(buildPartStorageKey, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("palpalworld:build-parts-changed", { detail: { parts: next } }));
  }
  return next;
}

function syncUpsert(part: PlacedBuildPart) {
  const client = getBuildPartSyncClient();
  if (!client || !isBuildPartSyncEnabled()) return;
  void upsertWorldBuildPart(client, normalizePartTile(part));
}

function syncDelete(partId: string) {
  const client = getBuildPartSyncClient();
  if (!client || !isBuildPartSyncEnabled()) return;
  void deleteWorldBuildPart(client, partId);
}

export async function startBuildPartRealtimeSync() {
  if (syncStarted || typeof window === "undefined") return;
  const client = getBuildPartSyncClient();
  if (!client || !isBuildPartSyncEnabled()) return;

  syncStarted = true;
  const localParts = readStoredBuildParts();
  const remoteParts = await fetchWorldBuildParts(client);
  const merged = writeStoredBuildParts(mergeBuildParts(localParts, remoteParts));

  for (const part of localParts) {
    if (!remoteParts.some((remote) => remote.id === part.id)) syncUpsert(part);
  }

  syncChannel = subscribeWorldBuildParts(client, (payload) => {
    const current = readStoredBuildParts();
    if (payload.eventType === "DELETE") {
      if (!payload.oldId) return;
      writeStoredBuildParts(current.filter((part) => part.id !== payload.oldId));
      return;
    }
    if (!payload.part) return;
    writeStoredBuildParts(upsertLocalPart(current, payload.part));
  });

  writeStoredBuildParts(merged);
}

export function stopBuildPartRealtimeSync() {
  const client = getBuildPartSyncClient();
  if (client && syncChannel) client.removeChannel(syncChannel);
  syncChannel = null;
  syncStarted = false;
}

export function findNearestHouseId({
  parts,
  currentTile,
  ownerPlayerId,
  gridX,
  gridY,
}: {
  parts: PlacedBuildPart[];
  currentTile: MapTileRef;
  ownerPlayerId: string;
  gridX: number;
  gridY: number;
}) {
  const sameTileParts = getBuildPartsForTile(parts, currentTile).filter((part) => part.ownerPlayerId === ownerPlayerId);
  let nearest: PlacedBuildPart | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const part of sameTileParts) {
    const partDistance = getBuildGridManhattanDistance({ gridX, gridY }, part);
    if (partDistance <= 3 && partDistance < nearestDistance) {
      nearest = part;
      nearestDistance = partDistance;
    }
  }
  return nearest?.houseId ?? (nearest ? assignMissingHouseId(parts, nearest, currentTile, ownerPlayerId) : null);
}

function assignMissingHouseId(parts: PlacedBuildPart[], target: PlacedBuildPart, currentTile: MapTileRef, ownerPlayerId: string) {
  const houseId = createHouseId(currentTile, ownerPlayerId);
  const now = Date.now();
  const updatedTarget = normalizePartTile({ ...target, houseId, updatedAt: now });
  const next = parts.map((part) => part.id === target.id ? updatedTarget : part);
  writeStoredBuildParts(next);
  syncUpsert(updatedTarget);
  return houseId;
}

export function createPlacedBuildPart({
  partId,
  ownerPlayerId,
  currentTile,
  gridX,
  gridY,
  floorLevel,
  rotation,
  existingParts = readStoredBuildParts(),
  houseId,
}: {
  partId: BuildPartId;
  ownerPlayerId: string;
  currentTile: MapTileRef;
  gridX: number;
  gridY: number;
  floorLevel: BuildFloorLevel;
  rotation: BuildPartRotation;
  existingParts?: PlacedBuildPart[];
  houseId?: string | null;
}): PlacedBuildPart {
  const definition = BUILD_PARTS[partId];
  const now = Date.now();
  const tile = currentTile as TileLike;
  const tileX = getTileX(tile);
  const tileY = getTileY(tile);
  const regionId = getRegionId(tile);
  const resolvedHouseId = houseId ?? findNearestHouseId({ parts: existingParts, currentTile, ownerPlayerId, gridX, gridY }) ?? createHouseId(currentTile, ownerPlayerId);
  return {
    id: `build-part-${partId}-${regionId}-${tileX}-${tileY}-${gridX}-${gridY}-${floorLevel}-${now}-${Math.floor(Math.random() * 1_000_000)}`,
    houseId: resolvedHouseId,
    partId,
    ownerPlayerId,
    regionId,
    tileX,
    tileY,
    gridX,
    gridY,
    floorLevel,
    rotation,
    isOpen: definition.category === "door" ? false : undefined,
    hp: definition.maxHp,
    maxHp: definition.maxHp,
    createdAt: now,
    updatedAt: now,
  };
}

export function getBuildPartsForTile(parts: PlacedBuildPart[], tile: MapTileRef) {
  const tileLike = tile as TileLike;
  const tileX = getTileX(tileLike);
  const tileY = getTileY(tileLike);
  const regionId = getRegionId(tileLike);
  return parts.map(normalizePartTile).filter((part) => part.regionId === regionId && part.tileX === tileX && part.tileY === tileY);
}

export function getBuildPartsForHouse(parts: PlacedBuildPart[], houseId: string | null | undefined) {
  if (!houseId) return [];
  return parts.filter((part) => part.houseId === houseId);
}

export function upsertBuildPart(part: PlacedBuildPart) {
  const current = readStoredBuildParts();
  const updated = normalizePartTile({ ...part, updatedAt: Date.now() });
  const next = upsertLocalPart(current, updated);
  syncUpsert(updated);
  return writeStoredBuildParts(next);
}

export function moveBuildPart(partId: string, gridX: number, gridY: number, floorLevel?: BuildFloorLevel) {
  const current = readStoredBuildParts();
  const now = Date.now();
  let updatedPart: PlacedBuildPart | null = null;
  const next = current.map((part) => {
    if (part.id !== partId) return part;
    updatedPart = normalizePartTile({ ...part, gridX, gridY, floorLevel: floorLevel ?? part.floorLevel, updatedAt: now });
    return updatedPart;
  });
  if (updatedPart) syncUpsert(updatedPart);
  return writeStoredBuildParts(next);
}

export function rotatePlacedBuildPart(partId: string, rotation: BuildPartRotation) {
  const current = readStoredBuildParts();
  const now = Date.now();
  let updatedPart: PlacedBuildPart | null = null;
  const next = current.map((part) => {
    if (part.id !== partId) return part;
    updatedPart = normalizePartTile({ ...part, rotation, updatedAt: now });
    return updatedPart;
  });
  if (updatedPart) syncUpsert(updatedPart);
  return writeStoredBuildParts(next);
}

export function toggleBuildDoorOpen(partId: string) {
  const current = readStoredBuildParts();
  const now = Date.now();
  let updatedPart: PlacedBuildPart | null = null;
  const next = current.map((part) => {
    if (part.id !== partId) return part;
    const definition = BUILD_PARTS[part.partId];
    if (definition?.category !== "door") return part;
    updatedPart = normalizePartTile({ ...part, isOpen: !part.isOpen, updatedAt: now });
    return updatedPart;
  });
  if (updatedPart) syncUpsert(updatedPart);
  return writeStoredBuildParts(next);
}

export function removeBuildPart(partId: string) {
  const current = readStoredBuildParts();
  syncDelete(partId);
  return writeStoredBuildParts(current.filter((part) => part.id !== partId));
}

export function removeBuildParts(partIds: Iterable<string>) {
  const idsToRemove = new Set(partIds);
  if (idsToRemove.size <= 0) return readStoredBuildParts();
  const current = readStoredBuildParts();
  for (const id of idsToRemove) syncDelete(id);
  return writeStoredBuildParts(current.filter((part) => !idsToRemove.has(part.id)));
}
