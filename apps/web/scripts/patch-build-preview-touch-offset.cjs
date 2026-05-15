const fs = require("fs");
const path = require("path");

const target = path.join(__dirname, "..", "src", "features", "game", "GameScene.tsx");
let source = fs.readFileSync(target, "utf8");
let changed = false;

function replaceOnce(search, replacement, label) {
  if (source.includes(replacement)) {
    console.log(`[patch-build-preview-touch-offset] already-patched ${label}`);
    return;
  }
  if (!source.includes(search)) {
    console.log(`[patch-build-preview-touch-offset] skipped ${label}`);
    return;
  }
  source = source.replace(search, replacement);
  changed = true;
  console.log(`[patch-build-preview-touch-offset] patched ${label}`);
}

const placementHelpers = `
  private getBuildPartTouchPlacementPosition(position: Vector2): Vector2 {
    return this.buildPartDragPointerId !== null ? clampPositionToTile({ x: position.x, y: position.y - 22 }) : position;
  }
  private getBuildPartTouchPlacementGrid(position: Vector2): { gridX: number; gridY: number } {
    const lifted = this.getBuildPartTouchPlacementPosition(position);
    const width = this.cachedRootRectWidth || this.root.clientWidth;
    const height = this.cachedRootRectHeight || this.root.clientHeight;
    const camera = this.getCameraOffset();
    const isoCamera = worldCameraToIsoBuildCamera(camera.x, camera.y, width, height);
    return screenToIsoBuildGrid(lifted.x - camera.x, lifted.y - camera.y, isoCamera.x, isoCamera.y);
  }
  private getBuildPartTouchPlacementWorld(position: Vector2): Vector2 {
    return buildGridToWorld(this.getBuildPartTouchPlacementGrid(position));
  }`;

if (!source.includes("getBuildPartTouchPlacementGrid")) {
  replaceOnce(
    '  private commitPlacement(position: Vector2) { this.onWorldClick({ kind: "field", position, validity: this.getPlacementValidity(position) }); }',
    `  private commitPlacement(position: Vector2) { this.onWorldClick({ kind: "field", position, validity: this.getPlacementValidity(position) }); }
${placementHelpers}`,
    "touch iso placement helpers",
  );
}

// Preview must use the same isometric inverse grid as the renderer. Using
// worldToBuildGrid here makes the preview jump to a different diamond lattice
// cell because build parts are drawn with buildGridToIsoCenter().
replaceOnce(
  '    const previewPosition = this.buildPartDragPosition ?? this.pointerWorldPosition;\n    const liftedPreviewPosition = this.getBuildPartTouchPlacementPosition(previewPosition);\n    const grid = worldToBuildGrid(liftedPreviewPosition);\n    const isoPos = buildGridToIsoCenter(grid.gridX, grid.gridY);\n    const snapped = buildGridToWorld(grid);\n    const validity = this.getBuildPartPlacementValidity(snapped);\n    this.buildPartRenderer.drawPreview(ctx, this.selectedBuildPartId, isoPos.x - isoCamX, isoPos.y - isoCamY, this.selectedBuildPartRotation, validity.ok, this.buildPartDragPointerId !== null ? 0.52 : 0.42, this.selectedBuildFloorLevel);',
  '    const previewPosition = this.buildPartDragPosition ?? this.pointerWorldPosition;\n    const grid = this.getBuildPartTouchPlacementGrid(previewPosition);\n    const isoPos = buildGridToIsoCenter(grid.gridX, grid.gridY);\n    const snapped = buildGridToWorld(grid);\n    const validity = this.getBuildPartPlacementValidity(snapped);\n    this.buildPartRenderer.drawPreview(ctx, this.selectedBuildPartId, isoPos.x - isoCamX, isoPos.y - isoCamY, this.selectedBuildPartRotation, validity.ok, this.buildPartDragPointerId !== null ? 0.52 : 0.42, this.selectedBuildFloorLevel);',
  "preview uses iso inverse grid",
);

// Convert the original non-lifted iso preview block too, in case this patch runs
// before a prior touch-offset conversion on a fresh source tree.
replaceOnce(
  '    const previewPosition = this.buildPartDragPosition ?? this.pointerWorldPosition;\n    const grid = worldToBuildGrid(previewPosition);\n    const isoPos = buildGridToIsoCenter(grid.gridX, grid.gridY);\n    const snapped = buildGridToWorld(grid);\n    const validity = this.getBuildPartPlacementValidity(snapped);\n    this.buildPartRenderer.drawPreview(ctx, this.selectedBuildPartId, isoPos.x - isoCamX, isoPos.y - isoCamY, this.selectedBuildPartRotation, validity.ok, this.buildPartDragPointerId !== null ? 0.52 : 0.42, this.selectedBuildFloorLevel);',
  '    const previewPosition = this.buildPartDragPosition ?? this.pointerWorldPosition;\n    const grid = this.getBuildPartTouchPlacementGrid(previewPosition);\n    const isoPos = buildGridToIsoCenter(grid.gridX, grid.gridY);\n    const snapped = buildGridToWorld(grid);\n    const validity = this.getBuildPartPlacementValidity(snapped);\n    this.buildPartRenderer.drawPreview(ctx, this.selectedBuildPartId, isoPos.x - isoCamX, isoPos.y - isoCamY, this.selectedBuildPartRotation, validity.ok, this.buildPartDragPointerId !== null ? 0.52 : 0.42, this.selectedBuildFloorLevel);',
  "fresh preview uses iso inverse grid",
);

// New part placement should commit to the exact same cell used by the visible
// preview. Convert the pointer position into iso grid first, then back to the
// normal world grid shape expected by commitBuildPartPlacement().
replaceOnce(
  '      this.commitBuildPartPlacement(this.getBuildPartTouchPlacementPosition(position));',
  '      this.commitBuildPartPlacement(this.getBuildPartTouchPlacementWorld(position));',
  "commit iso preview position",
);
replaceOnce(
  '      this.commitBuildPartPlacement(position);',
  '      this.commitBuildPartPlacement(this.getBuildPartTouchPlacementWorld(position));',
  "fresh commit iso preview position",
);

if (changed) fs.writeFileSync(target, source);
