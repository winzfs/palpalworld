const fs = require("fs");
const path = require("path");

const target = path.join(__dirname, "..", "src", "features", "game", "GameScene.tsx");
let source = fs.readFileSync(target, "utf8");
let changed = false;

function replaceOnce(search, replacement, label) {
  if (!source.includes(search)) {
    console.log(`[patch-game-scene-build-parts] skipped ${label}`);
    return;
  }
  source = source.replace(search, replacement);
  changed = true;
  console.log(`[patch-game-scene-build-parts] patched ${label}`);
}

function ensureAfter(anchor, insertion, label) {
  if (source.includes(insertion)) return;
  replaceOnce(anchor, `${anchor}\n${insertion}`, label);
}

ensureAfter(
  'import { TileMapRenderer } from "../rendering/TileMapRenderer";',
  'import { BuildPartRenderer } from "../rendering/BuildPartRenderer";\nimport { buildGridToWorld, worldToBuildGrid } from "../buildings/buildGrid";\nimport { BUILD_PARTS, rotateBuildPart, type BuildFloorLevel, type BuildPartId, type BuildPartRotation, type PlacedBuildPart } from "../buildings/buildPartCatalog";\nimport { createPlacedBuildPart, getBuildPartsForHouse, getBuildPartsForTile, moveBuildPart, readStoredBuildParts, removeBuildPart, rotatePlacedBuildPart, writeStoredBuildParts } from "../buildings/buildPartStore";',
  "imports",
);

ensureAfter(
  'type RemoteBuildingsEvent = CustomEvent<{ buildings?: SharedBuildingState[] }>;',
  'type BuildPartsChangedEvent = CustomEvent<{ parts?: PlacedBuildPart[] }>;',
  "BuildPartsChangedEvent",
);

replaceOnce(
  '  private renderer = new SpriteRenderer();\n  private tileMapRenderer = new TileMapRenderer();',
  '  private renderer = new SpriteRenderer();\n  private tileMapRenderer = new TileMapRenderer();\n  private buildPartRenderer = new BuildPartRenderer();',
  "renderer field",
);

replaceOnce(
  '  private remoteBuildings: SharedBuildingState[] = [];',
  '  private remoteBuildings: SharedBuildingState[] = [];\n  private placedBuildParts: PlacedBuildPart[] = readStoredBuildParts();',
  "placed parts field",
);

replaceOnce(
  '  private placementPreviewBuildingType: BuildingType | null = null;',
  '  private placementPreviewBuildingType: BuildingType | null = null;\n  private selectedBuildPartId: BuildPartId | null = null;\n  private selectedBuildPartRotation: BuildPartRotation = 0;\n  private selectedBuildFloorLevel: BuildFloorLevel = 0;\n  private buildPartDragPointerId: number | null = null;\n  private buildPartDragPosition: Vector2 | null = null;\n  private selectedPlacedBuildPartId: string | null = null;\n  private selectedHouseId: string | null = null;\n  private editingBuildPartPointerId: number | null = null;',
  "build part fields",
);

replaceOnce(
  '    window.addEventListener("palpalworld:remote-buildings", this.handleRemoteBuildings as EventListener);',
  '    window.addEventListener("palpalworld:remote-buildings", this.handleRemoteBuildings as EventListener);\n    window.addEventListener("palpalworld:build-parts-changed", this.handleBuildPartsChanged as EventListener);',
  "build parts listener add",
);

replaceOnce(
  '    window.removeEventListener("palpalworld:remote-buildings", this.handleRemoteBuildings as EventListener);',
  '    window.removeEventListener("palpalworld:remote-buildings", this.handleRemoteBuildings as EventListener);\n    window.removeEventListener("palpalworld:build-parts-changed", this.handleBuildPartsChanged as EventListener);',
  "build parts listener remove",
);

