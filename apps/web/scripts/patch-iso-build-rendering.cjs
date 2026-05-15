/**
 * patch-iso-build-rendering.cjs
 *
 * Switches building-part rendering from square-grid world coords to proper
 * isometric projection: isoX = (gx-gy)*24, isoY = (gx+gy)*14.88
 * This makes floor diamonds mesh without gaps and aligns preview with placement.
 *
 * Must run AFTER patch-game-perf-optimizations.cjs (last in prebuild).
 * Idempotent: uses "already-patched" guard.
 */
const fs = require("fs");
const path = require("path");

const scenePath = path.join(__dirname, "..", "src", "features", "game", "GameScene.tsx");
let scene = fs.readFileSync(scenePath, "utf8");
let changed = false;

function replaceIn(search, replacement, label) {
  if (!scene.includes(search)) {
    console.log(`[patch-iso-build-rendering] skipped ${label}`);
    return;
  }
  if (scene.includes(replacement)) {
    console.log(`[patch-iso-build-rendering] already-patched ${label}`);
    return;
  }
  scene = scene.replace(search, replacement);
  changed = true;
  console.log(`[patch-iso-build-rendering] patched ${label}`);
}

function ensureAfter(anchor, insertion, label) {
  if (scene.includes(insertion)) {
    console.log(`[patch-iso-build-rendering] already-patched ${label}`);
    return;
  }
  if (!scene.includes(anchor)) {
    console.log(`[patch-iso-build-rendering] skipped (anchor missing) ${label}`);
    return;
  }
  scene = scene.replace(anchor, `${anchor}\n${insertion}`);
  changed = true;
  console.log(`[patch-iso-build-rendering] patched ${label}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Import iso helpers
// ─────────────────────────────────────────────────────────────────────────────
ensureAfter(
  'import { BuildPartRenderer } from "../rendering/BuildPartRenderer";',
  'import { buildGridToIsoCenter, worldCameraToIsoBuildCamera, screenToIsoBuildGrid } from "../buildings/buildProjection2p5d";',
  "iso projection imports",
);

// Add BUILD_GRID_SIZE to the buildGrid import (needed for iso hit detection)
replaceIn(
  'import { buildGridToWorld, worldToBuildGrid } from "../buildings/buildGrid";',
  'import { BUILD_GRID_SIZE, buildGridToWorld, worldToBuildGrid } from "../buildings/buildGrid";',
  "buildGrid BUILD_GRID_SIZE import",
);

// ─────────────────────────────────────────────────────────────────────────────
// 2. draw() — compute iso camera + pass to drawBuildParts
// ─────────────────────────────────────────────────────────────────────────────
replaceIn(
  "    this.drawBuildParts(ctx, camera.x, camera.y, viewport);",
  "    const __isoCam = worldCameraToIsoBuildCamera(camera.x, camera.y, width, height);\n    this.drawBuildParts(ctx, camera.x, camera.y, viewport, __isoCam.x, __isoCam.y);",
  "draw() iso cam + drawBuildParts call",
);

// ─────────────────────────────────────────────────────────────────────────────
// 3. draw() — pass iso cam to drawBuildPartPreview
// ─────────────────────────────────────────────────────────────────────────────
replaceIn(
  "    this.drawBuildPartPreview(ctx, camera.x, camera.y);",
  "    this.drawBuildPartPreview(ctx, camera.x, camera.y, __isoCam.x, __isoCam.y);",
  "draw() drawBuildPartPreview iso args",
);

// ─────────────────────────────────────────────────────────────────────────────
// 4. drawBuildParts signature — add iso cam params
// ─────────────────────────────────────────────────────────────────────────────
replaceIn(
  "  private drawBuildParts(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number, viewport: ViewportBounds) {",
  "  private drawBuildParts(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number, viewport: ViewportBounds, isoCamX: number, isoCamY: number) {",
  "drawBuildParts signature",
);

// ─────────────────────────────────────────────────────────────────────────────
// 5. drawBuildParts body — use iso camera for drawPlacedPart
// ─────────────────────────────────────────────────────────────────────────────
replaceIn(
  "      this.buildPartRenderer.drawPlacedPart(ctx, part, cameraX, cameraY);",
  "      this.buildPartRenderer.drawPlacedPart(ctx, part, isoCamX, isoCamY);",
  "drawBuildParts drawPlacedPart iso",
);

// ─────────────────────────────────────────────────────────────────────────────
// 6. drawBuildParts body — outline with iso camera + demolition highlight
// ─────────────────────────────────────────────────────────────────────────────
replaceIn(
  `      if (part.houseId && part.houseId === this.selectedHouseId) {
        this.buildPartRenderer.drawPlacedPartOutline(ctx, part, cameraX, cameraY, {
          alpha: part.id === this.selectedPlacedBuildPartId ? 1 : visibility.outlineAlpha,
          strokeStyle: part.id === this.selectedPlacedBuildPartId ? "rgba(250, 204, 21, 0.95)" : "rgba(96, 165, 250, 0.68)",
          lineWidth: part.id === this.selectedPlacedBuildPartId ? 3 : 1,
          dashed: part.id !== this.selectedPlacedBuildPartId,
          fillStyle: part.id === this.selectedPlacedBuildPartId ? "rgba(250, 204, 21, 0.08)" : undefined,
        });
      }`,
  `      const __demolitionSel = this.demolitionSelectedPartIds.has(part.id);
      if (__demolitionSel || (part.houseId && part.houseId === this.selectedHouseId)) {
        this.buildPartRenderer.drawPlacedPartOutline(ctx, part, isoCamX, isoCamY, {
          alpha: part.id === this.selectedPlacedBuildPartId ? 1 : __demolitionSel ? 0.9 : visibility.outlineAlpha,
          strokeStyle: __demolitionSel ? "rgba(248, 113, 113, 0.98)" : part.id === this.selectedPlacedBuildPartId ? "rgba(250, 204, 21, 0.95)" : "rgba(96, 165, 250, 0.68)",
          lineWidth: __demolitionSel || part.id === this.selectedPlacedBuildPartId ? 3 : 1,
          dashed: !__demolitionSel && part.id !== this.selectedPlacedBuildPartId,
          fillStyle: __demolitionSel ? "rgba(248, 113, 113, 0.08)" : part.id === this.selectedPlacedBuildPartId ? "rgba(250, 204, 21, 0.08)" : undefined,
        });
      }`,
  "drawBuildParts outline iso + demolition",
);

// ─────────────────────────────────────────────────────────────────────────────
// 7. drawBuildPartPreview — replace entirely with iso-aware version
// ─────────────────────────────────────────────────────────────────────────────
replaceIn(
  `  private drawBuildPartPreview(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {
    const movingSelected = this.getSelectedPlacedBuildPart();
    if (movingSelected && this.buildPartDragPosition) {
      const grid = worldToBuildGrid(this.buildPartDragPosition);
      const snapped = buildGridToWorld(grid);
      const validity = this.getBuildPartPlacementValidity(snapped, movingSelected.id);
      this.buildPartRenderer.drawPreview(ctx, movingSelected.partId, snapped.x - cameraX, snapped.y - cameraY, movingSelected.rotation, validity.ok, 0.55, movingSelected.floorLevel);
      return;
    }
    if (!this.selectedBuildPartId || !this.pointerWorldPosition) return;
    const previewPosition = this.buildPartDragPosition ?? this.pointerWorldPosition;
    const grid = worldToBuildGrid(previewPosition);
    const snapped = buildGridToWorld(grid);
    const validity = this.getBuildPartPlacementValidity(snapped);
    this.buildPartRenderer.drawPreview(ctx, this.selectedBuildPartId, snapped.x - cameraX, snapped.y - cameraY, this.selectedBuildPartRotation, validity.ok, this.buildPartDragPointerId !== null ? 0.52 : 0.42, this.selectedBuildFloorLevel);
  }`,
  `  private drawBuildPartPreview(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number, isoCamX: number, isoCamY: number) {
    const movingSelected = this.getSelectedPlacedBuildPart();
    if (movingSelected && this.buildPartDragPosition) {
      const grid = worldToBuildGrid(this.buildPartDragPosition);
      const isoPos = buildGridToIsoCenter(grid.gridX, grid.gridY);
      const snapped = buildGridToWorld(grid);
      const validity = this.getBuildPartPlacementValidity(snapped, movingSelected.id);
      this.buildPartRenderer.drawPreview(ctx, movingSelected.partId, isoPos.x - isoCamX, isoPos.y - isoCamY, movingSelected.rotation, validity.ok, 0.55, movingSelected.floorLevel);
      return;
    }
    if (!this.selectedBuildPartId || !this.pointerWorldPosition) return;
    const previewPosition = this.buildPartDragPosition ?? this.pointerWorldPosition;
    const grid = worldToBuildGrid(previewPosition);
    const isoPos = buildGridToIsoCenter(grid.gridX, grid.gridY);
    const snapped = buildGridToWorld(grid);
    const validity = this.getBuildPartPlacementValidity(snapped);
    this.buildPartRenderer.drawPreview(ctx, this.selectedBuildPartId, isoPos.x - isoCamX, isoPos.y - isoCamY, this.selectedBuildPartRotation, validity.ok, this.buildPartDragPointerId !== null ? 0.52 : 0.42, this.selectedBuildFloorLevel);
  }`,
  "drawBuildPartPreview iso version",
);

// ─────────────────────────────────────────────────────────────────────────────
// 8. getBuildPartAt + getBuildPartsInWorldRect — iso-based hit detection
// ─────────────────────────────────────────────────────────────────────────────
replaceIn(
  `  private getBuildPartAt(position: Vector2) {
    const grid = worldToBuildGrid(position);
    let nearest: PlacedBuildPart | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const part of this.getSceneBuildParts()) {
      const definition = BUILD_PARTS[part.partId];
      const partWorld = buildGridToWorld(part);
      const halfWidth = Math.max(28, ((definition?.width ?? 1) * BUILD_GRID_SIZE) / 2 + 10);
      const halfHeight = Math.max(28, ((definition?.height ?? 1) * BUILD_GRID_SIZE) / 2 + 10);
      const inGridRange = Math.abs(part.gridX - grid.gridX) <= Math.max(1, definition?.width ?? 1) && Math.abs(part.gridY - grid.gridY) <= Math.max(1, definition?.height ?? 1);
      const inBox = Math.abs(position.x - partWorld.x) <= halfWidth && Math.abs(position.y - partWorld.y) <= halfHeight;
      const partDistance = distance(position, partWorld);
      if (inGridRange && inBox && partDistance < nearestDistance) {
        nearest = part;
        nearestDistance = partDistance;
      }
    }
    return nearest;
  }
  private getBuildPartsInWorldRect(start: Vector2, end: Vector2) {
    const left = Math.min(start.x, end.x);
    const right = Math.max(start.x, end.x);
    const top = Math.min(start.y, end.y);
    const bottom = Math.max(start.y, end.y);
    return this.getSceneBuildParts().filter((part) => {
      const definition = BUILD_PARTS[part.partId];
      const world = buildGridToWorld(part);
      const halfWidth = ((definition?.width ?? 1) * BUILD_GRID_SIZE) / 2;
      const halfHeight = ((definition?.height ?? 1) * BUILD_GRID_SIZE) / 2;
      return world.x + halfWidth >= left && world.x - halfWidth <= right && world.y + halfHeight >= top && world.y - halfHeight <= bottom;
    });
  }`,
  `  private getBuildPartAt(position: Vector2) {
    const __vw = this.cachedRootRectWidth || this.root.clientWidth;
    const __vh = this.cachedRootRectHeight || this.root.clientHeight;
    const __cam = this.getCameraOffset();
    const __isoCam = worldCameraToIsoBuildCamera(__cam.x, __cam.y, __vw, __vh);
    const __sx = position.x - __cam.x;
    const __sy = position.y - __cam.y;
    const __isoGrid = screenToIsoBuildGrid(__sx, __sy, __isoCam.x, __isoCam.y);
    let nearest: PlacedBuildPart | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const part of this.getSceneBuildParts()) {
      const definition = BUILD_PARTS[part.partId];
      const gRange = Math.max(1, definition?.width ?? 1, definition?.height ?? 1) + 1;
      if (Math.abs(part.gridX - __isoGrid.gridX) > gRange || Math.abs(part.gridY - __isoGrid.gridY) > gRange) continue;
      const partIso = buildGridToIsoCenter(part.gridX, part.gridY);
      const partSX = partIso.x - __isoCam.x;
      const partSY = partIso.y - __isoCam.y;
      const partDistance = Math.hypot(__sx - partSX, __sy - partSY);
      const hitRadius = Math.max(24, (BUILD_GRID_SIZE * Math.max(definition?.width ?? 1, definition?.height ?? 1)) / 2 + 8);
      if (partDistance <= hitRadius && partDistance < nearestDistance) {
        nearest = part;
        nearestDistance = partDistance;
      }
    }
    return nearest;
  }
  private getBuildPartsInWorldRect(start: Vector2, end: Vector2) {
    const __vw = this.cachedRootRectWidth || this.root.clientWidth;
    const __vh = this.cachedRootRectHeight || this.root.clientHeight;
    const __cam = this.getCameraOffset();
    const __isoCam = worldCameraToIsoBuildCamera(__cam.x, __cam.y, __vw, __vh);
    const startSX = start.x - __cam.x;
    const startSY = start.y - __cam.y;
    const endSX = end.x - __cam.x;
    const endSY = end.y - __cam.y;
    const gridA = screenToIsoBuildGrid(startSX, startSY, __isoCam.x, __isoCam.y);
    const gridB = screenToIsoBuildGrid(endSX, endSY, __isoCam.x, __isoCam.y);
    const minGX = Math.min(gridA.gridX, gridB.gridX) - 1;
    const maxGX = Math.max(gridA.gridX, gridB.gridX) + 1;
    const minGY = Math.min(gridA.gridY, gridB.gridY) - 1;
    const maxGY = Math.max(gridA.gridY, gridB.gridY) + 1;
    const scrLeft = Math.min(startSX, endSX);
    const scrRight = Math.max(startSX, endSX);
    const scrTop = Math.min(startSY, endSY);
    const scrBottom = Math.max(startSY, endSY);
    return this.getSceneBuildParts().filter((part) => {
      if (part.gridX < minGX || part.gridX > maxGX || part.gridY < minGY || part.gridY > maxGY) return false;
      const partIso = buildGridToIsoCenter(part.gridX, part.gridY);
      const partSX = partIso.x - __isoCam.x;
      const partSY = partIso.y - __isoCam.y;
      return partSX >= scrLeft && partSX <= scrRight && partSY >= scrTop && partSY <= scrBottom;
    });
  }`,
  "getBuildPartAt + getBuildPartsInWorldRect iso version",
);

if (changed) fs.writeFileSync(scenePath, scene);
