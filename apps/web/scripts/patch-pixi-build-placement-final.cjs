const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'src', 'features', 'game', 'GameScene.tsx');
let source = fs.readFileSync(target, 'utf8');
let changed = false;

function replaceOnce(search, replacement, label) {
  if (source.includes(replacement)) return;
  if (!source.includes(search)) {
    console.log(`[patch-pixi-build-placement-final] skipped ${label}`);
    return;
  }
  source = source.replace(search, replacement);
  changed = true;
  console.log(`[patch-pixi-build-placement-final] patched ${label}`);
}

function replaceRegex(regex, replacement, label) {
  if (!regex.test(source)) {
    console.log(`[patch-pixi-build-placement-final] skipped ${label}`);
    return;
  }
  source = source.replace(regex, replacement);
  changed = true;
  console.log(`[patch-pixi-build-placement-final] patched ${label}`);
}

function ensureAfter(anchor, insertion, label) {
  if (source.includes(insertion)) return;
  replaceOnce(anchor, `${anchor}\n${insertion}`, label);
}

ensureAfter(
  'import { TileMapRenderer } from "../rendering/TileMapRenderer";',
  'import { buildGridToWorld, worldToBuildGrid } from "../buildings/buildGrid";\nimport { BUILD_PARTS, type BuildFloorLevel, type BuildPartId, type BuildPartRotation, type PlacedBuildPart } from "../buildings/buildPartCatalog";\nimport { createPlacedBuildPart, getBuildPartsForTile, readStoredBuildParts, writeStoredBuildParts } from "../buildings/buildPartStore";\nimport { buildGridToIsoCenter, screenToIsoBuildGrid, worldCameraToIsoBuildCamera } from "../buildings/buildProjection2p5d";',
  'final build imports',
);

ensureAfter(
  'type RemoteBuildingsEvent = CustomEvent<{ buildings?: SharedBuildingState[] }>;',
  'type BuildPartsChangedEvent = CustomEvent<{ parts?: PlacedBuildPart[] }>;',
  'final build parts event type',
);

replaceOnce(
  '  private remoteBuildings: SharedBuildingState[] = [];',
  '  private remoteBuildings: SharedBuildingState[] = [];\n  private placedBuildParts: PlacedBuildPart[] = readStoredBuildParts();',
  'placed parts field',
);

replaceOnce(
  '  private placementPreviewBuildingType: BuildingType | null = null;',
  '  private placementPreviewBuildingType: BuildingType | null = null;\n  private selectedBuildPartId: BuildPartId | null = null;\n  private selectedBuildPartRotation: BuildPartRotation = 0;\n  private selectedBuildFloorLevel: BuildFloorLevel = 0;\n  private buildPartDragPointerId: number | null = null;\n  private buildPartDragPosition: Vector2 | null = null;\n  private selectedPlacedBuildPartId: string | null = null;\n  private selectedHouseId: string | null = null;',
  'build state fields',
);

replaceOnce(
  '    window.addEventListener("palpalworld:remote-buildings", this.handleRemoteBuildings as EventListener);',
  '    window.addEventListener("palpalworld:remote-buildings", this.handleRemoteBuildings as EventListener);\n    window.addEventListener("palpalworld:build-parts-changed", this.handleBuildPartsChanged as EventListener);',
  'build parts listener add',
);

replaceOnce(
  '    window.removeEventListener("palpalworld:remote-buildings", this.handleRemoteBuildings as EventListener);',
  '    window.removeEventListener("palpalworld:remote-buildings", this.handleRemoteBuildings as EventListener);\n    window.removeEventListener("palpalworld:build-parts-changed", this.handleBuildPartsChanged as EventListener);',
  'build parts listener remove',
);

replaceOnce(
  '  setHighlightedCreatureId(creatureId: string | null) { this.highlightedCreatureId = creatureId; }',
  '  setHighlightedCreatureId(creatureId: string | null) { this.highlightedCreatureId = creatureId; }\n  setBuildPartPlacement(partId: BuildPartId | null, rotation: BuildPartRotation, floorLevel: BuildFloorLevel) {\n    this.selectedBuildPartId = partId;\n    this.selectedBuildPartRotation = rotation;\n    this.selectedBuildFloorLevel = floorLevel;\n    this.buildPartDragPointerId = null;\n    this.buildPartDragPosition = null;\n    this.canvas.style.cursor = partId ? "crosshair" : this.placementPreviewBuildingType ? "crosshair" : "default";\n  }',
  'setBuildPartPlacement method',
);

