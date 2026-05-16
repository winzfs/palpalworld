const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'features', 'game', 'GameScene.tsx');
let source = fs.readFileSync(filePath, 'utf8');
let changed = false;

function replaceAll(search, replacement, label) {
  if (!source.includes(search)) {
    console.log(`[patch-missing-build-part-preview-method] skipped ${label}`);
    return;
  }
  source = source.split(search).join(replacement);
  changed = true;
  console.log(`[patch-missing-build-part-preview-method] patched ${label}`);
}

// Some older build-part patches can leave a call to drawBuildPartPreview even when
// the method no longer exists after the Pixi migration. The normal preview method
// in the current simplified GameScene is drawPlacementPreview.
replaceAll('this.drawBuildPartPreview(ctx, camera.x, camera.y);', 'this.drawPlacementPreview(ctx, camera.x, camera.y);', 'direct drawBuildPartPreview call');
replaceAll('this.drawBuildPartPreview(ctx, cameraX, cameraY);', 'this.drawPlacementPreview(ctx, cameraX, cameraY);', 'camera arg drawBuildPartPreview call');

// Defensive compatibility shim: if a later patch still expects drawBuildPartPreview,
// provide a tiny wrapper instead of crashing the mobile client.
if (source.includes('this.drawBuildPartPreview') && !source.includes('private drawBuildPartPreview(ctx: CanvasRenderingContext2D')) {
  const marker = '  private drawInteractionHint(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {';
  const shim = `  private drawBuildPartPreview(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {
    this.drawPlacementPreview(ctx, cameraX, cameraY);
  }
`;
  if (source.includes(marker)) {
    source = source.replace(marker, shim + marker);
    changed = true;
    console.log('[patch-missing-build-part-preview-method] inserted compatibility shim');
  } else {
    console.log('[patch-missing-build-part-preview-method] skipped compatibility shim');
  }
}

if (changed) fs.writeFileSync(filePath, source);
else console.log('[patch-missing-build-part-preview-method] no changes');
