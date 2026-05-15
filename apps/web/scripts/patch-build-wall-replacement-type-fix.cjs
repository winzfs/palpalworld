const fs = require("fs");
const path = require("path");

const target = path.join(__dirname, "..", "src", "features", "game", "GameScene.tsx");
let source = fs.readFileSync(target, "utf8");
let changed = false;

function replaceOnce(search, replacement, label) {
  if (!source.includes(search)) {
    console.log(`[patch-build-wall-replacement-type-fix] skipped ${label}`);
    return;
  }
  source = source.replace(search, replacement);
  changed = true;
  console.log(`[patch-build-wall-replacement-type-fix] patched ${label}`);
}

replaceOnce(
  '    const candidateDefinition = BUILD_PARTS[this.selectedBuildPartId];\n    const replaceableWall = candidateDefinition && canReplaceWallWithPart(candidateDefinition)',
  '    const candidateDefinition = this.selectedBuildPartId ? BUILD_PARTS[this.selectedBuildPartId] : null;\n    const replaceableWall = candidateDefinition && canReplaceWallWithPart(candidateDefinition)',
  "nullable selectedBuildPartId",
);

replaceOnce(
  'import { getBuildPartOccupancy, getOccupiedKeys, getPlacedBuildPartOccupancy, getOccupancyKey } from "../buildings/buildPartOccupancy";\nimport { canReplaceWallWithPart, findReplaceableWallForPart } from "../buildings/buildPartOccupancy";',
  'import { canReplaceWallWithPart, findReplaceableWallForPart, getBuildPartOccupancy, getOccupiedKeys, getPlacedBuildPartOccupancy, getOccupancyKey } from "../buildings/buildPartOccupancy";',
  "merge occupancy imports",
);

if (changed) fs.writeFileSync(target, source);