replaceOnce(
  '  private handleRemoteBuildings = (event: RemoteBuildingsEvent) => {\n    const localIds = new Set((this.snapshot?.buildings ?? []).map((building) => building.id));\n    this.remoteBuildings = (event.detail?.buildings ?? []).filter((building) => {\n      if (!building?.id || this.hiddenBuildingIds.has(building.id)) return false;\n      if (localIds.has(building.id)) return false;\n      return isSameTile(getTileRef(building), this.getCurrentTile());\n    });\n  };',
  '  private handleRemoteBuildings = (event: RemoteBuildingsEvent) => {\n    const localIds = new Set((this.snapshot?.buildings ?? []).map((building) => building.id));\n    this.remoteBuildings = (event.detail?.buildings ?? []).filter((building) => {\n      if (!building?.id || this.hiddenBuildingIds.has(building.id)) return false;\n      if (localIds.has(building.id)) return false;\n      return isSameTile(getTileRef(building), this.getCurrentTile());\n    });\n  };\n  private handleBuildPartsChanged = (event: BuildPartsChangedEvent) => {\n    this.placedBuildParts = event.detail?.parts ?? readStoredBuildParts();\n  };',
  'handle build parts changed',
);

replaceOnce(
  '  private getSceneBuildings() {\n    const localBuildings = (this.snapshot?.buildings ?? []).filter((building) => !this.hiddenBuildingIds.has(building.id));\n    const localIds = new Set(localBuildings.map((building) => building.id));\n    const remoteBuildings = this.remoteBuildings.filter((building) => !localIds.has(building.id) && !this.hiddenBuildingIds.has(building.id));\n    return [...localBuildings, ...remoteBuildings];\n  }',
  '  private getSceneBuildings() {\n    const localBuildings = (this.snapshot?.buildings ?? []).filter((building) => !this.hiddenBuildingIds.has(building.id));\n    const localIds = new Set(localBuildings.map((building) => building.id));\n    const remoteBuildings = this.remoteBuildings.filter((building) => !localIds.has(building.id) && !this.hiddenBuildingIds.has(building.id));\n    return [...localBuildings, ...remoteBuildings];\n  }\n  private getSceneBuildParts() { return getBuildPartsForTile(this.placedBuildParts, this.getCurrentTile()); }',
  'get scene build parts',
);

const finalHelpers = `
  private getIsoBuildGridFromWorldTouch(position: Vector2, forceLift = false): { gridX: number; gridY: number } {
    const lifted = forceLift ? clampPositionToTile({ x: position.x, y: position.y - 22 }) : position;
    const rect = this.root.getBoundingClientRect();
    const camera = this.getCameraOffset();
    const isoCamera = worldCameraToIsoBuildCamera(camera.x, camera.y, rect.width, rect.height);
    return screenToIsoBuildGrid(lifted.x - camera.x, lifted.y - camera.y, isoCamera.x, isoCamera.y);
  }
  private getWorldPointFromIsoBuildGrid(grid: { gridX: number; gridY: number }): Vector2 {
    const iso = buildGridToIsoCenter(grid.gridX, grid.gridY);
    return clampPositionToTile({ x: iso.x, y: iso.y });
  }
  private getBuildPartPlacementValidityFinal(position: Vector2, grid?: { gridX: number; gridY: number }): PlacementValidity {
    if (!this.selectedBuildPartId) return { ok: true, reason: "부품 설치 모드가 아닙니다." };
    const localPlayer = this.getLocalPlayerPosition();
    if (!localPlayer) return { ok: false, reason: "플레이어 위치를 찾을 수 없습니다." };
    const placementPoint = clampPositionToTile(position);
    if (placementPoint.x < 0 || placementPoint.x > MAP_TILE_SIZE.width || placementPoint.y < 0 || placementPoint.y > MAP_TILE_SIZE.height) return { ok: false, reason: "타일 밖에는 설치할 수 없습니다." };
    if (distance(localPlayer, placementPoint) > WORLD.buildRange + 96) return { ok: false, reason: "너무 멀리 설치할 수 없습니다." };
    const targetGrid = grid ?? this.getIsoBuildGridFromWorldTouch(placementPoint, this.buildPartDragPointerId !== null);
    const partDef = BUILD_PARTS[this.selectedBuildPartId];
    if (!partDef) return { ok: false, reason: "알 수 없는 건축 부품입니다." };
    const sameLayer = this.getSceneBuildParts().some((part) => part.gridX === targetGrid.gridX && part.gridY === targetGrid.gridY && part.floorLevel === this.selectedBuildFloorLevel && BUILD_PARTS[part.partId]?.layer === partDef.layer);
    if (sameLayer) return { ok: false, reason: "같은 위치에 이미 부품이 있습니다." };
    return { ok: true, reason: "손을 떼면 설치됩니다." };
  }
  private commitBuildPartPlacementFinal(position: Vector2) {
    if (!this.selectedBuildPartId) return;
    const grid = this.getIsoBuildGridFromWorldTouch(position, true);
    const placementPoint = this.getWorldPointFromIsoBuildGrid(grid);
    const validity = this.getBuildPartPlacementValidityFinal(placementPoint, grid);
    if (!validity.ok) {
      window.dispatchEvent(new CustomEvent("palpalworld:placement-failed", { detail: { reason: validity.reason } }));
      return;
    }
    const placedPart = createPlacedBuildPart({
      partId: this.selectedBuildPartId,
      ownerPlayerId: this.localPlayerId ?? "demo-player",
      currentTile: this.getCurrentTile(),
      gridX: grid.gridX,
      gridY: grid.gridY,
      floorLevel: this.selectedBuildFloorLevel,
      rotation: this.selectedBuildPartRotation,
      existingParts: this.placedBuildParts,
      houseId: this.selectedHouseId,
    });
    this.selectedPlacedBuildPartId = placedPart.id;
    this.selectedHouseId = placedPart.houseId ?? null;
    this.placedBuildParts = writeStoredBuildParts([...this.placedBuildParts, placedPart]);
    window.dispatchEvent(new CustomEvent("palpalworld:build-parts-changed", { detail: { parts: this.placedBuildParts } }));
    this.dispatchPixiBuildParts();
  }`;