replaceOnce(
  '  setHighlightedCreatureId(creatureId: string | null) { this.highlightedCreatureId = creatureId; }',
  '  setHighlightedCreatureId(creatureId: string | null) { this.highlightedCreatureId = creatureId; }\n  setBuildPartPlacement(partId: BuildPartId | null, rotation: BuildPartRotation, floorLevel: BuildFloorLevel) {\n    this.selectedBuildPartId = partId;\n    this.selectedBuildPartRotation = rotation;\n    this.selectedBuildFloorLevel = floorLevel;\n    this.buildPartDragPointerId = null;\n    this.buildPartDragPosition = null;\n    this.canvas.style.cursor = partId ? "crosshair" : this.placementPreviewBuildingType ? "crosshair" : "default";\n  }',
  "setBuildPartPlacement",
);

replaceOnce(
  '  private handleRemoteBuildings = (event: RemoteBuildingsEvent) => {\n    const localIds = new Set((this.snapshot?.buildings ?? []).map((building) => building.id));\n    this.remoteBuildings = (event.detail?.buildings ?? []).filter((building) => {\n      if (!building?.id || this.hiddenBuildingIds.has(building.id)) return false;\n      if (localIds.has(building.id)) return false;\n      return isSameTile(getTileRef(building), this.getCurrentTile());\n    });\n  };',
  '  private handleRemoteBuildings = (event: RemoteBuildingsEvent) => {\n    const localIds = new Set((this.snapshot?.buildings ?? []).map((building) => building.id));\n    this.remoteBuildings = (event.detail?.buildings ?? []).filter((building) => {\n      if (!building?.id || this.hiddenBuildingIds.has(building.id)) return false;\n      if (localIds.has(building.id)) return false;\n      return isSameTile(getTileRef(building), this.getCurrentTile());\n    });\n  };\n  private handleBuildPartsChanged = (event: BuildPartsChangedEvent) => {\n    this.placedBuildParts = event.detail?.parts ?? readStoredBuildParts();\n    if (this.selectedPlacedBuildPartId && !this.placedBuildParts.some((part) => part.id === this.selectedPlacedBuildPartId)) {\n      this.selectedPlacedBuildPartId = null;\n      this.selectedHouseId = null;\n    }\n  };',
  "handleBuildPartsChanged",
);

replaceOnce(
  '  private getSceneBuildings() {\n    const localBuildings = (this.snapshot?.buildings ?? []).filter((building) => !this.hiddenBuildingIds.has(building.id));\n    const localIds = new Set(localBuildings.map((building) => building.id));\n    const remoteBuildings = this.remoteBuildings.filter((building) => !localIds.has(building.id) && !this.hiddenBuildingIds.has(building.id));\n    return [...localBuildings, ...remoteBuildings];\n  }',
  '  private getSceneBuildings() {\n    const localBuildings = (this.snapshot?.buildings ?? []).filter((building) => !this.hiddenBuildingIds.has(building.id));\n    const localIds = new Set(localBuildings.map((building) => building.id));\n    const remoteBuildings = this.remoteBuildings.filter((building) => !localIds.has(building.id) && !this.hiddenBuildingIds.has(building.id));\n    return [...localBuildings, ...remoteBuildings];\n  }\n  private getSceneBuildParts() {\n    return getBuildPartsForTile(this.placedBuildParts, this.getCurrentTile());\n  }\n  private getSelectedPlacedBuildPart() {\n    return this.selectedPlacedBuildPartId ? this.placedBuildParts.find((part) => part.id === this.selectedPlacedBuildPartId) ?? null : null;\n  }',
  "getSceneBuildParts",
);

