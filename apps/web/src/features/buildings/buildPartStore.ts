import type { MapTileRef } from "../../../../../packages/shared/src/worldTiles";
import type { BuildFloorLevel, BuildPartId, BuildPartRotation, PlacedBuildPart } from "./buildPartCatalog";
import { BUILD_PARTS } from "./buildPartCatalog";

const buildPartStorageKey = "palpalworld.demo.buildParts";

function getRegionId(tile: MapTileRef) {
  return `${tile.x}:${tile.y}`;
}

function clonePart(part: PlacedBuildPart): PlacedBuildPart {
  return { ...part };
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

export function createPlacedBuildPart({
  partId,
  ownerPlayerId,
  currentTile,
  gridX,
  gridY,
  floorLevel,
  rotation,
}: {
  partId: BuildPartId;
  ownerPlayerId: string;
  currentTile: MapTileRef;
  gridX: number;
  gridY: number;
  floorLevel: BuildFloorLevel;
  rotation: BuildPartRotation;
}): PlacedBuildPart {
  const definition = BUILD_PARTS[partId];
  const now = Date.now();
  return {
    id: `build-part-${partId}-${currentTile.x}-${currentTile.y}-${gridX}-${gridY}-${floorLevel}-${now}-${Math.floor(Math.random() * 1_000_000)}`,
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

export function upsertBuildPart(part: PlacedBuildPart) {
  const current = readStoredBuildParts();
  const next = [...current.filter((existing) => existing.id !== part.id), part];
  return writeStoredBuildParts(next);
}
