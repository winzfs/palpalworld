const fs = require("fs");
const path = require("path");

const target = path.join(__dirname, "..", "src", "features", "buildings", "buildPartStore.ts");
let source = fs.readFileSync(target, "utf8");
let changed = false;

function once(search, replacement, label) {
  if (source.includes(replacement)) {
    console.log(`[patch-build-part-grid-spatial-index] already-patched ${label}`);
    return;
  }
  if (!source.includes(search)) {
    console.log(`[patch-build-part-grid-spatial-index] skipped ${label}`);
    return;
  }
  source = source.replace(search, replacement);
  changed = true;
  console.log(`[patch-build-part-grid-spatial-index] patched ${label}`);
}

once(
  'const buildPartsByTileCache = new WeakMap<PlacedBuildPart[], Map<string, PlacedBuildPart[]>>();',
  'const buildPartsByTileCache = new WeakMap<PlacedBuildPart[], Map<string, PlacedBuildPart[]>>();\nconst BUILD_PART_GRID_CHUNK_SIZE = 8;\ntype BuildPartGridIndex = Map<string, PlacedBuildPart[]>;\nconst buildPartsGridIndexCache = new WeakMap<PlacedBuildPart[], BuildPartGridIndex>();\nfunction getBuildPartGridChunkKey(tileX: number, tileY: number, gridX: number, gridY: number) {\n  return `${tileX}:${tileY}:${Math.floor(gridX / BUILD_PART_GRID_CHUNK_SIZE)}:${Math.floor(gridY / BUILD_PART_GRID_CHUNK_SIZE)}`;\n}',
  "grid spatial cache fields",
);

once(
  'export function getBuildPartsForHouse(parts: PlacedBuildPart[], houseId: string | null | undefined) {',
  'function getBuildPartGridIndex(parts: PlacedBuildPart[]) {\n  let index = buildPartsGridIndexCache.get(parts);\n  if (index) return index;\n  index = new Map<string, PlacedBuildPart[]>();\n  for (const part of parts) {\n    const key = getBuildPartGridChunkKey(part.tileX, part.tileY, part.gridX, part.gridY);\n    const bucket = index.get(key);\n    if (bucket) bucket.push(part);\n    else index.set(key, [part]);\n  }\n  buildPartsGridIndexCache.set(parts, index);\n  return index;\n}\n\nexport function getBuildPartsInGridRect(parts: PlacedBuildPart[], tile: MapTileRef, minGridX: number, minGridY: number, maxGridX: number, maxGridY: number) {\n  if (parts.length <= 0) return [];\n  const index = getBuildPartGridIndex(parts);\n  const result: PlacedBuildPart[] = [];\n  const minChunkX = Math.floor(minGridX / BUILD_PART_GRID_CHUNK_SIZE);\n  const maxChunkX = Math.floor(maxGridX / BUILD_PART_GRID_CHUNK_SIZE);\n  const minChunkY = Math.floor(minGridY / BUILD_PART_GRID_CHUNK_SIZE);\n  const maxChunkY = Math.floor(maxGridY / BUILD_PART_GRID_CHUNK_SIZE);\n  for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY += 1) {\n    for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX += 1) {\n      const bucket = index.get(`${tile.x}:${tile.y}:${chunkX}:${chunkY}`);\n      if (!bucket) continue;\n      for (const part of bucket) {\n        if (part.gridX < minGridX || part.gridX > maxGridX || part.gridY < minGridY || part.gridY > maxGridY) continue;\n        result.push(part);\n      }\n    }\n  }\n  return result;\n}\n\nexport function getBuildPartsNearGrid(parts: PlacedBuildPart[], tile: MapTileRef, gridX: number, gridY: number, radius = 4) {\n  return getBuildPartsInGridRect(parts, tile, gridX - radius, gridY - radius, gridX + radius, gridY + radius);\n}\n\nexport function getBuildPartsForHouse(parts: PlacedBuildPart[], houseId: string | null | undefined) {',
  "grid spatial helpers",
);

if (changed) fs.writeFileSync(target, source);
