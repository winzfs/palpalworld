import type { BuildGridPosition } from "./buildGrid";
import type { PlacedBuildPart } from "./buildPartCatalog";

const indexCache = new WeakMap<PlacedBuildPart[], Map<string, PlacedBuildPart[]>>();

function key(gridX: number, gridY: number) {
  return `${gridX}:${gridY}`;
}

export function getBuildPartSpatialIndex(parts: PlacedBuildPart[]) {
  const cached = indexCache.get(parts);
  if (cached) return cached;

  const index = new Map<string, PlacedBuildPart[]>();
  for (const part of parts) {
    const cellKey = key(part.gridX, part.gridY);
    const bucket = index.get(cellKey);
    if (bucket) bucket.push(part);
    else index.set(cellKey, [part]);
  }
  indexCache.set(parts, index);
  return index;
}

export function getBuildPartsAtGrid(parts: PlacedBuildPart[], grid: BuildGridPosition) {
  return getBuildPartSpatialIndex(parts).get(key(grid.gridX, grid.gridY)) ?? [];
}

export function getBuildPartsNearGrid(parts: PlacedBuildPart[], grid: BuildGridPosition, radius = 1) {
  const index = getBuildPartSpatialIndex(parts);
  const result: PlacedBuildPart[] = [];
  for (let gy = grid.gridY - radius; gy <= grid.gridY + radius; gy += 1) {
    for (let gx = grid.gridX - radius; gx <= grid.gridX + radius; gx += 1) {
      const bucket = index.get(key(gx, gy));
      if (bucket) result.push(...bucket);
    }
  }
  return result;
}