replaceOnce(
  '  getPlacementValidity(position: Vector2): PlacementValidity {\n    if (!this.placementPreviewBuildingType) return { ok: true, reason: "설치 모드가 아닙니다." };',
  '  getBuildPartPlacementValidity(position: Vector2, movingPartId?: string | null): PlacementValidity {\n    if (!this.selectedBuildPartId && !movingPartId) return { ok: true, reason: "부품 설치 모드가 아닙니다." };\n    const localPlayer = this.getLocalPlayerPosition();\n    if (!localPlayer) return { ok: false, reason: "플레이어 위치를 찾을 수 없습니다." };\n    const movingPart = movingPartId ? this.placedBuildParts.find((part) => part.id === movingPartId) ?? null : null;\n    const partId = movingPart?.partId ?? this.selectedBuildPartId;\n    if (!partId) return { ok: false, reason: "선택한 부품이 없습니다." };\n    const part = BUILD_PARTS[partId];\n    if (!part) return { ok: false, reason: "알 수 없는 건축 부품입니다." };\n    const floorLevel = movingPart?.floorLevel ?? this.selectedBuildFloorLevel;\n    const grid = worldToBuildGrid(position);\n    const snapped = buildGridToWorld(grid);\n    if (snapped.x < 0 || snapped.x > MAP_TILE_SIZE.width || snapped.y < 0 || snapped.y > MAP_TILE_SIZE.height) return { ok: false, reason: "타일 밖에는 설치할 수 없습니다." };\n    if (distance(localPlayer, snapped) > WORLD.buildRange) return { ok: false, reason: "너무 멀리 설치할 수 없습니다." };\n    const sameCellParts = this.getSceneBuildParts().filter((existing) => existing.id !== movingPartId && existing.gridX === grid.gridX && existing.gridY === grid.gridY && existing.floorLevel === floorLevel);\n    if (sameCellParts.some((existing) => BUILD_PARTS[existing.partId]?.layer === part.layer)) return { ok: false, reason: "같은 위치에 이미 부품이 있습니다." };\n    if (part.requiresSupport && floorLevel > 0) {\n      const supported = this.getSceneBuildParts().some((existing) => existing.id !== movingPartId && existing.gridX === grid.gridX && existing.gridY === grid.gridY && existing.floorLevel === floorLevel - 1 && BUILD_PARTS[existing.partId]?.supportsUpperFloor);\n      if (!supported) return { ok: false, reason: "아래층 지지대가 필요합니다." };\n    }\n    if (part.requiresWall) {\n      const hasWall = sameCellParts.some((existing) => BUILD_PARTS[existing.partId]?.category === "wall");\n      if (!hasWall) return { ok: false, reason: "벽 위치에 설치해야 합니다." };\n    }\n    return { ok: true, reason: this.buildPartDragPointerId !== null || this.editingBuildPartPointerId !== null ? "손을 떼면 적용됩니다." : "그리드에 맞춰 설치됩니다." };\n  }\n\n  getPlacementValidity(position: Vector2): PlacementValidity {\n    if (!this.placementPreviewBuildingType) return { ok: true, reason: "설치 모드가 아닙니다." };',
  "build part validity",
);

replaceOnce(
  '  private getBuildingAt(position: Vector2) { let nearest: BuildingState | null = null; let nearestDistance = Number.POSITIVE_INFINITY; for (const building of this.getSceneBuildings()) { const hitDistance = distance(building.position, position); const hitRadius = getBuildingHitRadius(building); if (hitDistance <= hitRadius && hitDistance < nearestDistance) { nearest = building; nearestDistance = hitDistance; } } return nearest; }',
  '  private getBuildingAt(position: Vector2) { let nearest: BuildingState | null = null; let nearestDistance = Number.POSITIVE_INFINITY; for (const building of this.getSceneBuildings()) { const hitDistance = distance(building.position, position); const hitRadius = getBuildingHitRadius(building); if (hitDistance <= hitRadius && hitDistance < nearestDistance) { nearest = building; nearestDistance = hitDistance; } } return nearest; }\n  private getBuildPartAt(position: Vector2) {\n    const grid = worldToBuildGrid(position);\n    let nearest: PlacedBuildPart | null = null;\n    let nearestDistance = Number.POSITIVE_INFINITY;\n    for (const part of this.getSceneBuildParts()) {\n      const partWorld = buildGridToWorld(part);\n      const partDistance = distance(position, partWorld);\n      if (Math.abs(part.gridX - grid.gridX) <= 1 && Math.abs(part.gridY - grid.gridY) <= 1 && partDistance <= 38 && partDistance < nearestDistance) {\n        nearest = part;\n        nearestDistance = partDistance;\n      }\n    }\n    return nearest;\n  }',
  "getBuildPartAt",
);

