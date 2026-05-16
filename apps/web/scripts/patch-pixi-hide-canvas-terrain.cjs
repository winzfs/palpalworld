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
    console.log('[patch-pixi-hide-canvas-terrain] patched pixi flag key');
  }
  if (!source.includes('function isPixiStageEnabled()')) {
    source = source.replace(
      'function readStoredWeaponItemId() {',
      'function isPixiStageEnabled() {\n  if (typeof window === "undefined") return false;\n  return window.localStorage.getItem(pixiStageFlagStorageKey) === "true";\n}\nfunction readStoredWeaponItemId() {',
    );
    changed = true;
    console.log('[patch-pixi-hide-canvas-terrain] patched pixi flag reader');
  }
}

function patchDrawLoop() {
  const search = '    this.tileMapRenderer.draw(ctx, rect.width, rect.height, camera.x, camera.y);\n    this.drawMapBoundaryAndPortals(ctx, camera.x, camera.y);';
  const replacement = '    if (!isPixiStageEnabled()) {\n      this.tileMapRenderer.draw(ctx, rect.width, rect.height, camera.x, camera.y);\n      this.drawMapBoundaryAndPortals(ctx, camera.x, camera.y);\n    }';
  if (source.includes(replacement)) {
    console.log('[patch-pixi-hide-canvas-terrain] terrain draw already patched');
    return;
  }
  if (!source.includes(search)) {
    console.log('[patch-pixi-hide-canvas-terrain] skipped terrain draw patch');
    return;
  }
  source = source.replace(search, replacement);
  changed = true;
  console.log('[patch-pixi-hide-canvas-terrain] patched terrain draw loop');
}

ensurePixiFlagHelper();
patchDrawLoop();

if (changed) fs.writeFileSync(filePath, source);
else console.log('[patch-pixi-hide-canvas-terrain] no changes');
