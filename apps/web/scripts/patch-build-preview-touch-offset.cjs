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
  }`;

if (!source.includes("getBuildPartTouchPlacementGrid")) {
  replaceOnce(
    '  private commitPlacement(position: Vector2) { this.onWorldClick({ kind: "field", position, validity: this.getPlacementValidity(position) }); }',
    `  private commitPlacement(position: Vector2) { this.onWorldClick({ kind: "field", position, validity: this.getPlacementValidity(position) }); }
${placementHelpers}`,
    "touch iso placement helpers",
  );
}

replaceOnce(
  '  private getBuildPartTouchPlacementWorld(position: Vector2): Vector2 {\n    return buildGridToWorld(this.getBuildPartTouchPlacementGrid(position));\n  }',
  '',
  "remove double-conversion helper",
);

// Keep build range based on the actual touched/clicked world point. The saved
// build grid is handled separately by getBuildPartTouchPlacementGrid().
replaceOnce(
  '    const grid = worldToBuildGrid(position);\n    const snapped = buildGridToWorld(grid);\n    const visualCenter = buildGridToIsoCenter(grid.gridX, grid.gridY);\n    if (visualCenter.x < 0 || visualCenter.x > MAP_TILE_SIZE.width || visualCenter.y < 0 || visualCenter.y > MAP_TILE_SIZE.height) return { ok: false, reason: "타일 밖에는 설치할 수 없습니다." };\n    if (distance(localPlayer, visualCenter) > WORLD.buildRange) return { ok: false, reason: "너무 멀리 설치할 수 없습니다." };',
  '    const grid = worldToBuildGrid(position);\n    const snapped = buildGridToWorld(grid);\n    const placementPoint = clampPositionToTile(position);\n    if (placementPoint.x < 0 || placementPoint.x > MAP_TILE_SIZE.width || placementPoint.y < 0 || placementPoint.y > MAP_TILE_SIZE.height) return { ok: false, reason: "타일 밖에는 설치할 수 없습니다." };\n    if (distance(localPlayer, placementPoint) > WORLD.buildRange) return { ok: false, reason: "너무 멀리 설치할 수 없습니다." };',
  "validity uses touched world point",
);

replaceOnce(
  '    const grid = worldToBuildGrid(position);\n    const snapped = buildGridToWorld(grid);\n    if (snapped.x < 0 || snapped.x > MAP_TILE_SIZE.width || snapped.y < 0 || snapped.y > MAP_TILE_SIZE.height) return { ok: false, reason: "타일 밖에는 설치할 수 없습니다." };\n    if (distance(localPlayer, snapped) > WORLD.buildRange) return { ok: false, reason: "너무 멀리 설치할 수 없습니다." };',
  '    const grid = worldToBuildGrid(position);\n    const snapped = buildGridToWorld(grid);\n    const placementPoint = clampPositionToTile(position);\n    if (placementPoint.x < 0 || placementPoint.x > MAP_TILE_SIZE.width || placementPoint.y < 0 || placementPoint.y > MAP_TILE_SIZE.height) return { ok: false, reason: "타일 밖에는 설치할 수 없습니다." };\n    if (distance(localPlayer, placementPoint) > WORLD.buildRange) return { ok: false, reason: "너무 멀리 설치할 수 없습니다." };',
  "fresh validity uses touched world point",
);

// Preview grid: iso inverse from the real screen/touch position.
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

// Override commit to accept the already-computed iso grid directly. This avoids
// iso grid -> buildGridToWorld -> worldToBuildGrid double conversion, which made
// parts install only around a few anchor-aligned positions.
replaceOnce(
  '  private commitBuildPartPlacement(position: Vector2) {\n    if (!this.selectedBuildPartId) return;\n    const validity = this.getBuildPartPlacementValidity(position);\n    if (!validity.ok) return;\n    const grid = worldToBuildGrid(position);\n    const placedPart = createPlacedBuildPart({\n      partId: this.selectedBuildPartId,\n      ownerPlayerId: this.localPlayerId ?? "demo-player",\n      currentTile: this.getCurrentTile(),\n      gridX: grid.gridX,\n      gridY: grid.gridY,\n      floorLevel: this.selectedBuildFloorLevel,\n      rotation: this.selectedBuildPartRotation,\n      existingParts: this.placedBuildParts,\n      houseId: this.selectedHouseId,\n    });\n    this.selectedPlacedBuildPartId = placedPart.id;\n    this.selectedHouseId = placedPart.houseId ?? null;\n    this.placedBuildParts = writeStoredBuildParts([...this.placedBuildParts, placedPart]);\n  }',
  '  private commitBuildPartPlacement(position: Vector2, gridOverride?: { gridX: number; gridY: number }) {\n    if (!this.selectedBuildPartId) return;\n    const validity = this.getBuildPartPlacementValidity(position);\n    if (!validity.ok) return;\n    const grid = gridOverride ?? worldToBuildGrid(position);\n    const placedPart = createPlacedBuildPart({\n      partId: this.selectedBuildPartId,\n      ownerPlayerId: this.localPlayerId ?? "demo-player",\n      currentTile: this.getCurrentTile(),\n      gridX: grid.gridX,\n      gridY: grid.gridY,\n      floorLevel: this.selectedBuildFloorLevel,\n      rotation: this.selectedBuildPartRotation,\n      existingParts: this.placedBuildParts,\n      houseId: this.selectedHouseId,\n    });\n    this.selectedPlacedBuildPartId = placedPart.id;\n    this.selectedHouseId = placedPart.houseId ?? null;\n    this.placedBuildParts = writeStoredBuildParts([...this.placedBuildParts, placedPart]);\n  }',
  "commit accepts iso grid override",
);

replaceOnce(
  '      this.commitBuildPartPlacement(this.getBuildPartTouchPlacementWorld(position));',
  '      this.commitBuildPartPlacement(this.getBuildPartTouchPlacementPosition(position), this.getBuildPartTouchPlacementGrid(position));',
  "commit direct iso grid",
);
replaceOnce(
  '      this.commitBuildPartPlacement(this.getBuildPartTouchPlacementPosition(position));',
  '      this.commitBuildPartPlacement(this.getBuildPartTouchPlacementPosition(position), this.getBuildPartTouchPlacementGrid(position));',
  "commit touch position direct iso grid",
);
replaceOnce(
  '      this.commitBuildPartPlacement(position);',
  '      this.commitBuildPartPlacement(this.getBuildPartTouchPlacementPosition(position), this.getBuildPartTouchPlacementGrid(position));',
  "fresh commit direct iso grid",
);

if (changed) fs.writeFileSync(target, source);
