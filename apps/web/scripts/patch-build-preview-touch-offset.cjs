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

const touchLiftHelper = `
  private getBuildPartTouchPlacementPosition(position: Vector2): Vector2 {
    return this.buildPartDragPointerId !== null ? clampPositionToTile({ x: position.x, y: position.y - 22 }) : position;
  }`;

if (!source.includes("getBuildPartTouchPlacementPosition")) {
  replaceOnce(
    '  private commitPlacement(position: Vector2) { this.onWorldClick({ kind: "field", position, validity: this.getPlacementValidity(position) }); }',
    `  private commitPlacement(position: Vector2) { this.onWorldClick({ kind: "field", position, validity: this.getPlacementValidity(position) }); }
${touchLiftHelper}`,
    "touch placement helper",
  );
}

// Use the same lifted position for preview grid/validity. This keeps the visible
// preview and the final installed grid identical while still avoiding finger
// occlusion during touch dragging.
replaceOnce(
  '    const previewPosition = this.buildPartDragPosition ?? this.pointerWorldPosition;\n    const grid = worldToBuildGrid(previewPosition);\n    const isoPos = buildGridToIsoCenter(grid.gridX, grid.gridY);\n    const snapped = buildGridToWorld(grid);\n    const validity = this.getBuildPartPlacementValidity(snapped);\n    this.buildPartRenderer.drawPreview(ctx, this.selectedBuildPartId, isoPos.x - isoCamX, isoPos.y - isoCamY, this.selectedBuildPartRotation, validity.ok, this.buildPartDragPointerId !== null ? 0.52 : 0.42, this.selectedBuildFloorLevel);',
  '    const previewPosition = this.buildPartDragPosition ?? this.pointerWorldPosition;\n    const liftedPreviewPosition = this.getBuildPartTouchPlacementPosition(previewPosition);\n    const grid = worldToBuildGrid(liftedPreviewPosition);\n    const isoPos = buildGridToIsoCenter(grid.gridX, grid.gridY);\n    const snapped = buildGridToWorld(grid);\n    const validity = this.getBuildPartPlacementValidity(snapped);\n    this.buildPartRenderer.drawPreview(ctx, this.selectedBuildPartId, isoPos.x - isoCamX, isoPos.y - isoCamY, this.selectedBuildPartRotation, validity.ok, this.buildPartDragPointerId !== null ? 0.52 : 0.42, this.selectedBuildFloorLevel);',
  "preview uses lifted install grid",
);

// Convert older visual-only patch, if it has already been applied by a previous
// run, back to grid-based lifting so the drawn preview and installed cell match.
replaceOnce(
  '    const previewPosition = this.buildPartDragPosition ?? this.pointerWorldPosition;\n    const grid = worldToBuildGrid(previewPosition);\n    const isoPos = buildGridToIsoCenter(grid.gridX, grid.gridY);\n    const snapped = buildGridToWorld(grid);\n    const validity = this.getBuildPartPlacementValidity(snapped);\n    const touchPreviewLiftY = this.buildPartDragPointerId !== null ? 22 : 0;\n    this.buildPartRenderer.drawPreview(ctx, this.selectedBuildPartId, isoPos.x - isoCamX, isoPos.y - isoCamY - touchPreviewLiftY, this.selectedBuildPartRotation, validity.ok, this.buildPartDragPointerId !== null ? 0.52 : 0.42, this.selectedBuildFloorLevel);',
  '    const previewPosition = this.buildPartDragPosition ?? this.pointerWorldPosition;\n    const liftedPreviewPosition = this.getBuildPartTouchPlacementPosition(previewPosition);\n    const grid = worldToBuildGrid(liftedPreviewPosition);\n    const isoPos = buildGridToIsoCenter(grid.gridX, grid.gridY);\n    const snapped = buildGridToWorld(grid);\n    const validity = this.getBuildPartPlacementValidity(snapped);\n    this.buildPartRenderer.drawPreview(ctx, this.selectedBuildPartId, isoPos.x - isoCamX, isoPos.y - isoCamY, this.selectedBuildPartRotation, validity.ok, this.buildPartDragPointerId !== null ? 0.52 : 0.42, this.selectedBuildFloorLevel);',
  "convert visual-only lift to grid lift",
);

// New part placement should commit to the same lifted grid that preview used.
replaceOnce(
  '      this.commitBuildPartPlacement(position);',
  '      this.commitBuildPartPlacement(this.getBuildPartTouchPlacementPosition(position));',
  "commit lifted preview position",
);

if (changed) fs.writeFileSync(target, source);