replaceOnce(
  '  private commitPlacement(position: Vector2) { this.onWorldClick({ kind: "field", position, validity: this.getPlacementValidity(position) }); }',
  '  private commitPlacement(position: Vector2) { this.onWorldClick({ kind: "field", position, validity: this.getPlacementValidity(position) }); }\n  private commitBuildPartPlacement(position: Vector2) {\n    if (!this.selectedBuildPartId) return;\n    const validity = this.getBuildPartPlacementValidity(position);\n    if (!validity.ok) return;\n    const grid = worldToBuildGrid(position);\n    const placedPart = createPlacedBuildPart({\n      partId: this.selectedBuildPartId,\n      ownerPlayerId: this.localPlayerId ?? "demo-player",\n      currentTile: this.getCurrentTile(),\n      gridX: grid.gridX,\n      gridY: grid.gridY,\n      floorLevel: this.selectedBuildFloorLevel,\n      rotation: this.selectedBuildPartRotation,\n      existingParts: this.placedBuildParts,\n      houseId: this.selectedHouseId,\n    });\n    this.selectedPlacedBuildPartId = placedPart.id;\n    this.selectedHouseId = placedPart.houseId ?? null;\n    this.placedBuildParts = writeStoredBuildParts([...this.placedBuildParts, placedPart]);\n  }\n  private commitSelectedBuildPartMove(position: Vector2) {\n    const selected = this.getSelectedPlacedBuildPart();\n    if (!selected) return;\n    const validity = this.getBuildPartPlacementValidity(position, selected.id);\n    if (!validity.ok) return;\n    const grid = worldToBuildGrid(position);\n    this.placedBuildParts = moveBuildPart(selected.id, grid.gridX, grid.gridY, selected.floorLevel);\n  }',
  "commit build part placement and move",
);

replaceOnce(
  '    if (this.placementPreviewBuildingType) {\n      this.placementDragStart = position;\n      this.placementPointerId = event.pointerId;\n      this.canvas.setPointerCapture(event.pointerId);\n      return;\n    }',
  '    if (this.selectedBuildPartId && !this.placementPreviewBuildingType) {\n      this.buildPartDragPointerId = event.pointerId;\n      this.buildPartDragPosition = position;\n      this.canvas.setPointerCapture(event.pointerId);\n      return;\n    }\n    const buildPart = this.getBuildPartAt(position);\n    if (buildPart) {\n      this.selectedPlacedBuildPartId = buildPart.id;\n      this.selectedHouseId = buildPart.houseId ?? null;\n      this.editingBuildPartPointerId = event.pointerId;\n      this.buildPartDragPosition = position;\n      this.canvas.setPointerCapture(event.pointerId);\n      return;\n    }\n    if (this.placementPreviewBuildingType) {\n      this.placementDragStart = position;\n      this.placementPointerId = event.pointerId;\n      this.canvas.setPointerCapture(event.pointerId);\n      return;\n    }',
  "pointer down build part and edit",
);

replaceOnce(
  '    if (this.buildPartDragPointerId === event.pointerId) this.buildPartDragPosition = position;\n    const isBuildPartMode = Boolean(this.selectedBuildPartId);',
  '    if (this.buildPartDragPointerId === event.pointerId || this.editingBuildPartPointerId === event.pointerId) this.buildPartDragPosition = position;\n    const isBuildPartMode = Boolean(this.selectedBuildPartId) || Boolean(this.selectedPlacedBuildPartId);',
  "pointer move build part edit",
);