if (!source.includes('getIsoBuildGridFromWorldTouch')) {
  replaceOnce(
    '  private commitPlacement(position: Vector2) { this.onWorldClick({ kind: "field", position, validity: this.getPlacementValidity(position) }); }',
    `  private commitPlacement(position: Vector2) { this.onWorldClick({ kind: "field", position, validity: this.getPlacementValidity(position) }); }\n${finalHelpers}`,
    'final iso helpers and commit',
  );
} else if (!source.includes('commitBuildPartPlacementFinal')) {
  replaceRegex(
    /  private getBuildPartPlacementValidityFinal\([\s\S]*?\n  \}/,
    finalHelpers,
    'replace final helpers with commit',
  );
}

replaceOnce(
  '    if (this.placementPreviewBuildingType) {\n      this.placementDragStart = position;\n      this.placementPointerId = event.pointerId;\n      this.canvas.setPointerCapture(event.pointerId);\n      return;\n    }',
  '    if (this.selectedBuildPartId && !this.placementPreviewBuildingType) {\n      this.buildPartDragPointerId = event.pointerId;\n      this.buildPartDragPosition = position;\n      this.canvas.setPointerCapture(event.pointerId);\n      return;\n    }\n    if (this.placementPreviewBuildingType) {\n      this.placementDragStart = position;\n      this.placementPointerId = event.pointerId;\n      this.canvas.setPointerCapture(event.pointerId);\n      return;\n    }',
  'pointerdown build part branch exact',
);

replaceRegex(
  /  private handlePointerDown = \(event: PointerEvent\) => \{[\s\S]*?\n  \};\n  private handlePointerMove =/,
  `  private handlePointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    const position = this.screenToWorld(event.clientX, event.clientY);
    this.pointerWorldPosition = position;
    if (this.selectedBuildPartId && !this.placementPreviewBuildingType) {
      this.buildPartDragPointerId = event.pointerId;
      this.buildPartDragPosition = position;
      this.canvas.setPointerCapture(event.pointerId);
      return;
    }
    if (this.placementPreviewBuildingType) {
      this.placementDragStart = position;
      this.placementPointerId = event.pointerId;
      this.canvas.setPointerCapture(event.pointerId);
      return;
    }
    const creature = this.getCreatureAt(position);
    if (creature) { this.onWorldClick({ kind: "creature", creature }); this.emitPrimaryTap(); return; }
    const building = this.getBuildingAt(position);
    if (building) { this.onWorldClick({ kind: "building", building }); return; }
    this.onWorldClick({ kind: "field", position, validity: this.getPlacementValidity(position) });
  };
  private handlePointerMove =`,
  'pointerdown build part branch regex',
);

replaceRegex(
  /  private handlePointerMove = \(event: PointerEvent\) => \{[\s\S]*?\n  \};\n  private handlePointerUp =/,
  `  private handlePointerMove = (event: PointerEvent) => {
    const position = this.screenToWorld(event.clientX, event.clientY);
    this.pointerWorldPosition = position;
    if (this.buildPartDragPointerId === event.pointerId) this.buildPartDragPosition = position;
    this.hoverCreatureId = this.placementPreviewBuildingType || this.selectedBuildPartId ? null : this.getCreatureAt(position)?.id ?? null;
    this.hoverBuildingId = this.placementPreviewBuildingType || this.selectedBuildPartId || this.hoverCreatureId ? null : this.getBuildingAt(position)?.id ?? null;
    if (!this.placementPreviewBuildingType && !this.selectedBuildPartId) this.canvas.style.cursor = this.hoverCreatureId || this.hoverBuildingId ? "pointer" : "default";
  };
  private handlePointerUp =`,
  'pointermove build part branch regex',
);

