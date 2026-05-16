const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'features', 'game', 'GameScene.tsx');
let source = fs.readFileSync(filePath, 'utf8');
let changed = false;

function replaceOnce(search, replacement, label) {
  if (source.includes(replacement)) return true;
  if (!source.includes(search)) {
    console.log(`[patch-pixi-canvas-fallback-gate] skipped ${label}`);
    return false;
  }
  source = source.replace(search, replacement);
  changed = true;
  console.log(`[patch-pixi-canvas-fallback-gate] patched ${label}`);
  return true;
}

function ensurePixiFlagHelper() {
  if (!source.includes('const pixiStageFlagStorageKey = "palpalworld.dev.pixiStage";')) {
    source = source.replace(
      'const equippedWeaponStorageKey = "palpalworld.demo.equippedWeaponItemId";',
      'const equippedWeaponStorageKey = "palpalworld.demo.equippedWeaponItemId";\nconst pixiStageFlagStorageKey = "palpalworld.dev.pixiStage";',
    );
    changed = true;
    console.log('[patch-pixi-canvas-fallback-gate] patched pixi flag key');
  }
  if (!source.includes('function isPixiStageEnabled()')) {
    source = source.replace(
      'function readStoredWeaponItemId() {',
      'function isPixiStageEnabled() {\n  if (typeof window === "undefined") return false;\n  return window.localStorage.getItem(pixiStageFlagStorageKey) === "true";\n}\nfunction readStoredWeaponItemId() {',
    );
    changed = true;
    console.log('[patch-pixi-canvas-fallback-gate] patched pixi flag reader');
  }
}

function patchDrawGate() {
  if (source.includes('const pixiHooks = this as unknown as { dispatchPixiBuildParts?: () => void; dispatchPixiFeedback?: () => void };')) {
    console.log('[patch-pixi-canvas-fallback-gate] draw gate already patched');
    return;
  }

  const search = `    this.tileMapRenderer.draw(ctx, rect.width, rect.height, camera.x, camera.y);
    this.drawMapBoundaryAndPortals(ctx, camera.x, camera.y);
    this.drawBuildings(ctx, camera.x, camera.y, viewport);
    this.drawResources(ctx, camera.x, camera.y, viewport);
    this.drawCreatures(ctx, camera.x, camera.y, viewport);
    this.drawPlayers(ctx, camera.x, camera.y, now, viewport);
    this.drawInteractionHint(ctx, camera.x, camera.y);
    this.drawPlacementPreview(ctx, camera.x, camera.y);`;

  const replacement = `    const pixiHooks = this as unknown as { dispatchPixiBuildParts?: () => void; dispatchPixiFeedback?: () => void };
    if (isPixiStageEnabled()) {
      pixiHooks.dispatchPixiBuildParts?.();
      pixiHooks.dispatchPixiFeedback?.();
      return;
    }
    this.tileMapRenderer.draw(ctx, rect.width, rect.height, camera.x, camera.y);
    this.drawMapBoundaryAndPortals(ctx, camera.x, camera.y);
    this.drawBuildings(ctx, camera.x, camera.y, viewport);
    this.drawResources(ctx, camera.x, camera.y, viewport);
    this.drawCreatures(ctx, camera.x, camera.y, viewport);
    this.drawPlayers(ctx, camera.x, camera.y, now, viewport);
    this.drawInteractionHint(ctx, camera.x, camera.y);
    this.drawPlacementPreview(ctx, camera.x, camera.y);`;

  if (replaceOnce(search, replacement, 'draw fallback gate')) return;

  const regex = /(\n\s*this\.tileMapRenderer\.draw\(ctx, rect\.width, rect\.height, camera\.x, camera\.y\);[\s\S]*?\n\s*this\.drawPlacementPreview\(ctx, camera\.x, camera\.y\);)/;
  if (!regex.test(source)) {
    console.log('[patch-pixi-canvas-fallback-gate] skipped draw fallback gate regex');
    return;
  }
  source = source.replace(regex, `\n    const pixiHooks = this as unknown as { dispatchPixiBuildParts?: () => void; dispatchPixiFeedback?: () => void };
    if (isPixiStageEnabled()) {
      pixiHooks.dispatchPixiBuildParts?.();
      pixiHooks.dispatchPixiFeedback?.();
      return;
    }$1`);
  changed = true;
  console.log('[patch-pixi-canvas-fallback-gate] patched draw fallback gate regex');
}

ensurePixiFlagHelper();
patchDrawGate();

if (changed) fs.writeFileSync(filePath, source);
else console.log('[patch-pixi-canvas-fallback-gate] no changes');
