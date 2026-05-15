import type { MapTileRef } from "../../../../../packages/shared/src/worldTiles";
import type { BuildFloorLevel, BuildPartId, BuildPartRotation, PlacedBuildPart } from "./buildPartCatalog";
import { BUILD_PARTS } from "./buildPartCatalog";
import { getBuildGridManhattanDistance } from "./buildGrid";

const buildPartStorageKey = "palpalworld.demo.buildParts";

function getRegionId(tile: MapTileRef) {
  return `${tile.x}:${tile.y}`;
}

function clonePart(part: PlacedBuildPart): PlacedBuildPart {
  return { ...part };
}

function createHouseId(tile: MapTileRef, ownerPlayerId: string) {
  return `house-${ownerPlayerId}-${tile.x}-${tile.y}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

export function readStoredBuildParts(): PlacedBuildPart[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(buildPartStorageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PlacedBuildPart[];
    return Array.isArray(parsed) ? parsed.map(clonePart) : [];
  } catch {
    return [];
  }
}

export function writeStoredBuildParts(parts: PlacedBuildPart[]) {
  const next = parts.map(clonePart);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(buildPartStorageKey, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("palpalworld:build-parts-changed", { detail: { parts: next } }));
  }
  return next;
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
  const next = parts.map((part) => part.id === target.id ? { ...part, houseId, updatedAt: Date.now() } : part);
  writeStoredBuildParts(next);
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
  const resolvedHouseId = houseId ?? findNearestHouseId({ parts: existingParts, currentTile, ownerPlayerId, gridX, gridY }) ?? createHouseId(currentTile, ownerPlayerId);
  return {
    id: `build-part-${partId}-${currentTile.x}-${currentTile.y}-${gridX}-${gridY}-${floorLevel}-${now}-${Math.floor(Math.random() * 1_000_000)}`,
    houseId: resolvedHouseId,
    partId,
    ownerPlayerId,
    regionId: getRegionId(currentTile),
    tileX: currentTile.x,
    tileY: currentTile.y,
    gridX,
    gridY,
    floorLevel,
    rotation,
    hp: definition.maxHp,
    maxHp: definition.maxHp,
    createdAt: now,
    updatedAt: now,
  };
}

export function getBuildPartsForTile(parts: PlacedBuildPart[], tile: MapTileRef) {
  return parts.filter((part) => part.tileX === tile.x && part.tileY === tile.y);
}

export function getBuildPartsForHouse(parts: PlacedBuildPart[], houseId: string | null | undefined) {
  if (!houseId) return [];
  return parts.filter((part) => part.houseId === houseId);
}

export function upsertBuildPart(part: PlacedBuildPart) {
  const current = readStoredBuildParts();
  const next = [...current.filter((existing) => existing.id !== part.id), part];
  return writeStoredBuildParts(next);
}

export function moveBuildPart(partId: string, gridX: number, gridY: number, floorLevel?: BuildFloorLevel) {
  const current = readStoredBuildParts();
  const now = Date.now();
  const next = current.map((part) => part.id === partId ? { ...part, gridX, gridY, floorLevel: floorLevel ?? part.floorLevel, updatedAt: now } : part);
  return writeStoredBuildParts(next);
}

export function rotatePlacedBuildPart(partId: string, rotation: BuildPartRotation) {
  const current = readStoredBuildParts();
  const now = Date.now();
  const next = current.map((part) => part.id === partId ? { ...part, rotation, updatedAt: now } : part);
  return writeStoredBuildParts(next);
}

export function removeBuildPart(partId: string) {
  const current = readStoredBuildParts();
  return writeStoredBuildParts(current.filter((part) => part.id !== partId));
}
