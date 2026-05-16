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
    console.log('[patch-pixi-build-part-events] patched pixi flag key');
  }
  if (!source.includes('function isPixiStageEnabled()')) {
    source = source.replace(
      'function readStoredWeaponItemId() {',
      'function isPixiStageEnabled() {\n  if (typeof window === "undefined") return false;\n  return window.localStorage.getItem(pixiStageFlagStorageKey) === "true";\n}\nfunction readStoredWeaponItemId() {',
    );
    changed = true;
    console.log('[patch-pixi-build-part-events] patched pixi flag reader');
  }
}

function patchDispatchMethod() {
  if (source.includes('private dispatchPixiBuildParts()')) return;
  const search = '  private dispatchPixiFeedback() {';
  const insertion = `  private dispatchPixiBuildParts() {
    if (!isPixiStageEnabled()) return;
    window.dispatchEvent(new CustomEvent("palpalworld:pixi-build-parts", {
      detail: {
        parts: this.getSceneBuildParts(),
        selectedPartId: this.selectedPlacedBuildPartId,
        selectedHouseId: this.selectedHouseId,
        preview: this.selectedBuildPartId && this.pointerWorldPosition
          ? {
              partId: this.selectedBuildPartId,
              position: this.pointerWorldPosition,
              rotation: this.selectedBuildPartRotation,
              floorLevel: this.selectedBuildFloorLevel,
              valid: this.getBuildPartPlacementValidity(this.pointerWorldPosition).ok,
            }
          : null,
      },
    }));
  }
`;
  if (source.includes(search)) {
    source = source.replace(search, insertion + search);
    changed = true;
    console.log('[patch-pixi-build-part-events] patched dispatch method before feedback');
    return;
  }
  const fallback = '  private loop = () => { this.draw(); this.animationFrame = requestAnimationFrame(this.loop); };';
  if (!source.includes(fallback)) {
    console.log('[patch-pixi-build-part-events] skipped dispatch method');
    return;
  }
  source = source.replace(fallback, insertion + fallback);
  changed = true;
  console.log('[patch-pixi-build-part-events] patched dispatch method fallback');
}

function patchDrawCall() {
  if (source.includes('this.dispatchPixiBuildParts();')) return;
  const search = '    this.drawBuildParts(ctx, camera.x, camera.y, viewport);';
  if (source.includes(search)) {
    source = source.replace(search, search + '\n    this.dispatchPixiBuildParts();');
    changed = true;
    console.log('[patch-pixi-build-part-events] patched dispatch after drawBuildParts');
    return;
  }
  const fallback = '    this.dispatchPixiFeedback();';
  if (source.includes(fallback)) {
    source = source.replace(fallback, '    this.dispatchPixiBuildParts();\n' + fallback);
    changed = true;
    console.log('[patch-pixi-build-part-events] patched dispatch before feedback');
    return;
  }
  console.log('[patch-pixi-build-part-events] skipped dispatch call');
}

function patchCanvasBuildPartHiding() {
  if (source.includes('private drawBuildParts(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number, viewport: ViewportBounds) {\n    if (isPixiStageEnabled()) return;')) return;
  const regex = /(private drawBuildParts\(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number, viewport: ViewportBounds\) \{)(\s*)/;
  if (!regex.test(source)) {
    console.log('[patch-pixi-build-part-events] skipped drawBuildParts hiding');
    return;
  }
  source = source.replace(regex, '$1\n    if (isPixiStageEnabled()) return;$2');
  changed = true;
  console.log('[patch-pixi-build-part-events] patched drawBuildParts hiding');
}

ensurePixiFlagHelper();
patchDispatchMethod();
patchDrawCall();
patchCanvasBuildPartHiding();

if (changed) fs.writeFileSync(filePath, source);
else console.log('[patch-pixi-build-part-events] no changes');
