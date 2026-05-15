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
  'import { BuildPartRenderer } from "../rendering/BuildPartRenderer";\nimport { buildGridToWorld, worldToBuildGrid } from "../buildings/buildGrid";\nimport { BUILD_PARTS, type BuildFloorLevel, type BuildPartId, type BuildPartRotation, type PlacedBuildPart } from "../buildings/buildPartCatalog";\nimport { createPlacedBuildPart, getBuildPartsForTile, readStoredBuildParts, writeStoredBuildParts } from "../buildings/buildPartStore";',
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
  '  private placementPreviewBuildingType: BuildingType | null = null;\n  private selectedBuildPartId: BuildPartId | null = null;\n  private selectedBuildPartRotation: BuildPartRotation = 0;\n  private selectedBuildFloorLevel: BuildFloorLevel = 0;\n  private buildPartDragPointerId: number | null = null;\n  private buildPartDragPosition: Vector2 | null = null;',
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
  '  private handleRemoteBuildings = (event: RemoteBuildingsEvent) => {\n    const localIds = new Set((this.snapshot?.buildings ?? []).map((building) => building.id));\n    this.remoteBuildings = (event.detail?.buildings ?? []).filter((building) => {\n      if (!building?.id || this.hiddenBuildingIds.has(building.id)) return false;\n      if (localIds.has(building.id)) return false;\n      return isSameTile(getTileRef(building), this.getCurrentTile());\n    });\n  };\n  private handleBuildPartsChanged = (event: BuildPartsChangedEvent) => {\n    this.placedBuildParts = event.detail?.parts ?? readStoredBuildParts();\n  };',
  "handleBuildPartsChanged",
);

replaceOnce(
  '  private getSceneBuildings() {\n    const localBuildings = (this.snapshot?.buildings ?? []).filter((building) => !this.hiddenBuildingIds.has(building.id));\n    const localIds = new Set(localBuildings.map((building) => building.id));\n    const remoteBuildings = this.remoteBuildings.filter((building) => !localIds.has(building.id) && !this.hiddenBuildingIds.has(building.id));\n    return [...localBuildings, ...remoteBuildings];\n  }',
  '  private getSceneBuildings() {\n    const localBuildings = (this.snapshot?.buildings ?? []).filter((building) => !this.hiddenBuildingIds.has(building.id));\n    const localIds = new Set(localBuildings.map((building) => building.id));\n    const remoteBuildings = this.remoteBuildings.filter((building) => !localIds.has(building.id) && !this.hiddenBuildingIds.has(building.id));\n    return [...localBuildings, ...remoteBuildings];\n  }\n  private getSceneBuildParts() {\n    return getBuildPartsForTile(this.placedBuildParts, this.getCurrentTile());\n  }',
  "getSceneBuildParts",
);

replaceOnce(
  '  getPlacementValidity(position: Vector2): PlacementValidity {\n    if (!this.placementPreviewBuildingType) return { ok: true, reason: "설치 모드가 아닙니다." };',
  '  getBuildPartPlacementValidity(position: Vector2): PlacementValidity {\n    if (!this.selectedBuildPartId) return { ok: true, reason: "부품 설치 모드가 아닙니다." };\n    const localPlayer = this.getLocalPlayerPosition();\n    if (!localPlayer) return { ok: false, reason: "플레이어 위치를 찾을 수 없습니다." };\n    const part = BUILD_PARTS[this.selectedBuildPartId];\n    if (!part) return { ok: false, reason: "알 수 없는 건축 부품입니다." };\n    const grid = worldToBuildGrid(position);\n    const snapped = buildGridToWorld(grid);\n    if (snapped.x < 0 || snapped.x > MAP_TILE_SIZE.width || snapped.y < 0 || snapped.y > MAP_TILE_SIZE.height) return { ok: false, reason: "타일 밖에는 설치할 수 없습니다." };\n    if (distance(localPlayer, snapped) > WORLD.buildRange) return { ok: false, reason: "너무 멀리 설치할 수 없습니다." };\n    const sameCellParts = this.getSceneBuildParts().filter((existing) => existing.gridX === grid.gridX && existing.gridY === grid.gridY && existing.floorLevel === this.selectedBuildFloorLevel);\n    if (sameCellParts.some((existing) => BUILD_PARTS[existing.partId]?.layer === part.layer)) return { ok: false, reason: "같은 위치에 이미 부품이 있습니다." };\n    if (part.requiresSupport && this.selectedBuildFloorLevel > 0) {\n      const supported = this.getSceneBuildParts().some((existing) => existing.gridX === grid.gridX && existing.gridY === grid.gridY && existing.floorLevel === this.selectedBuildFloorLevel - 1 && BUILD_PARTS[existing.partId]?.supportsUpperFloor);\n      if (!supported) return { ok: false, reason: "아래층 지지대가 필요합니다." };\n    }\n    if (part.requiresWall) {\n      const hasWall = sameCellParts.some((existing) => BUILD_PARTS[existing.partId]?.category === "wall");\n      if (!hasWall) return { ok: false, reason: "벽 위치에 설치해야 합니다." };\n    }\n    return { ok: true, reason: this.buildPartDragPointerId !== null ? "손을 떼면 설치됩니다." : "그리드에 맞춰 설치됩니다." };\n  }\n\n  getPlacementValidity(position: Vector2): PlacementValidity {\n    if (!this.placementPreviewBuildingType) return { ok: true, reason: "설치 모드가 아닙니다." };',
  "build part validity",
);

