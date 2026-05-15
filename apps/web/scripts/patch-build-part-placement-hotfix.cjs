const fs = require("fs");
const path = require("path");

const target = path.join(__dirname, "..", "src", "features", "game", "GameScene.tsx");
let source = fs.readFileSync(target, "utf8");
let changed = false;

function patchRegex(pattern, replacement, label) {
  if (!pattern.test(source)) {
    console.log(`[patch-build-part-placement-hotfix] skipped ${label}`);
    return;
  }
  source = source.replace(pattern, replacement);
  changed = true;
  console.log(`[patch-build-part-placement-hotfix] patched ${label}`);
}

function replaceOnce(search, replacement, label) {
  if (!source.includes(search)) {
    console.log(`[patch-build-part-placement-hotfix] skipped ${label}`);
    return;
  }
  source = source.replace(search, replacement);
  changed = true;
  console.log(`[patch-build-part-placement-hotfix] patched ${label}`);
}

function ensureAfter(anchor, insertion, label) {
  if (source.includes(insertion)) return;
  replaceOnce(anchor, `${anchor}\n${insertion}`, label);
}

patchRegex(
  /  private handlePointerMove = \(event: PointerEvent\) => \{[\s\S]*?\n  \};\n  private handlePointerUp = \(event: PointerEvent\) => \{/,
  `  private handlePointerMove = (event: PointerEvent) => {
    const position = this.screenToWorld(event.clientX, event.clientY);
    this.pointerWorldPosition = position;
    if (this.buildPartDragPointerId === event.pointerId || this.editingBuildPartPointerId === event.pointerId) this.buildPartDragPosition = position;
    const isBuildPartMode = Boolean(this.selectedBuildPartId) || Boolean(this.selectedPlacedBuildPartId);
    this.hoverCreatureId = this.placementPreviewBuildingType || isBuildPartMode ? null : this.getCreatureAt(position)?.id ?? null;
    this.hoverBuildingId = this.placementPreviewBuildingType || isBuildPartMode || this.hoverCreatureId ? null : this.getBuildingAt(position)?.id ?? null;
    if (!this.placementPreviewBuildingType) this.canvas.style.cursor = isBuildPartMode ? "crosshair" : this.hoverCreatureId || this.hoverBuildingId ? "pointer" : "default";
  };
  private handlePointerUp = (event: PointerEvent) => {`,
  "pointer move",
);

patchRegex(
  /  private handlePointerUp = \(event: PointerEvent\) => \{[\s\S]*?\n  \};\n  private handlePointerCancel = \(event: PointerEvent\) => \{/,
  `  private handlePointerUp = (event: PointerEvent) => {
    if (this.selectedPlacedBuildPartId && this.editingBuildPartPointerId === event.pointerId) {
      const position = this.screenToWorld(event.clientX, event.clientY);
      this.pointerWorldPosition = position;
      this.editingBuildPartPointerId = null;
      this.buildPartDragPosition = null;
      this.canvas.releasePointerCapture(event.pointerId);
      this.commitSelectedBuildPartMove(position);
      return;
    }
    if (this.selectedBuildPartId && this.buildPartDragPointerId === event.pointerId) {
      const position = this.screenToWorld(event.clientX, event.clientY);
      this.pointerWorldPosition = position;
      this.buildPartDragPointerId = null;
      this.buildPartDragPosition = null;
      this.canvas.releasePointerCapture(event.pointerId);
      this.commitBuildPartPlacement(position);
      return;
    }
    if (!this.placementPreviewBuildingType || this.placementPointerId !== event.pointerId) return;
    const position = this.screenToWorld(event.clientX, event.clientY);
    this.pointerWorldPosition = position;
    this.placementDragStart = null;
    this.placementPointerId = null;
    this.canvas.releasePointerCapture(event.pointerId);
    this.commitPlacement(position);
  };
  private handlePointerCancel = (event: PointerEvent) => {`,
  "pointer up",
);

patchRegex(
  /  private handlePointerCancel = \(event: PointerEvent\) => \{[\s\S]*?\n  \};\n  private handlePointerLeave =/,
  `  private handlePointerCancel = (event: PointerEvent) => {
    if (this.editingBuildPartPointerId === event.pointerId) {
      this.editingBuildPartPointerId = null;
      this.buildPartDragPosition = null;
    }
    if (this.buildPartDragPointerId === event.pointerId) {
      this.buildPartDragPointerId = null;
      this.buildPartDragPosition = null;
    }
    if (this.placementPointerId === event.pointerId) {
      this.placementDragStart = null;
      this.placementPointerId = null;
    }
  };
  private handlePointerLeave =`,
  "pointer cancel",
);

replaceOnce(
  '    this.drawMapBoundaryAndPortals(ctx, camera.x, camera.y);\n    this.drawBuildings(ctx, camera.x, camera.y, viewport);',
  '    this.drawMapBoundaryAndPortals(ctx, camera.x, camera.y);\n    this.drawBuildParts(ctx, camera.x, camera.y, viewport);\n    this.drawBuildings(ctx, camera.x, camera.y, viewport);',
  "draw build parts call",
);

replaceOnce(
  '    this.drawInteractionHint(ctx, camera.x, camera.y);\n    this.drawPlacementPreview(ctx, camera.x, camera.y);',
  '    this.drawInteractionHint(ctx, camera.x, camera.y);\n    this.drawPlacementPreview(ctx, camera.x, camera.y);\n    this.drawBuildPartPreview(ctx, camera.x, camera.y);',
  "draw preview call",
);

if (!source.includes('private drawBuildParts(ctx: CanvasRenderingContext2D')) {
  replaceOnce(
    '  private drawBuildings(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number, viewport: ViewportBounds) {',
    `  private drawBuildParts(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number, viewport: ViewportBounds) {
    for (const part of this.getSceneBuildParts()) {
      const world = buildGridToWorld(part);
      if (!isPositionInViewport(world, viewport)) continue;
      this.buildPartRenderer.drawPlacedPart(ctx, part, cameraX, cameraY);
      if (part.houseId && part.houseId === this.selectedHouseId) {
        this.buildPartRenderer.drawPlacedPartOutline(ctx, part, cameraX, cameraY, {
          strokeStyle: part.id === this.selectedPlacedBuildPartId ? "rgba(250, 204, 21, 0.95)" : "rgba(96, 165, 250, 0.5)",
          lineWidth: part.id === this.selectedPlacedBuildPartId ? 3 : 1,
          dashed: part.id !== this.selectedPlacedBuildPartId,
          fillStyle: part.id === this.selectedPlacedBuildPartId ? "rgba(250, 204, 21, 0.08)" : undefined,
        });
      }
    }
  }
  private drawBuildings(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number, viewport: ViewportBounds) {`,
    "drawBuildParts method",
  );
}

if (!source.includes('private drawBuildPartPreview(ctx: CanvasRenderingContext2D')) {
  replaceOnce(
    '  private drawInteractionHint(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {\n    if (this.placementPreviewBuildingType) return;',
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
  }
  private drawInteractionHint(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {
    if (this.placementPreviewBuildingType || this.selectedBuildPartId) return;`,
    "drawBuildPartPreview method",
  );
}

if (changed) fs.writeFileSync(target, source);
