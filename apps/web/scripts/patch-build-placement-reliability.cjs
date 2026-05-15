const fs = require("fs");
const path = require("path");

const target = path.join(__dirname, "..", "src", "features", "game", "GameScene.tsx");
let source = fs.readFileSync(target, "utf8");
let changed = false;

function replaceOnce(search, replacement, label) {
  if (!source.includes(search)) {
    console.log(`[patch-build-placement-reliability] skipped ${label}`);
    return;
  }
  source = source.replace(search, replacement);
  changed = true;
  console.log(`[patch-build-placement-reliability] patched ${label}`);
}

replaceOnce(
  '    if (distance(localPlayer, snapped) > WORLD.buildRange) return { ok: false, reason: "너무 멀리 설치할 수 없습니다." };',
  '    const buildPartRange = WORLD.buildRange + 220;\n    if (distance(localPlayer, snapped) > buildPartRange) return { ok: false, reason: "너무 멀리 설치할 수 없습니다." };',
  "build part range tolerance",
);

replaceOnce(
  '    if (!validity.ok) return;\n    const grid = worldToBuildGrid(position);',
  '    if (!validity.ok) {\n      window.dispatchEvent(new CustomEvent("palpalworld:build-placement-failed", { detail: { reason: validity.reason } }));\n      return;\n    }\n    const grid = worldToBuildGrid(position);',
  "new placement failure event",
);

replaceOnce(
  '    if (!validity.ok) return;\n    const grid = worldToBuildGrid(position);\n    this.placedBuildParts = moveBuildPart(selected.id, grid.gridX, grid.gridY, selected.floorLevel);',
  '    if (!validity.ok) {\n      window.dispatchEvent(new CustomEvent("palpalworld:build-placement-failed", { detail: { reason: validity.reason } }));\n      return;\n    }\n    const grid = worldToBuildGrid(position);\n    this.placedBuildParts = moveBuildPart(selected.id, grid.gridX, grid.gridY, selected.floorLevel);',
  "move failure event",
);

if (changed) fs.writeFileSync(target, source);
