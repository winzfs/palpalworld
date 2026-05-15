const fs = require("fs");
const path = require("path");

const target = path.join(__dirname, "..", "src", "features", "game", "GameScene.tsx");
let source = fs.readFileSync(target, "utf8");
let changed = false;

function replaceOnce(search, replacement, label) {
  if (!source.includes(search)) {
    console.log(`[patch-build-wall-replacement] skipped ${label}`);
    return;
  }
  source = source.replace(search, replacement);
  changed = true;
  console.log(`[patch-build-wall-replacement] patched ${label}`);
}

function ensureAfter(anchor, insertion, label) {
  if (source.includes(insertion)) return;
  replaceOnce(anchor, `${anchor}\n${insertion}`, label);
}

ensureAfter(
  'import { getBuildPartOccupancy, getOccupiedKeys, getPlacedBuildPartOccupancy, getOccupancyKey } from "../buildings/buildPartOccupancy";',
  'import { canReplaceWallWithPart, findReplaceableWallForPart } from "../buildings/buildPartOccupancy";',
  "wall replacement imports",
);

replaceOnce(
  '    if (candidateOccupancy.some((occupancy) => occupiedKeys.has(getOccupancyKey(occupancy)))) return { ok: false, reason: "같은 위치에 이미 부품이 있습니다." };',
  '    const replaceableWall = findReplaceableWallForPart({ parts: sceneParts, candidateDefinition: part, gridX: grid.gridX, gridY: grid.gridY, floorLevel, rotation: movingPart?.rotation ?? this.selectedBuildPartRotation });\n    const hasBlockingOccupancy = candidateOccupancy.some((occupancy) => occupiedKeys.has(getOccupancyKey(occupancy)));\n    if (hasBlockingOccupancy && !replaceableWall) return { ok: false, reason: "같은 위치에 이미 부품이 있습니다." };',
  "allow wall replacement collision",
);

replaceOnce(
  '    if (part.requiresWall) {\n      const wallEdgeKeys = new Set(sceneParts.flatMap((existing) => {\n        const existingDefinition = BUILD_PARTS[existing.partId];\n        if (existingDefinition?.category !== "wall") return [];\n        return getPlacedBuildPartOccupancy(existing).map(getOccupancyKey);\n      }));\n      const hasWall = candidateOccupancy.some((occupancy) => wallEdgeKeys.has(getOccupancyKey({ ...occupancy, layer: "wall" })));\n      if (!hasWall) return { ok: false, reason: "벽 위치에 설치해야 합니다." };\n    }',
  '    if (part.requiresWall) {\n      const hasWall = Boolean(replaceableWall);\n      if (!hasWall) return { ok: false, reason: "벽 위치에 설치해야 합니다." };\n    }',
  "requires wall uses replacement wall",
);

replaceOnce(
  '    this.selectedPlacedBuildPartId = placedPart.id;\n    this.selectedHouseId = placedPart.houseId ?? null;\n    this.placedBuildParts = writeStoredBuildParts([...this.placedBuildParts, placedPart]);\n    this.dispatchBuildPartSelection();',
  '    const candidateDefinition = BUILD_PARTS[this.selectedBuildPartId];\n    const replaceableWall = candidateDefinition && canReplaceWallWithPart(candidateDefinition)\n      ? findReplaceableWallForPart({ parts: this.placedBuildParts, candidateDefinition, gridX: grid.gridX, gridY: grid.gridY, floorLevel: this.selectedBuildFloorLevel, rotation: this.selectedBuildPartRotation })\n      : null;\n    const nextParts = replaceableWall ? this.placedBuildParts.filter((part) => part.id !== replaceableWall.id) : this.placedBuildParts;\n    if (replaceableWall) removeBuildPart(replaceableWall.id);\n    this.selectedPlacedBuildPartId = placedPart.id;\n    this.selectedHouseId = placedPart.houseId ?? replaceableWall?.houseId ?? null;\n    this.placedBuildParts = writeStoredBuildParts([...nextParts, { ...placedPart, houseId: placedPart.houseId ?? replaceableWall?.houseId }]);\n    this.dispatchBuildPartSelection();',
  "replace wall on placement",
);

if (changed) fs.writeFileSync(target, source);
