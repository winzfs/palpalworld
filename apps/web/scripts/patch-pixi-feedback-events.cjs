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
    console.log('[patch-pixi-feedback-events] patched pixi flag key');
  }
  if (!source.includes('function isPixiStageEnabled()')) {
    source = source.replace(
      'function readStoredWeaponItemId() {',
      'function isPixiStageEnabled() {\n  if (typeof window === "undefined") return false;\n  return window.localStorage.getItem(pixiStageFlagStorageKey) === "true";\n}\nfunction readStoredWeaponItemId() {',
    );
    changed = true;
    console.log('[patch-pixi-feedback-events] patched pixi flag reader');
  }
}

function patchFeedbackMethod() {
  if (source.includes('private dispatchPixiFeedback()')) return;
  const search = '  private loop = () => { this.draw(); this.animationFrame = requestAnimationFrame(this.loop); };';
  const replacement = `  private dispatchPixiFeedback() {
    if (!isPixiStageEnabled()) return;
    const nearestId = this.getNearestInteractableId();
    const interactable = nearestId ? this.getSceneResources().find((resource) => resource.id === nearestId)?.position ?? null : null;
    const placementPreview = this.placementPreviewBuildingType && this.pointerWorldPosition
      ? { position: this.pointerWorldPosition, ok: this.getPlacementValidity(this.pointerWorldPosition).ok }
      : null;
    window.dispatchEvent(new CustomEvent("palpalworld:pixi-feedback", {
      detail: {
        interactablePosition: interactable,
        highlightedCreatureId: this.highlightedCreatureId,
        placementPreview,
      },
    }));
  }
  private loop = () => { this.draw(); this.animationFrame = requestAnimationFrame(this.loop); };`;
  if (!source.includes(search)) {
    console.log('[patch-pixi-feedback-events] skipped feedback method');
    return;
  }
  source = source.replace(search, replacement);
  changed = true;
  console.log('[patch-pixi-feedback-events] patched feedback method');
}

function patchDrawCall() {
  if (source.includes('this.dispatchPixiFeedback();\n    this.drawInteractionHint')) return;
  const search = '    this.drawPlayers(ctx, camera.x, camera.y, now, viewport);\n    this.drawInteractionHint(ctx, camera.x, camera.y);';
  const replacement = '    this.drawPlayers(ctx, camera.x, camera.y, now, viewport);\n    this.dispatchPixiFeedback();\n    this.drawInteractionHint(ctx, camera.x, camera.y);';
  if (!source.includes(search)) {
    console.log('[patch-pixi-feedback-events] skipped feedback draw call');
    return;
  }
  source = source.replace(search, replacement);
  changed = true;
  console.log('[patch-pixi-feedback-events] patched feedback draw call');
}

function patchCanvasFeedbackHiding() {
  const interactionSearch = '  private drawInteractionHint(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {\n    if (this.placementPreviewBuildingType) return;';
  const interactionReplacement = '  private drawInteractionHint(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {\n    if (isPixiStageEnabled()) return;\n    if (this.placementPreviewBuildingType) return;';
  if (!source.includes(interactionReplacement) && source.includes(interactionSearch)) {
    source = source.replace(interactionSearch, interactionReplacement);
    changed = true;
    console.log('[patch-pixi-feedback-events] patched interaction hint hiding');
  }

  const previewSearch = '  private drawPlacementPreview(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {\n    if (!this.placementPreviewBuildingType || !this.pointerWorldPosition) return;';
  const previewReplacement = '  private drawPlacementPreview(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {\n    if (isPixiStageEnabled()) return;\n    if (!this.placementPreviewBuildingType || !this.pointerWorldPosition) return;';
  if (!source.includes(previewReplacement) && source.includes(previewSearch)) {
    source = source.replace(previewSearch, previewReplacement);
    changed = true;
    console.log('[patch-pixi-feedback-events] patched placement preview hiding');
  }
}

ensurePixiFlagHelper();
patchFeedbackMethod();
patchDrawCall();
patchCanvasFeedbackHiding();

if (changed) fs.writeFileSync(filePath, source);
else console.log('[patch-pixi-feedback-events] no changes');