replaceOnce(
  '  private commitPlacement(position: Vector2) { this.onWorldClick({ kind: "field", position, validity: this.getPlacementValidity(position) }); }',
  '  private commitPlacement(position: Vector2) { this.onWorldClick({ kind: "field", position, validity: this.getPlacementValidity(position) }); }\n  private commitBuildPartPlacement(position: Vector2) {\n    if (!this.selectedBuildPartId) return;\n    const validity = this.getBuildPartPlacementValidity(position);\n    if (!validity.ok) return;\n    const grid = worldToBuildGrid(position);\n    const placedPart = createPlacedBuildPart({\n      partId: this.selectedBuildPartId,\n      ownerPlayerId: this.localPlayerId ?? "demo-player",\n      currentTile: this.getCurrentTile(),\n      gridX: grid.gridX,\n      gridY: grid.gridY,\n      floorLevel: this.selectedBuildFloorLevel,\n      rotation: this.selectedBuildPartRotation,\n    });\n    this.placedBuildParts = writeStoredBuildParts([...this.placedBuildParts, placedPart]);\n  }',
  "commitBuildPartPlacement",
);

replaceOnce(
  '    if (this.placementPreviewBuildingType) {\n      this.placementDragStart = position;\n      this.placementPointerId = event.pointerId;\n      this.canvas.setPointerCapture(event.pointerId);\n      return;\n    }',
  '    if (this.selectedBuildPartId && !this.placementPreviewBuildingType) {\n      this.buildPartDragPointerId = event.pointerId;\n      this.buildPartDragPosition = position;\n      this.canvas.setPointerCapture(event.pointerId);\n      return;\n    }\n    if (this.placementPreviewBuildingType) {\n      this.placementDragStart = position;\n      this.placementPointerId = event.pointerId;\n      this.canvas.setPointerCapture(event.pointerId);\n      return;\n    }',
  "pointer down build part",
);

replaceOnce(
  '    this.hoverCreatureId = this.placementPreviewBuildingType ? null : this.getCreatureAt(position)?.id ?? null;\n    this.hoverBuildingId = this.placementPreviewBuildingType || this.hoverCreatureId ? null : this.getBuildingAt(position)?.id ?? null;\n    if (!this.placementPreviewBuildingType) this.canvas.style.cursor = this.hoverCreatureId || this.hoverBuildingId ? "pointer" : "default";',
  '    if (this.buildPartDragPointerId === event.pointerId) this.buildPartDragPosition = position;\n    const isBuildPartMode = Boolean(this.selectedBuildPartId);\n    this.hoverCreatureId = this.placementPreviewBuildingType || isBuildPartMode ? null : this.getCreatureAt(position)?.id ?? null;\n    this.hoverBuildingId = this.placementPreviewBuildingType || isBuildPartMode || this.hoverCreatureId ? null : this.getBuildingAt(position)?.id ?? null;\n    if (!this.placementPreviewBuildingType) this.canvas.style.cursor = isBuildPartMode ? "crosshair" : this.hoverCreatureId || this.hoverBuildingId ? "pointer" : "default";',
  "pointer move build part",
);

replaceOnce(
  '  private handlePointerUp = (event: PointerEvent) => {\n    if (!this.placementPreviewBuildingType || this.placementPointerId !== event.pointerId) return;',
  '  private handlePointerUp = (event: PointerEvent) => {\n    if (this.selectedBuildPartId && this.buildPartDragPointerId === event.pointerId) {\n      const position = this.screenToWorld(event.clientX, event.clientY);\n      this.pointerWorldPosition = position;\n      this.buildPartDragPointerId = null;\n      this.buildPartDragPosition = null;\n      this.canvas.releasePointerCapture(event.pointerId);\n      this.commitBuildPartPlacement(position);\n      return;\n    }\n    if (!this.placementPreviewBuildingType || this.placementPointerId !== event.pointerId) return;',
  "pointer up build part",
);

