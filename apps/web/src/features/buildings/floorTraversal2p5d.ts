import { BUILD_GRID_SIZE, worldToBuildGrid } from "./buildGrid";
import { BUILD_PARTS, type BuildFloorLevel, type PlacedBuildPart } from "./buildPartCatalog";
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
  const centerX = grid.gridX * BUILD_GRID_SIZE + BUILD_GRID_SIZE / 2;
  const centerY = grid.gridY * BUILD_GRID_SIZE + BUILD_GRID_SIZE / 2;
  const maxDistance = BUILD_GRID_SIZE * 0.72;
  let best: FloorTraversalHit | null = null;

  for (const part of parts) {
    if (!isWalkableFloorPart(part)) continue;
    if (part.gridX !== grid.gridX || part.gridY !== grid.gridY) continue;
    const distance = Math.hypot(x - centerX, y - centerY);
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
