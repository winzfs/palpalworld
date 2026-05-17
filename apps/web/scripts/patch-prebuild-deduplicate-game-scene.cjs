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

function mergeNamedImports(modulePath, fallbackNames, label) {
  const regex = new RegExp(`^import \\{([^}]+)\\} from "${modulePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}";\\n?`, "gm");
  const names = new Set(fallbackNames);
  let firstIndex = -1;
  let count = 0;
  source = source.replace(regex, (full, rawNames, offset) => {
    if (firstIndex < 0) firstIndex = offset;
    count += 1;
    rawNames.split(",").map((name) => name.trim()).filter(Boolean).forEach((name) => names.add(name));
    return "";
  });
  if (count <= 0) return;
  const merged = `import { ${Array.from(names).sort().join(", ")} } from "${modulePath}";\n`;
  source = source.slice(0, firstIndex) + merged + source.slice(firstIndex);
  if (count > 1) {
    changed = true;
    console.log(`[patch-prebuild-deduplicate-game-scene] merged duplicate ${label}`);
  }
}

mergeNamedImports("../rendering/BuildPartRenderer", ["BuildPartRenderer"], "BuildPartRenderer import");
mergeNamedImports("../buildings/buildPartOccupancy", [
  "canReplaceWallWithPart",
  "findReplaceableWallForPart",
  "getBuildPartOccupancy",
  "getOccupiedKeys",
  "getPlacedBuildPartOccupancy",
  "getOccupancyKey",
], "occupancy imports");
mergeNamedImports("../buildings/buildPartVisual2p5d", ["getBuildPartSortKey"], "sort key import");
mergeNamedImports("../buildings/houseVisibility2p5d", ["getBuildPartVisibility"], "visibility import");
mergeNamedImports("../buildings/floorTraversal2p5d", ["findWalkableFloorAtPosition", "getFloorYOffset"], "floor traversal import");
mergeNamedImports("../buildings/buildCollision2p5d", ["getBuildCollisionAtPosition", "isOnStairTransition", "isOverWalkableBuildCell"], "collision import");

dedupeExactLine('    this.drawBuildPartPreview(ctx, camera.x, camera.y);', "drawBuildPartPreview call");

if (changed) fs.writeFileSync(target, source);
