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
  const insertion = `  private dispatchPixiBuildParts() {
    if (!isPixiStageEnabled()) return;
    const parts = typeof this.getSceneBuildParts === "function" ? this.getSceneBuildParts() : [];
    window.dispatchEvent(new CustomEvent("palpalworld:pixi-build-parts", {
      detail: {
        parts,
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

  const beforeFeedback = '  private dispatchPixiFeedback() {';
  if (source.includes(beforeFeedback)) {
    source = source.replace(beforeFeedback, insertion + beforeFeedback);
    changed = true;
    console.log('[patch-pixi-build-part-events] patched dispatch method before feedback');
    return;
  }

  const beforeLoop = '  private loop = () => { this.draw(); this.animationFrame = requestAnimationFrame(this.loop); };';
  if (source.includes(beforeLoop)) {
    source = source.replace(beforeLoop, insertion + beforeLoop);
    changed = true;
    console.log('[patch-pixi-build-part-events] patched dispatch method fallback');
    return;
  }

  const classEndRegex = /(\n\s*destroy\(\) \{)/;
  if (classEndRegex.test(source)) {
    source = source.replace(classEndRegex, '\n' + insertion + '$1');
    changed = true;
    console.log('[patch-pixi-build-part-events] patched dispatch method before destroy');
    return;
  }

  console.log('[patch-pixi-build-part-events] skipped dispatch method');
}

function hasDispatchCallOutsideMethod() {
  const methodIndex = source.indexOf('private dispatchPixiBuildParts()');
  const callIndex = source.indexOf('this.dispatchPixiBuildParts();');
  if (callIndex < 0) return false;
  if (methodIndex < 0) return true;
  const nextMethodIndex = source.indexOf('\n  private ', methodIndex + 'private dispatchPixiBuildParts()'.length);
  return nextMethodIndex > 0 && callIndex > nextMethodIndex;
}

function patchDrawCall() {
  if (hasDispatchCallOutsideMethod()) return;

  const drawPlayersRegex = /(\n\s*this\.drawPlayers\(ctx, camera\.x, camera\.y, now, viewport\);)/;
  if (drawPlayersRegex.test(source)) {
    source = source.replace(drawPlayersRegex, '$1\n    this.dispatchPixiBuildParts();');
    changed = true;
    console.log('[patch-pixi-build-part-events] patched dispatch after drawPlayers regex');
    return;
  }

  const drawResourcesRegex = /(\n\s*this\.drawResources\(ctx, camera\.x, camera\.y, viewport\);)/;
  if (drawResourcesRegex.test(source)) {
    source = source.replace(drawResourcesRegex, '$1\n    this.dispatchPixiBuildParts();');
    changed = true;
    console.log('[patch-pixi-build-part-events] patched dispatch after drawResources regex');
    return;
  }

  const drawMethodRegex = /(private draw\(\) \{[\s\S]*?const viewport = this\.getViewportBounds\(camera\);)/;
  if (drawMethodRegex.test(source)) {
    source = source.replace(drawMethodRegex, '$1\n    this.dispatchPixiBuildParts();');
    changed = true;
    console.log('[patch-pixi-build-part-events] patched dispatch in draw method fallback');
    return;
  }

  console.log('[patch-pixi-build-part-events] skipped dispatch call');
}

function patchCanvasBuildPartHiding() {
  if (source.includes('drawBuildParts(ctx: CanvasRenderingContext2D') && source.includes('if (isPixiStageEnabled()) return;')) return;
  const regex = /(private drawBuildParts\([^)]*\) \{)(\s*)/;
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
