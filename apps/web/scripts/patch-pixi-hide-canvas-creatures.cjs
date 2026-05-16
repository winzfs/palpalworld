const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'features', 'game', 'GameScene.tsx');
let source = fs.readFileSync(filePath, 'utf8');
let changed = false;

function replaceOnce(search, replacement, label) {
  if (source.includes(replacement)) return;
  if (!source.includes(search)) {
    console.log(`[patch-pixi-hide-canvas-creatures] skipped ${label}`);
    return;
  }
  source = source.replace(search, replacement);
  changed = true;
  console.log(`[patch-pixi-hide-canvas-creatures] patched ${label}`);
}

replaceOnce(
  '  private drawCreatures(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number, viewport: ViewportBounds) {\n    for (const creature of this.getSceneCreatures()) {',
  '  private drawCreatures(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number, viewport: ViewportBounds) {\n    if (isPixiStageEnabled()) return;\n    for (const creature of this.getSceneCreatures()) {',
  'skip canvas creature render in Pixi mode',
);

if (changed) fs.writeFileSync(filePath, source);
else console.log('[patch-pixi-hide-canvas-creatures] no changes');
