const fs = require("fs");
const path = require("path");

const target = path.join(__dirname, "..", "src", "features", "game", "GameScene.tsx");
let source = fs.readFileSync(target, "utf8");
let changed = false;

function replaceOnce(search, replacement, label) {
  if (!source.includes(search)) {
    console.log(`[patch-stair-traversal-2p5d] skipped ${label}`);
    return;
  }
  source = source.replace(search, replacement);
  changed = true;
  console.log(`[patch-stair-traversal-2p5d] patched ${label}`);
}

function ensureAfter(anchor, insertion, label) {
  if (source.includes(insertion)) return;
  replaceOnce(anchor, `${anchor}\n${insertion}`, label);
}

ensureAfter(
  'import { getBuildPartVisibility } from "../buildings/houseVisibility2p5d";',
  'import { findStairAtPosition, getFloorLevelOnStair, getFloorYOffsetOnStair } from "../buildings/stairTraversal2p5d";',
  "stair traversal import",
);

replaceOnce(
  '  private selectedHouseId: string | null = null;\n  private editingBuildPartPointerId: number | null = null;',
  '  private selectedHouseId: string | null = null;\n  private editingBuildPartPointerId: number | null = null;\n  private localPlayerFloorLevel = 0;\n  private localPlayerFloorYOffset = 0;',
  "floor state fields",
);

replaceOnce(
  '    this.updateCamera(deltaSeconds);\n    this.render();',
  '    this.updateStairTraversalFloorState();\n    this.updateCamera(deltaSeconds);\n    this.render();',
  "update stair floor before render",
);

replaceOnce(
  '  private getSceneBuildParts() {\n    return getBuildPartsForTile(this.placedBuildParts, this.getCurrentTile());\n  }',
  '  private getSceneBuildParts() {\n    return getBuildPartsForTile(this.placedBuildParts, this.getCurrentTile());\n  }\n  private updateStairTraversalFloorState() {\n    const player = this.getLocalPlayerPosition();\n    if (!player) {\n      this.localPlayerFloorLevel = 0;\n      this.localPlayerFloorYOffset = 0;\n      return;\n    }\n    const stair = findStairAtPosition(this.getSceneBuildParts(), player.x, player.y);\n    if (!stair) {\n      const nearestWholeFloor = Math.round(this.localPlayerFloorLevel);\n      this.localPlayerFloorLevel = Math.max(0, Math.min(2, nearestWholeFloor));\n      this.localPlayerFloorYOffset = this.localPlayerFloorLevel * 58;\n      return;\n    }\n    this.localPlayerFloorLevel = Math.max(0, Math.min(2, getFloorLevelOnStair(stair.segment, player.x, player.y)));\n    this.localPlayerFloorYOffset = getFloorYOffsetOnStair(stair.segment, player.x, player.y);\n  }',
  "stair floor state method",
);

replaceOnce(
  '      const visibility = getBuildPartVisibility({ part, selectedHouseId: this.selectedHouseId, activeFloorLevel: this.selectedBuildFloorLevel, mode: "editing" });',
  '      const activeFloorLevel = this.selectedHouseId ? this.selectedBuildFloorLevel : Math.round(this.localPlayerFloorLevel);\n      const visibility = getBuildPartVisibility({ part, selectedHouseId: this.selectedHouseId, activeFloorLevel, mode: "editing" });',
  "active floor from player when not editing",
);

if (changed) fs.writeFileSync(target, source);