replaceRegex(
  /  private handlePointerUp = \(event: PointerEvent\) => \{[\s\S]*?\n  \};\n  private handlePointerCancel =/,
  `  private handlePointerUp = (event: PointerEvent) => {
    if (this.selectedBuildPartId && this.buildPartDragPointerId === event.pointerId) {
      const position = this.screenToWorld(event.clientX, event.clientY);
      this.pointerWorldPosition = position;
      this.buildPartDragPointerId = null;
      this.buildPartDragPosition = null;
      try { this.canvas.releasePointerCapture(event.pointerId); } catch {}
      this.commitBuildPartPlacementFinal(position);
      return;
    }
    if (!this.placementPreviewBuildingType || this.placementPointerId !== event.pointerId) return;
    const position = this.screenToWorld(event.clientX, event.clientY);
    this.pointerWorldPosition = position;
    this.placementDragStart = null;
    this.placementPointerId = null;
    try { this.canvas.releasePointerCapture(event.pointerId); } catch {}
    this.commitPlacement(position);
  };
  private handlePointerCancel =`,
  'pointerup build part commit regex',
);

replaceRegex(
  /  private handlePointerCancel = \(event: PointerEvent\) => \{[\s\S]*?\n  \};\n  private handlePointerLeave =/,
  `  private handlePointerCancel = (event: PointerEvent) => {
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
  'pointercancel build part cleanup regex',
);

replaceRegex(
  /  private dispatchPixiBuildParts\(\) \{[\s\S]*?\n  private dispatchPixiFeedback\(\) \{/,
  `  private dispatchPixiBuildParts() {
    if (!isPixiStageEnabled()) return;
    const parts = this.getSceneBuildParts();
    const previewPosition = this.buildPartDragPosition ?? this.pointerWorldPosition;
    const previewGrid = this.selectedBuildPartId && previewPosition
      ? this.getIsoBuildGridFromWorldTouch(previewPosition, this.buildPartDragPointerId !== null)
      : null;
    const previewPlacementPoint = previewGrid ? this.getWorldPointFromIsoBuildGrid(previewGrid) : previewPosition;
    window.dispatchEvent(new CustomEvent("palpalworld:pixi-build-parts", {
      detail: {
        parts,
        selectedPartId: this.selectedPlacedBuildPartId,
        selectedHouseId: this.selectedHouseId,
        preview: this.selectedBuildPartId && previewPosition && previewPlacementPoint
          ? {
              partId: this.selectedBuildPartId,
              position: previewPlacementPoint,
              gridX: previewGrid?.gridX,
              gridY: previewGrid?.gridY,
              rotation: this.selectedBuildPartRotation,
              floorLevel: this.selectedBuildFloorLevel,
              valid: this.getBuildPartPlacementValidityFinal(previewPlacementPoint, previewGrid ?? undefined).ok,
            }
          : null,
      },
    }));
  }
  private dispatchPixiFeedback() {`,
  'replace dispatchPixiBuildParts final',
);

replaceOnce(
  'export function GameScene({ onReady, onInputChange, onInteract, onWorldClick, placementBuildingType, highlightedCreatureId }: { onReady: (scene: GameWorldScene) => void; onInputChange: (input: GameSceneInput) => void; onInteract: () => void; onWorldClick: (target: WorldClickTarget) => void; placementBuildingType?: BuildingType | null; highlightedCreatureId?: string | null }) {',
  'export function GameScene({ onReady, onInputChange, onInteract, onWorldClick, placementBuildingType, highlightedCreatureId, selectedBuildPartId, selectedBuildPartRotation = 0, selectedBuildFloorLevel = 0 }: { onReady: (scene: GameWorldScene) => void; onInputChange: (input: GameSceneInput) => void; onInteract: () => void; onWorldClick: (target: WorldClickTarget) => void; placementBuildingType?: BuildingType | null; highlightedCreatureId?: string | null; selectedBuildPartId?: BuildPartId | null; selectedBuildPartRotation?: BuildPartRotation; selectedBuildFloorLevel?: BuildFloorLevel }) {',
  'GameScene final props',
);

replaceOnce(
  '  useEffect(() => { sceneRef.current?.setHighlightedCreatureId(highlightedCreatureId ?? null); }, [highlightedCreatureId]);',
  '  useEffect(() => { sceneRef.current?.setHighlightedCreatureId(highlightedCreatureId ?? null); }, [highlightedCreatureId]);\n  useEffect(() => { sceneRef.current?.setBuildPartPlacement(selectedBuildPartId ?? null, selectedBuildPartRotation, selectedBuildFloorLevel); }, [selectedBuildPartId, selectedBuildPartRotation, selectedBuildFloorLevel]);',
  'GameScene final build effect',
);

if (changed) fs.writeFileSync(target, source);
else console.log('[patch-pixi-build-placement-final] no changes');
