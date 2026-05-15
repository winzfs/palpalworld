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

// The build part is drawn on an iso lattice, but the player's allowed build
// range should be based on the actual touched/clicked world point. Otherwise
// distance checks compare the player against an unrelated iso anchor and valid
// placements only work near a few map positions.
replaceOnce(
  '    const grid = worldToBuildGrid(position);\n    const snapped = buildGridToWorld(grid);\n    const visualCenter = buildGridToIsoCenter(grid.gridX, grid.gridY);\n    if (visualCenter.x < 0 || visualCenter.x > MAP_TILE_SIZE.width || visualCenter.y < 0 || visualCenter.y > MAP_TILE_SIZE.height) return { ok: false, reason: "타일 밖에는 설치할 수 없습니다." };\n    if (distance(localPlayer, visualCenter) > WORLD.buildRange) return { ok: false, reason: "너무 멀리 설치할 수 없습니다." };',
  '    const grid = worldToBuildGrid(position);\n    const snapped = buildGridToWorld(grid);\n    const placementPoint = clampPositionToTile(position);\n    if (placementPoint.x < 0 || placementPoint.x > MAP_TILE_SIZE.width || placementPoint.y < 0 || placementPoint.y > MAP_TILE_SIZE.height) return { ok: false, reason: "타일 밖에는 설치할 수 없습니다." };\n    if (distance(localPlayer, placementPoint) > WORLD.buildRange) return { ok: false, reason: "너무 멀리 설치할 수 없습니다." };',
  "validity uses touched world point",
);

// Also handle a fresh prebuild source where the validity block has not yet been
// changed to visualCenter by the previous version of this patch.
replaceOnce(
  '    const grid = worldToBuildGrid(position);\n    const snapped = buildGridToWorld(grid);\n    if (snapped.x < 0 || snapped.x > MAP_TILE_SIZE.width || snapped.y < 0 || snapped.y > MAP_TILE_SIZE.height) return { ok: false, reason: "타일 밖에는 설치할 수 없습니다." };\n    if (distance(localPlayer, snapped) > WORLD.buildRange) return { ok: false, reason: "너무 멀리 설치할 수 없습니다." };',
  '    const grid = worldToBuildGrid(position);\n    const snapped = buildGridToWorld(grid);\n    const placementPoint = clampPositionToTile(position);\n    if (placementPoint.x < 0 || placementPoint.x > MAP_TILE_SIZE.width || placementPoint.y < 0 || placementPoint.y > MAP_TILE_SIZE.height) return { ok: false, reason: "타일 밖에는 설치할 수 없습니다." };\n    if (distance(localPlayer, placementPoint) > WORLD.buildRange) return { ok: false, reason: "너무 멀리 설치할 수 없습니다." };',
  "fresh validity uses touched world point",
);

// Preview must use the same isometric inverse grid as the renderer. Using
// worldToBuildGrid here makes the preview jump to a different diamond lattice
// cell because build parts are drawn with buildGridToIsoCenter().
replaceOnce(
  '    const previewPosition = this.buildPartDragPosition ?? this.pointerWorldPosition;\n    const liftedPreviewPosition = this.getBuildPartTouchPlacementPosition(previewPosition);\n    const grid = worldToBuildGrid(liftedPreviewPosition);\n    const isoPos = buildGridToIsoCenter(grid.gridX, grid.gridY);\n    const snapped = buildGridToWorld(grid);\n    const validity = this.getBuildPartPlacementValidity(snapped);\n    this.buildPartRenderer.drawPreview(ctx, this.selectedBuildPartId, isoPos.x - isoCamX, isoPos.y - isoCamY, this.selectedBuildPartRotation, validity.ok, this.buildPartDragPointerId !== null ? 0.52 : 0.42, this.selectedBuildFloorLevel);',
  '    const previewPosition = this.buildPartDragPosition ?? this.pointerWorldPosition;\n    const grid = this.getBuildPartTouchPlacementGrid(previewPosition);\n    const isoPos = buildGridToIsoCenter(grid.gridX, grid.gridY);\n    const snapped = buildGridToWorld(grid);\n    const validity = this.getBuildPartPlacementValidity(this.getBuildPartTouchPlacementPosition(previewPosition));\n    this.buildPartRenderer.drawPreview(ctx, this.selectedBuildPartId, isoPos.x - isoCamX, isoPos.y - isoCamY, this.selectedBuildPartRotation, validity.ok, this.buildPartDragPointerId !== null ? 0.52 : 0.42, this.selectedBuildFloorLevel);',
  "preview uses iso inverse grid",
);

replaceOnce(
  '    const previewPosition = this.buildPartDragPosition ?? this.pointerWorldPosition;\n    const grid = worldToBuildGrid(previewPosition);\n    const isoPos = buildGridToIsoCenter(grid.gridX, grid.gridY);\n    const snapped = buildGridToWorld(grid);\n    const validity = this.getBuildPartPlacementValidity(snapped);\n    this.buildPartRenderer.drawPreview(ctx, this.selectedBuildPartId, isoPos.x - isoCamX, isoPos.y - isoCamY, this.selectedBuildPartRotation, validity.ok, this.buildPartDragPointerId !== null ? 0.52 : 0.42, this.selectedBuildFloorLevel);',
  '    const previewPosition = this.buildPartDragPosition ?? this.pointerWorldPosition;\n    const grid = this.getBuildPartTouchPlacementGrid(previewPosition);\n    const isoPos = buildGridToIsoCenter(grid.gridX, grid.gridY);\n    const snapped = buildGridToWorld(grid);\n    const validity = this.getBuildPartPlacementValidity(this.getBuildPartTouchPlacementPosition(previewPosition));\n    this.buildPartRenderer.drawPreview(ctx, this.selectedBuildPartId, isoPos.x - isoCamX, isoPos.y - isoCamY, this.selectedBuildPartRotation, validity.ok, this.buildPartDragPointerId !== null ? 0.52 : 0.42, this.selectedBuildFloorLevel);',
  "fresh preview uses iso inverse grid",
);

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