replaceOnce(
  '    if (this.placementPointerId === event.pointerId) {\n      this.placementDragStart = null;\n      this.placementPointerId = null;\n    }',
  '    if (this.buildPartDragPointerId === event.pointerId) {\n      this.buildPartDragPointerId = null;\n      this.buildPartDragPosition = null;\n    }\n    if (this.placementPointerId === event.pointerId) {\n      this.placementDragStart = null;\n      this.placementPointerId = null;\n    }',
  "pointer cancel build part",
);

replaceOnce(
  '  private handlePointerLeave = () => { this.hoverBuildingId = null; this.hoverCreatureId = null; if (!this.placementPreviewBuildingType) { this.pointerWorldPosition = null; this.canvas.style.cursor = "default"; } };',
  '  private handlePointerLeave = () => { this.hoverBuildingId = null; this.hoverCreatureId = null; if (!this.placementPreviewBuildingType && !this.selectedBuildPartId) { this.pointerWorldPosition = null; this.canvas.style.cursor = "default"; } };',
  "pointer leave build part",
);

replaceOnce(
  '    this.drawBuildings(ctx, camera.x, camera.y, viewport);\n    this.drawResources(ctx, camera.x, camera.y, viewport);',
  '    this.drawBuildParts(ctx, camera.x, camera.y, viewport);\n    this.drawBuildings(ctx, camera.x, camera.y, viewport);\n    this.drawResources(ctx, camera.x, camera.y, viewport);',
  "draw build parts",
);

replaceOnce(
  '    this.drawInteractionHint(ctx, camera.x, camera.y);\n    this.drawPlacementPreview(ctx, camera.x, camera.y);',
  '    this.drawInteractionHint(ctx, camera.x, camera.y);\n    this.drawPlacementPreview(ctx, camera.x, camera.y);\n    this.drawBuildPartPreview(ctx, camera.x, camera.y);',
  "draw build part preview",
);

replaceOnce(
  '  private drawBuildings(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number, viewport: ViewportBounds) {',
  '  private drawBuildParts(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number, viewport: ViewportBounds) {\n    for (const part of this.getSceneBuildParts()) {\n      const world = buildGridToWorld(part);\n      if (!isPositionInViewport(world, viewport)) continue;\n      this.buildPartRenderer.drawPlacedPart(ctx, part, cameraX, cameraY);\n    }\n  }\n  private drawBuildings(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number, viewport: ViewportBounds) {',
  "drawBuildParts method",
);

replaceOnce(
  '  private drawInteractionHint(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {\n    if (this.placementPreviewBuildingType) return;',
  '  private drawBuildPartPreview(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {\n    if (!this.selectedBuildPartId || !this.pointerWorldPosition) return;\n    const previewPosition = this.buildPartDragPosition ?? this.pointerWorldPosition;\n    const grid = worldToBuildGrid(previewPosition);\n    const snapped = buildGridToWorld(grid);\n    const validity = this.getBuildPartPlacementValidity(snapped);\n    const x = snapped.x - cameraX;\n    const y = snapped.y - cameraY;\n    this.buildPartRenderer.drawPreview(ctx, this.selectedBuildPartId, x, y, this.selectedBuildPartRotation, validity.ok, this.buildPartDragPointerId !== null ? 0.52 : 0.42, this.selectedBuildFloorLevel);\n    ctx.save();\n    ctx.fillStyle = "rgba(15, 23, 42, 0.86)";\n    ctx.strokeStyle = validity.ok ? "rgba(34, 197, 94, 0.82)" : "rgba(239, 68, 68, 0.82)";\n    ctx.lineWidth = 1;\n    ctx.beginPath();\n    ctx.roundRect(x - 98, y - 62, 196, 30, 8);\n    ctx.fill();\n    ctx.stroke();\n    ctx.fillStyle = validity.ok ? "#bbf7d0" : "#fecaca";\n    ctx.font = "12px system-ui";\n    ctx.textAlign = "center";\n    ctx.fillText(validity.reason, x, y - 43);\n    ctx.restore();\n  }\n  private drawInteractionHint(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {\n    if (this.placementPreviewBuildingType || this.selectedBuildPartId) return;',
  "drawBuildPartPreview method",
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
