const fs = require("fs");
const path = require("path");

const target = path.join(__dirname, "..", "src", "features", "game", "GameScene.tsx");
let source = fs.readFileSync(target, "utf8");
let changed = false;

function replaceOnce(search, replacement, label) {
  if (!source.includes(search)) {
    console.log(`[patch-player-stair-height-rendering] skipped ${label}`);
    return;
  }
  source = source.replace(search, replacement);
  changed = true;
  console.log(`[patch-player-stair-height-rendering] patched ${label}`);
}

function ensureAfter(anchor, insertion, label) {
  if (source.includes(insertion)) return;
  replaceOnce(anchor, `${anchor}\n${insertion}`, label);
}

ensureAfter(
  'import { findStairAtPosition, getFloorLevelOnStair, getFloorYOffsetOnStair } from "../buildings/stairTraversal2p5d";',
  'import type { Vector2 as StairVector2 } from "@palpalworld/shared";',
  "stair vector import marker",
);

replaceOnce(
  '  private updateStairTraversalFloorState() {\n    const player = this.getLocalPlayerPosition();',
  '  private getPlayerFloorYOffset(position: Vector2, isLocal: boolean) {\n    if (isLocal) return this.localPlayerFloorYOffset;\n    const stair = findStairAtPosition(this.getSceneBuildParts(), position.x, position.y);\n    return stair ? getFloorYOffsetOnStair(stair.segment, position.x, position.y) : 0;\n  }\n\n  private updateStairTraversalFloorState() {\n    const player = this.getLocalPlayerPosition();',
  "player floor offset helper",
);

replaceOnce(
  '      this.renderer.drawPlayer(ctx, player, player.position.x - cameraX, player.position.y - cameraY, isLocal, isMoving, now, weaponItemId);',
  '      const floorYOffset = this.getPlayerFloorYOffset(player.position, isLocal);\n      this.renderer.drawPlayer(ctx, player, player.position.x - cameraX, player.position.y - cameraY - floorYOffset, isLocal, isMoving, now, weaponItemId);\n      if (floorYOffset > 2) {\n        ctx.save();\n        ctx.globalAlpha = 0.24;\n        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";\n        ctx.beginPath();\n        ctx.ellipse(player.position.x - cameraX, player.position.y - cameraY + 22, 20, 7, 0, 0, Math.PI * 2);\n        ctx.fill();\n        ctx.restore();\n      }',
  "draw player with stair offset",
);

if (changed) fs.writeFileSync(target, source);
