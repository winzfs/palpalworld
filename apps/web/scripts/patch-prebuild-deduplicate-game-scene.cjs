const fs = require("fs");
const path = require("path");

const target = path.join(__dirname, "..", "src", "features", "game", "GameScene.tsx");
let source = fs.readFileSync(target, "utf8");
let changed = false;

function dedupeExactLine(line, label) {
  const lines = source.split("\n");
  let seen = false;
  const nextLines = lines.filter((current) => {
    if (current.trim() !== line.trim()) return true;
    if (!seen) {
      seen = true;
      return true;
    }
    changed = true;
    console.log(`[patch-prebuild-deduplicate-game-scene] removed duplicate ${label}`);
    return false;
  });
  source = nextLines.join("\n");
}

function replaceAll(search, replacement, label) {
  if (!source.includes(search)) return;
  source = source.split(search).join(replacement);
  changed = true;
  console.log(`[patch-prebuild-deduplicate-game-scene] normalized ${label}`);
}

// Import cleanup. Multiple patches may add the same module import in different lines.
replaceAll(
  'import { getBuildPartOccupancy, getOccupiedKeys, getPlacedBuildPartOccupancy, getOccupancyKey } from "../buildings/buildPartOccupancy";\nimport { canReplaceWallWithPart, findReplaceableWallForPart } from "../buildings/buildPartOccupancy";',
  'import { canReplaceWallWithPart, findReplaceableWallForPart, getBuildPartOccupancy, getOccupiedKeys, getPlacedBuildPartOccupancy, getOccupancyKey } from "../buildings/buildPartOccupancy";',
  "occupancy import merge",
);

dedupeExactLine('    this.drawBuildPartPreview(ctx, camera.x, camera.y);', "drawBuildPartPreview call");
dedupeExactLine('import { getBuildPartSortKey } from "../buildings/buildPartVisual2p5d";', "sort key import");
dedupeExactLine('import { getBuildPartVisibility } from "../buildings/houseVisibility2p5d";', "visibility import");
dedupeExactLine('import { findWalkableFloorAtPosition, getFloorYOffset } from "../buildings/floorTraversal2p5d";', "floor traversal import");
dedupeExactLine('import { getBuildCollisionAtPosition, isOnStairTransition, isOverWalkableBuildCell } from "../buildings/buildCollision2p5d";', "collision import");

if (changed) fs.writeFileSync(target, source);
