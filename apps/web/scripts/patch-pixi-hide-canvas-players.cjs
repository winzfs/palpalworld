const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'features', 'game', 'GameScene.tsx');
let source = fs.readFileSync(filePath, 'utf8');
let changed = false;

function replaceOnce(search, replacement, label) {
  if (source.includes(replacement)) return;
  if (!source.includes(search)) {
    console.log(`[patch-pixi-hide-canvas-players] skipped ${label}`);
    return;
  }
  source = source.replace(search, replacement);
  changed = true;
  console.log(`[patch-pixi-hide-canvas-players] patched ${label}`);
}

replaceOnce(
  'const equippedWeaponStorageKey = "palpalworld.demo.equippedWeaponItemId";',
  'const equippedWeaponStorageKey = "palpalworld.demo.equippedWeaponItemId";\nconst pixiStageFlagStorageKey = "palpalworld.dev.pixiStage";',
  'pixi flag key',
);

replaceOnce(
  'function readStoredWeaponItemId() {',
  'function isPixiStageEnabled() {\n  if (typeof window === "undefined") return false;\n  return window.localStorage.getItem(pixiStageFlagStorageKey) === "true";\n}\nfunction readStoredWeaponItemId() {',
  'pixi flag reader',
);

replaceOnce(
  '  private drawPlayers(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number, now: number, viewport: ViewportBounds) {\n    if (!this.snapshot) return;',
  '  private drawPlayers(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number, now: number, viewport: ViewportBounds) {\n    if (!this.snapshot || isPixiStageEnabled()) return;',
  'skip canvas player render in Pixi mode',
);

if (changed) fs.writeFileSync(filePath, source);
else console.log('[patch-pixi-hide-canvas-players] no changes');
