const fs = require("fs");
const path = require("path");

const target = path.join(__dirname, "..", "src", "features", "game", "GameScene.tsx");
let source = fs.readFileSync(target, "utf8");
let changed = false;

function replaceOnce(search, replacement, label) {
  if (!source.includes(search)) {
    console.log(`[patch-build-occupancy-validation] skipped ${label}`);
    return;
  }
  source = source.replace(search, replacement);
  changed = true;
  console.log(`[patch-build-occupancy-validation] patched ${label}`);
}

function ensureAfter(anchor, insertion, label) {
  if (source.includes(insertion)) return;
  replaceOnce(anchor, `${anchor}\n${insertion}`, label);
}

ensureAfter(
  'import { BUILD_PARTS, rotateBuildPart, type BuildFloorLevel, type BuildPartId, type BuildPartRotation, type PlacedBuildPart } from "../buildings/buildPartCatalog";',
  'import { getBuildPartOccupancy, getOccupiedKeys, getPlacedBuildPartOccupancy, getOccupancyKey } from "../buildings/buildPartOccupancy";',
  "occupancy import",
);

replaceOnce(
  '    const sameCellParts = this.getSceneBuildParts().filter((existing) => existing.id !== movingPartId && existing.gridX === grid.gridX && existing.gridY === grid.gridY && existing.floorLevel === floorLevel);\n    if (sameCellParts.some((existing) => BUILD_PARTS[existing.partId]?.layer === part.layer)) return { ok: false, reason: "같은 위치에 이미 부품이 있습니다." };\n    if (part.requiresSupport && floorLevel > 0) {\n      const supported = this.getSceneBuildParts().some((existing) => existing.id !== movingPartId && existing.gridX === grid.gridX && existing.gridY === grid.gridY && existing.floorLevel === floorLevel - 1 && BUILD_PARTS[existing.partId]?.supportsUpperFloor);\n      if (!supported) return { ok: false, reason: "아래층 지지대가 필요합니다." };\n    }\n    if (part.requiresWall) {\n      const hasWall = sameCellParts.some((existing) => BUILD_PARTS[existing.partId]?.category === "wall");\n      if (!hasWall) return { ok: false, reason: "벽 위치에 설치해야 합니다." };\n    }',
  '    const sceneParts = this.getSceneBuildParts().filter((existing) => existing.id !== movingPartId);\n    const candidateOccupancy = getBuildPartOccupancy(part, grid.gridX, grid.gridY, floorLevel, movingPart?.rotation ?? this.selectedBuildPartRotation);\n    const occupiedKeys = getOccupiedKeys(sceneParts);\n    if (candidateOccupancy.some((occupancy) => occupiedKeys.has(getOccupancyKey(occupancy)))) return { ok: false, reason: "같은 위치에 이미 부품이 있습니다." };\n\n    if (part.requiresSupport && floorLevel > 0) {\n      const supported = sceneParts.some((existing) => {\n        const existingDefinition = BUILD_PARTS[existing.partId];\n        if (!existingDefinition?.supportsUpperFloor) return false;\n        return getPlacedBuildPartOccupancy(existing).some((occupancy) => occupancy.gridX === grid.gridX && occupancy.gridY === grid.gridY && occupancy.floorLevel === floorLevel - 1);\n      });\n      if (!supported) return { ok: false, reason: "아래층 지지대가 필요합니다." };\n    }\n\n    if (part.requiresWall) {\n      const wallEdgeKeys = new Set(sceneParts.flatMap((existing) => {\n        const existingDefinition = BUILD_PARTS[existing.partId];\n        if (existingDefinition?.category !== "wall") return [];\n        return getPlacedBuildPartOccupancy(existing).map(getOccupancyKey);\n      }));\n      const hasWall = candidateOccupancy.some((occupancy) => wallEdgeKeys.has(getOccupancyKey({ ...occupancy, layer: "wall" })));\n      if (!hasWall) return { ok: false, reason: "벽 위치에 설치해야 합니다." };\n    }',
  "occupancy collision validation",
);

if (changed) fs.writeFileSync(target, source);
