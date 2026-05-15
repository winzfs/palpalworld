const fs = require("fs");
const path = require("path");

const target = path.join(__dirname, "..", "src", "features", "game", "GameScene.tsx");
let source = fs.readFileSync(target, "utf8");
let changed = false;

function replaceOnce(search, replacement, label) {
  if (!source.includes(search)) {
    console.log(`[patch-build-collision-input-2p5d] skipped ${label}`);
    return;
  }
  source = source.replace(search, replacement);
  changed = true;
  console.log(`[patch-build-collision-input-2p5d] patched ${label}`);
}

replaceOnce(
  '  private emitKeyboardInput() { const left = this.keys.has("a") || this.keys.has("arrowleft"); const right = this.keys.has("d") || this.keys.has("arrowright"); const up = this.keys.has("w") || this.keys.has("arrowup"); const down = this.keys.has("s") || this.keys.has("arrowdown"); this.onInputChange({ x: Number(right) - Number(left), y: Number(down) - Number(up), primary: this.keys.has(" "), secondary: this.keys.has("e") }); }',
  '  private getCollisionAdjustedInput(input: GameSceneInput): GameSceneInput {\n    const player = this.getLocalPlayerPosition();\n    if (!player || (input.x === 0 && input.y === 0)) return input;\n    const parts = this.getSceneBuildParts();\n    const length = Math.hypot(input.x, input.y) || 1;\n    const step = 24;\n    const normalizedX = input.x / length;\n    const normalizedY = input.y / length;\n    const fullTarget = { x: player.x + normalizedX * step, y: player.y + normalizedY * step };\n    const fullCollision = getBuildCollisionAtPosition({ parts, position: fullTarget, floorLevel: this.localPlayerFloorLevel });\n    if (!fullCollision.blocked) return input;\n\n    const xTarget = { x: player.x + normalizedX * step, y: player.y };\n    const yTarget = { x: player.x, y: player.y + normalizedY * step };\n    const xBlocked = Math.abs(input.x) > 0 && getBuildCollisionAtPosition({ parts, position: xTarget, floorLevel: this.localPlayerFloorLevel }).blocked;\n    const yBlocked = Math.abs(input.y) > 0 && getBuildCollisionAtPosition({ parts, position: yTarget, floorLevel: this.localPlayerFloorLevel }).blocked;\n\n    return {\n      ...input,\n      x: xBlocked ? 0 : input.x,\n      y: yBlocked ? 0 : input.y,\n    };\n  }\n\n  private emitKeyboardInput() { const left = this.keys.has("a") || this.keys.has("arrowleft"); const right = this.keys.has("d") || this.keys.has("arrowright"); const up = this.keys.has("w") || this.keys.has("arrowup"); const down = this.keys.has("s") || this.keys.has("arrowdown"); this.onInputChange(this.getCollisionAdjustedInput({ x: Number(right) - Number(left), y: Number(down) - Number(up), primary: this.keys.has(" "), secondary: this.keys.has("e") })); }',
  "keyboard collision input",
);

if (changed) fs.writeFileSync(target, source);
