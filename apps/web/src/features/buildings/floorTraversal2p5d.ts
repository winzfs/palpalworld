import { buildGridToWorld, worldToBuildGrid } from "./buildGrid";
import { BUILD_PARTS, type BuildFloorLevel, type PlacedBuildPart } from "./buildPartCatalog";
import { getBuildPartsAtGrid } from "./buildPartSpatialIndex2p5d";
import { BUILD_2P5D_FLOOR_HEIGHT } from "./buildPartVisual2p5d";

export type FloorTraversalHit = {
  floorLevel: BuildFloorLevel;
  part: PlacedBuildPart;
  distance: number;
};

export function isWalkableFloorPart(part: PlacedBuildPart) {
  const definition = BUILD_PARTS[part.partId];
  return Boolean(definition && definition.category === "floor" && !definition.blocksMove);
}

export function findWalkableFloorAtPosition(parts: PlacedBuildPart[], x: number, y: number, preferredFloorLevel?: number | null): FloorTraversalHit | null {
  const grid = worldToBuildGrid({ x, y });
  const maxDistance = 34;
  let best: FloorTraversalHit | null = null;

  for (const part of getBuildPartsAtGrid(parts, grid)) {
    if (!isWalkableFloorPart(part)) continue;

    // Only treat same/current floor as walkable unless the caller explicitly
    // prefers another floor. This prevents a ground-level player from snapping
    // up onto a roof/upper floor just because that tile visually overlaps.
    if (typeof preferredFloorLevel === "number" && Math.abs(part.floorLevel - Math.round(preferredFloorLevel)) > 0) continue;

    const center = buildGridToWorld(part);
    const distance = Math.hypot(x - center.x, y - center.y);
    if (distance > maxDistance) continue;
    const preferredPenalty = typeof preferredFloorLevel === "number" ? Math.abs(part.floorLevel - preferredFloorLevel) * 0.01 : 0;
    const score = distance + preferredPenalty;
    if (!best || score < best.distance) best = { floorLevel: part.floorLevel, part, distance: score };
  }

  return best;
}

export function getFloorYOffset(floorLevel: number) {
  return Math.max(0, Math.min(2, floorLevel)) * BUILD_2P5D_FLOOR_HEIGHT;
}
