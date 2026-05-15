const fs = require("fs");
const path = require("path");

const target = path.join(__dirname, "..", "src", "features", "game", "GameScene.tsx");
let source = fs.readFileSync(target, "utf8");
let changed = false;

function replaceOnce(search, replacement, label) {
  if (!source.includes(search)) {
    console.log(`[patch-build-collision-2p5d] skipped ${label}`);
    return;
  }
  source = source.replace(search, replacement);
  changed = true;
  console.log(`[patch-build-collision-2p5d] patched ${label}`);
}

function ensureAfter(anchor, insertion, label) {
  if (source.includes(insertion)) return;
  replaceOnce(anchor, `${anchor}\n${insertion}`, label);
}

ensureAfter(
  'import { findWalkableFloorAtPosition, getFloorYOffset } from "../buildings/floorTraversal2p5d";',
  'import { getBuildCollisionAtPosition, isOnStairTransition, isOverWalkableBuildCell } from "../buildings/buildCollision2p5d";',
  "collision import",
);

replaceOnce(
  '  private localPlayerFloorLevel = 0;\n  private localPlayerFloorYOffset = 0;',
  '  private localPlayerFloorLevel = 0;\n  private localPlayerFloorYOffset = 0;\n  private localPlayerBuildCollisionReason: string | null = null;',
  "collision field",
);

replaceOnce(
  '    this.updateStairTraversalFloorState();\n    this.updateCamera(deltaSeconds);',
  '    this.updateStairTraversalFloorState();\n    this.updateBuildCollisionState();\n    this.updateCamera(deltaSeconds);',
  "collision update call",
);

replaceOnce(
  '  private updateStairTraversalFloorState() {',
  '  private updateBuildCollisionState() {\n    const player = this.getLocalPlayerPosition();\n    if (!player) {\n      this.localPlayerBuildCollisionReason = null;\n      return;\n    }\n    const parts = this.getSceneBuildParts();\n    const collision = getBuildCollisionAtPosition({ parts, position: player, floorLevel: this.localPlayerFloorLevel });\n    this.localPlayerBuildCollisionReason = collision.blocked ? collision.reason : null;\n    window.dispatchEvent(new CustomEvent("palpalworld:build-floor-state", {\n      detail: {\n        floorLevel: this.localPlayerFloorLevel,\n        floorYOffset: this.localPlayerFloorYOffset,\n        onStair: isOnStairTransition(parts, player),\n        overFloor: isOverWalkableBuildCell(parts, player, this.localPlayerFloorLevel),\n        collisionReason: this.localPlayerBuildCollisionReason,\n      },\n    }));\n  }\n\n  private updateStairTraversalFloorState() {',
  "collision method",
);

replaceOnce(
  '    this.drawInteractionHint(ctx, camera.x, camera.y);\n    this.drawPlacementPreview(ctx, camera.x, camera.y);',
  '    this.drawInteractionHint(ctx, camera.x, camera.y);\n    this.drawBuildFloorDebug(ctx);\n    this.drawPlacementPreview(ctx, camera.x, camera.y);',
  "draw floor debug call",
);

replaceOnce(
  '  private drawPlacementPreview(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {',
  '  private drawBuildFloorDebug(ctx: CanvasRenderingContext2D) {\n    if (this.localPlayerFloorLevel <= 0 && !this.localPlayerBuildCollisionReason) return;\n    ctx.save();\n    ctx.font = "11px system-ui";\n    ctx.textAlign = "left";\n    ctx.textBaseline = "top";\n    const label = `층 ${this.localPlayerFloorLevel.toFixed(1)}${this.localPlayerBuildCollisionReason ? ` · 충돌:${this.localPlayerBuildCollisionReason}` : ""}`;\n    ctx.fillStyle = "rgba(15, 23, 42, 0.76)";\n    ctx.strokeStyle = "rgba(125, 211, 252, 0.45)";\n    ctx.lineWidth = 1;\n    ctx.beginPath();\n    ctx.roundRect(12, 88, Math.max(92, ctx.measureText(label).width + 18), 24, 8);\n    ctx.fill();\n    ctx.stroke();\n    ctx.fillStyle = "#bfdbfe";\n    ctx.fillText(label, 21, 94);\n    ctx.restore();\n  }\n\n  private drawPlacementPreview(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {',
  "draw floor debug method",
);

if (changed) fs.writeFileSync(target, source);
