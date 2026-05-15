const fs = require("fs");
const path = require("path");

const target = path.join(__dirname, "..", "src", "features", "buildings", "buildPartStore.ts");
let source = fs.readFileSync(target, "utf8");
let changed = false;

function replaceOnce(search, replacement, label) {
  if (source.includes(replacement)) {
    console.log(`[patch-build-part-tile-index-cache] already-patched ${label}`);
    return;
  }
  if (!source.includes(search)) {
    console.log(`[patch-build-part-tile-index-cache] skipped ${label}`);
    return;
  }
  source = source.replace(search, replacement);
  changed = true;
  console.log(`[patch-build-part-tile-index-cache] patched ${label}`);
}

replaceOnce(
  'let syncChannel: RealtimeChannel | null = null;\nlet syncStarted = false;',
  'let syncChannel: RealtimeChannel | null = null;\nlet syncStarted = false;\nconst buildPartsByTileCache = new WeakMap<PlacedBuildPart[], Map<string, PlacedBuildPart[]>>();',
  "tile cache field",
);

replaceOnce(
  'export function getBuildPartsForTile(parts: PlacedBuildPart[], tile: MapTileRef) {\n  return parts.filter((part) => part.tileX === tile.x && part.tileY === tile.y);\n}',
  'export function getBuildPartsForTile(parts: PlacedBuildPart[], tile: MapTileRef) {\n  if (parts.length <= 0) return [];\n  let tileMap = buildPartsByTileCache.get(parts);\n  if (!tileMap) {\n    tileMap = new Map<string, PlacedBuildPart[]>();\n    for (const part of parts) {\n      const key = `${part.tileX}:${part.tileY}`;\n      const bucket = tileMap.get(key);\n      if (bucket) bucket.push(part);\n      else tileMap.set(key, [part]);\n    }\n    buildPartsByTileCache.set(parts, tileMap);\n  }\n  return tileMap.get(`${tile.x}:${tile.y}`) ?? [];\n}',
  "cached getBuildPartsForTile",
);

if (changed) fs.writeFileSync(target, source);