replaceOnce(
  '  private handlePointerUp = (event: PointerEvent) => {\n    if (this.selectedBuildPartId && this.buildPartDragPointerId === event.pointerId) {',
  '  private handlePointerUp = (event: PointerEvent) => {\n    if (this.selectedPlacedBuildPartId && this.editingBuildPartPointerId === event.pointerId) {\n      const position = this.screenToWorld(event.clientX, event.clientY);\n      this.pointerWorldPosition = position;\n      this.editingBuildPartPointerId = null;\n      this.buildPartDragPosition = null;\n      this.canvas.releasePointerCapture(event.pointerId);\n      this.commitSelectedBuildPartMove(position);\n      return;\n    }\n    if (this.selectedBuildPartId && this.buildPartDragPointerId === event.pointerId) {',
  "pointer up build part edit",
);

replaceOnce(
  '    if (this.buildPartDragPointerId === event.pointerId) {\n      this.buildPartDragPointerId = null;\n      this.buildPartDragPosition = null;\n    }',
  '    if (this.editingBuildPartPointerId === event.pointerId) {\n      this.editingBuildPartPointerId = null;\n      this.buildPartDragPosition = null;\n    }\n    if (this.buildPartDragPointerId === event.pointerId) {\n      this.buildPartDragPointerId = null;\n      this.buildPartDragPosition = null;\n    }',
  "pointer cancel build part edit",
);

replaceOnce(
  '  private handleKeyDown = (event: KeyboardEvent) => { const key = event.key.toLowerCase(); if (key === "e" && !this.keys.has(key)) this.onInteract(); this.keys.add(key); this.emitKeyboardInput(); };',
  '  private handleKeyDown = (event: KeyboardEvent) => { const key = event.key.toLowerCase(); if ((key === "delete" || key === "backspace") && this.selectedPlacedBuildPartId) { this.placedBuildParts = removeBuildPart(this.selectedPlacedBuildPartId); this.selectedPlacedBuildPartId = null; this.selectedHouseId = null; return; } if ((key === "r") && this.selectedPlacedBuildPartId) { const selected = this.getSelectedPlacedBuildPart(); if (selected) { const nextRotation = rotateBuildPart(selected.rotation); this.placedBuildParts = rotatePlacedBuildPart(selected.id, nextRotation); } return; } if (key === "escape") { this.selectedPlacedBuildPartId = null; this.selectedHouseId = null; } if (key === "e" && !this.keys.has(key)) this.onInteract(); this.keys.add(key); this.emitKeyboardInput(); };',
  "keyboard edit shortcuts",
);

replaceOnce(
  '    for (const part of this.getSceneBuildParts()) {\n      const world = buildGridToWorld(part);\n      if (!isPositionInViewport(world, viewport)) continue;\n      this.buildPartRenderer.drawPlacedPart(ctx, part, cameraX, cameraY);\n    }',
  '    for (const part of this.getSceneBuildParts()) {\n      const world = buildGridToWorld(part);\n      if (!isPositionInViewport(world, viewport)) continue;\n      this.buildPartRenderer.drawPlacedPart(ctx, part, cameraX, cameraY);\n      if (part.houseId && part.houseId === this.selectedHouseId) {\n        ctx.save();\n        ctx.strokeStyle = part.id === this.selectedPlacedBuildPartId ? "rgba(250, 204, 21, 0.95)" : "rgba(96, 165, 250, 0.5)";\n        ctx.lineWidth = part.id === this.selectedPlacedBuildPartId ? 3 : 1;\n        ctx.setLineDash(part.id === this.selectedPlacedBuildPartId ? [] : [5, 5]);\n        ctx.strokeRect(world.x - cameraX - 24, world.y - cameraY - 24, 48, 48);\n        ctx.restore();\n      }\n    }',
  "selected house highlight",
);

