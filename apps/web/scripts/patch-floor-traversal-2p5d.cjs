const fs = require("fs");
const path = require("path");

const target = path.join(__dirname, "..", "src", "features", "game", "GameScene.tsx");
let source = fs.readFileSync(target, "utf8");
let changed = false;

function replaceOnce(search, replacement, label) {
  if (!source.includes(search)) {
    console.log(`[patch-floor-traversal-2p5d] skipped ${label}`);
    return;
  }
  source = source.replace(search, replacement);
  changed = true;
  console.log(`[patch-floor-traversal-2p5d] patched ${label}`);
}

function ensureAfter(anchor, insertion, label) {
  if (source.includes(insertion)) return;
  replaceOnce(anchor, `${anchor}\n${insertion}`, label);
}

ensureAfter(
  'import { findStairAtPosition, getFloorLevelOnStair, getFloorYOffsetOnStair } from "../buildings/stairTraversal2p5d";',
  'import { findWalkableFloorAtPosition, getFloorYOffset } from "../buildings/floorTraversal2p5d";',
  "floor traversal import",
);

replaceOnce(
  '    if (!stair) {\n      const nearestWholeFloor = Math.round(this.localPlayerFloorLevel);\n      this.localPlayerFloorLevel = Math.max(0, Math.min(2, nearestWholeFloor));\n      this.localPlayerFloorYOffset = this.localPlayerFloorLevel * 58;\n      return;\n    }',
  '    if (!stair) {\n      const floorHit = findWalkableFloorAtPosition(this.getSceneBuildParts(), player.x, player.y, this.localPlayerFloorLevel);\n      const nextFloorLevel = floorHit ? floorHit.floorLevel : 0;\n      this.localPlayerFloorLevel = Math.max(0, Math.min(2, nextFloorLevel));\n      this.localPlayerFloorYOffset = getFloorYOffset(this.localPlayerFloorLevel);\n      return;\n    }',
  "local floor retention",
);

replaceOnce(
  '    const stair = findStairAtPosition(this.getSceneBuildParts(), position.x, position.y);\n    return stair ? getFloorYOffsetOnStair(stair.segment, position.x, position.y) : 0;',
  '    const stair = findStairAtPosition(this.getSceneBuildParts(), position.x, position.y);\n    if (stair) return getFloorYOffsetOnStair(stair.segment, position.x, position.y);\n    const floorHit = findWalkableFloorAtPosition(this.getSceneBuildParts(), position.x, position.y, null);\n    return floorHit ? getFloorYOffset(floorHit.floorLevel) : 0;',
  "remote floor retention",
);

if (changed) fs.writeFileSync(target, source);
