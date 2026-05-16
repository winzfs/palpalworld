const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'features', 'game', 'GameScene.tsx');
let source = fs.readFileSync(filePath, 'utf8');
let changed = false;

function ensurePixiFlagHelper() {
  if (!source.includes('const pixiStageFlagStorageKey = "palpalworld.dev.pixiStage";')) {
    source = source.replace(
      'const equippedWeaponStorageKey = "palpalworld.demo.equippedWeaponItemId";',
      'const equippedWeaponStorageKey = "palpalworld.demo.equippedWeaponItemId";\nconst pixiStageFlagStorageKey = "palpalworld.dev.pixiStage";',
    );
    changed = true;
    console.log('[patch-pixi-hide-canvas-creatures] patched pixi flag key');
  }

  if (!source.includes('function isPixiStageEnabled()')) {
    source = source.replace(
      'function readStoredWeaponItemId() {',
      'function isPixiStageEnabled() {\n  if (typeof window === "undefined") return false;\n  return window.localStorage.getItem(pixiStageFlagStorageKey) === "true";\n}\nfunction readStoredWeaponItemId() {',
    );
    changed = true;
    console.log('[patch-pixi-hide-canvas-creatures] patched pixi flag reader');
  }
}

function patchDrawCreatures() {
  if (source.includes('private drawCreatures(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number, viewport: ViewportBounds) {\n    if (isPixiStageEnabled()) return;')) {
    console.log('[patch-pixi-hide-canvas-creatures] drawCreatures already patched');
    return;
  }

  const regex = /(private drawCreatures\(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number, viewport: ViewportBounds\) \{)(\s*)/;
  if (!regex.test(source)) {
    console.log('[patch-pixi-hide-canvas-creatures] skipped drawCreatures regex patch');
    return;
  }

  source = source.replace(regex, '$1\n    if (isPixiStageEnabled()) return;$2');
  changed = true;
  console.log('[patch-pixi-hide-canvas-creatures] patched drawCreatures regex');
}

ensurePixiFlagHelper();
patchDrawCreatures();

if (changed) fs.writeFileSync(filePath, source);
else console.log('[patch-pixi-hide-canvas-creatures] no changes');