replaceOnce(
  '  private drawBuildPartPreview(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {\n    if (!this.selectedBuildPartId || !this.pointerWorldPosition) return;',
  '  private drawBuildPartPreview(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {\n    const movingSelected = this.getSelectedPlacedBuildPart();\n    if (movingSelected && this.buildPartDragPosition) {\n      const grid = worldToBuildGrid(this.buildPartDragPosition);\n      const snapped = buildGridToWorld(grid);\n      const validity = this.getBuildPartPlacementValidity(snapped, movingSelected.id);\n      this.buildPartRenderer.drawPreview(ctx, movingSelected.partId, snapped.x - cameraX, snapped.y - cameraY, movingSelected.rotation, validity.ok, 0.55, movingSelected.floorLevel);\n      return;\n    }\n    if (!this.selectedBuildPartId || !this.pointerWorldPosition) return;',
  "move preview",
);

replaceOnce(
  '    const placedPart = createPlacedBuildPart({\n      partId: this.selectedBuildPartId,\n      ownerPlayerId: this.localPlayerId ?? "demo-player",\n      currentTile: this.getCurrentTile(),\n      gridX: grid.gridX,\n      gridY: grid.gridY,\n      floorLevel: this.selectedBuildFloorLevel,\n      rotation: this.selectedBuildPartRotation,\n    });',
  '    const placedPart = createPlacedBuildPart({\n      partId: this.selectedBuildPartId,\n      ownerPlayerId: this.localPlayerId ?? "demo-player",\n      currentTile: this.getCurrentTile(),\n      gridX: grid.gridX,\n      gridY: grid.gridY,\n      floorLevel: this.selectedBuildFloorLevel,\n      rotation: this.selectedBuildPartRotation,\n      existingParts: this.placedBuildParts,\n      houseId: this.selectedHouseId,\n    });',
  "create placed part house args fallback",
);

replaceOnce(
  '    this.placedBuildParts = writeStoredBuildParts([...this.placedBuildParts, placedPart]);',
  '    this.selectedPlacedBuildPartId = placedPart.id;\n    this.selectedHouseId = placedPart.houseId ?? null;\n    this.placedBuildParts = writeStoredBuildParts([...this.placedBuildParts, placedPart]);',
  "select newly placed part fallback",
);

replaceOnce(
  'export function GameScene({ onReady, onInputChange, onInteract, onWorldClick, placementBuildingType, highlightedCreatureId }: { onReady: (scene: GameWorldScene) => void; onInputChange: (input: GameSceneInput) => void; onInteract: () => void; onWorldClick: (target: WorldClickTarget) => void; placementBuildingType?: BuildingType | null; highlightedCreatureId?: string | null }) {',
  'export function GameScene({ onReady, onInputChange, onInteract, onWorldClick, placementBuildingType, highlightedCreatureId, selectedBuildPartId, selectedBuildPartRotation = 0, selectedBuildFloorLevel = 0 }: { onReady: (scene: GameWorldScene) => void; onInputChange: (input: GameSceneInput) => void; onInteract: () => void; onWorldClick: (target: WorldClickTarget) => void; placementBuildingType?: BuildingType | null; highlightedCreatureId?: string | null; selectedBuildPartId?: BuildPartId | null; selectedBuildPartRotation?: BuildPartRotation; selectedBuildFloorLevel?: BuildFloorLevel }) {',
  "GameScene props",
);

replaceOnce(
  '  useEffect(() => { sceneRef.current?.setHighlightedCreatureId(highlightedCreatureId ?? null); }, [highlightedCreatureId]);',
  '  useEffect(() => { sceneRef.current?.setHighlightedCreatureId(highlightedCreatureId ?? null); }, [highlightedCreatureId]);\n  useEffect(() => { sceneRef.current?.setBuildPartPlacement(selectedBuildPartId ?? null, selectedBuildPartRotation, selectedBuildFloorLevel); }, [selectedBuildPartId, selectedBuildPartRotation, selectedBuildFloorLevel]);',
  "GameScene build part effect",
);

if (changed) fs.writeFileSync(target, source);
