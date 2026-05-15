const fs = require("fs");
const path = require("path");

const panelPath = path.join(__dirname, "..", "src", "features", "buildings", "BuildModePanel.tsx");
const scenePath = path.join(__dirname, "..", "src", "features", "game", "GameScene.tsx");
const clientPath = path.join(__dirname, "..", "src", "features", "game", "GameClientTileDemoStation.tsx");
let panel = fs.readFileSync(panelPath, "utf8");
let scene = fs.readFileSync(scenePath, "utf8");
let client = fs.readFileSync(clientPath, "utf8");
let panelChanged = false;
let sceneChanged = false;
let clientChanged = false;

function replaceIn(which, search, replacement, label) {
  let source = which === "panel" ? panel : which === "scene" ? scene : client;
  if (!source.includes(search)) {
    console.log(`[patch-build-demolition-mode] skipped ${which} ${label}`);
    return;
  }
  source = source.replace(search, replacement);
  if (which === "panel") { panel = source; panelChanged = true; }
  else if (which === "scene") { scene = source; sceneChanged = true; }
  else { client = source; clientChanged = true; }
  console.log(`[patch-build-demolition-mode] patched ${which} ${label}`);
}

function ensureIn(which, anchor, insertion, label) {
  const source = which === "panel" ? panel : which === "scene" ? scene : client;
  if (source.includes(insertion)) return;
  replaceIn(which, anchor, `${anchor}\n${insertion}`, label);
}

// ─────────────────────────────────────────────────────────────────────────────
// BuildModePanel UI
// ─────────────────────────────────────────────────────────────────────────────
replaceIn("panel",
  '  selectedHousePartCount = 0,\n  onSelectPart,',
  '  selectedHousePartCount = 0,\n  demolitionMode = false,\n  demolitionSelectionCount = 0,\n  onSelectPart,',
  "props destructure",
);
replaceIn("panel",
  '  onFocusHouse,\n  onClose,',
  '  onFocusHouse,\n  onToggleDemolitionMode,\n  onDismantleDemolitionSelection,\n  onClose,',
  "callback destructure",
);
replaceIn("panel",
  '  selectedHousePartCount?: number;\n  onSelectPart: (partId: BuildPartId) => void;',
  '  selectedHousePartCount?: number;\n  demolitionMode?: boolean;\n  demolitionSelectionCount?: number;\n  onSelectPart: (partId: BuildPartId) => void;',
  "prop types",
);
replaceIn("panel",
  '  onFocusHouse?: () => void;\n  onClose: () => void;',
  '  onFocusHouse?: () => void;\n  onToggleDemolitionMode?: (enabled: boolean) => void;\n  onDismantleDemolitionSelection?: () => void;\n  onClose: () => void;',
  "callback types",
);
replaceIn("panel",
  '      className="build-mode-panel"\n      aria-label="건설 모드"',
  '      className={demolitionMode ? "build-mode-panel build-mode-panel--demolition" : "build-mode-panel"}\n      aria-label="건설 모드"',
  "panel demolition class",
);
replaceIn("panel",
  '          <strong>건설 모드</strong>\n          <span>헤더 드래그로 패널 이동 · 부품 선택 → 맵에 드래그/클릭 설치</span>',
  '          <strong>{demolitionMode ? "철거 모드" : "건설 모드"}</strong>\n          <span>{demolitionMode ? "맵을 드래그해서 여러 부품 선택 → 일괄 분해" : "헤더 드래그로 패널 이동 · 부품 선택 → 맵에 드래그/클릭 설치"}</span>',
  "header title",
);
replaceIn("panel",
  '        <button onClick={resetPanelPosition} aria-label="건설 패널 위치 초기화">↺</button>\n        <button onClick={onClose} aria-label="건설 모드 닫기">×</button>',
  '        <button\n          className={demolitionMode ? "build-mode-panel__header-action build-mode-panel__header-action--active" : "build-mode-panel__header-action"}\n          onClick={() => onToggleDemolitionMode?.(!demolitionMode)}\n          aria-pressed={demolitionMode}\n          title="철거 모드"\n        >철거</button>\n        <button onClick={resetPanelPosition} aria-label="건설 패널 위치 초기화">↺</button>\n        <button onClick={onClose} aria-label="건설 모드 닫기">×</button>',
  "header demolition button",
);
replaceIn("panel",
  '      {selectedPlacedPart && selectedPlacedDefinition ? (',
  '      {demolitionMode ? (\n        <div className="build-mode-panel__demolition-card">\n          <div>\n            <b>철거 선택</b>\n            <span>{demolitionSelectionCount > 0 ? `${demolitionSelectionCount}개 선택됨` : "드래그하거나 부품을 클릭해서 선택"}</span>\n          </div>\n          <button className="build-mode-panel__danger" disabled={demolitionSelectionCount <= 0} onClick={onDismantleDemolitionSelection}>선택 {demolitionSelectionCount}개 분해</button>\n        </div>\n      ) : null}\n\n      {selectedPlacedPart && selectedPlacedDefinition ? (',
  "demolition card",
);

// ─────────────────────────────────────────────────────────────────────────────
// GameScene demolition state and scene methods. Applied after build part patches.
// ─────────────────────────────────────────────────────────────────────────────
replaceIn("scene",
  '  private editingBuildPartPointerId: number | null = null;',
  '  private editingBuildPartPointerId: number | null = null;\n  private demolitionMode = false;\n  private demolitionPointerId: number | null = null;\n  private demolitionDragStart: Vector2 | null = null;\n  private demolitionDragCurrent: Vector2 | null = null;\n  private demolitionSelectedPartIds = new Set<string>();',
  "demolition fields",
);
replaceIn("scene",
  '    window.dispatchEvent(new CustomEvent("palpalworld:build-part-selection", {\n      detail: {\n        selectedPart,\n        selectedHouseId: this.selectedHouseId,\n        selectedHousePartCount: this.getSelectedHousePartCountForUi(),\n      },\n    }));',
  '    window.dispatchEvent(new CustomEvent("palpalworld:build-part-selection", {\n      detail: {\n        selectedPart,\n        selectedHouseId: this.selectedHouseId,\n        selectedHousePartCount: this.getSelectedHousePartCountForUi(),\n        demolitionSelectionCount: this.demolitionSelectedPartIds.size,\n      },\n    }));',
  "selection event count",
);
replaceIn("scene",
  '  clearBuildPartSelectionForUi() {\n    this.selectedPlacedBuildPartId = null;\n    this.selectedHouseId = null;\n    this.dispatchBuildPartSelection();\n  }',
  '  clearBuildPartSelectionForUi() {\n    this.selectedPlacedBuildPartId = null;\n    this.selectedHouseId = null;\n    this.demolitionSelectedPartIds.clear();\n    this.dispatchBuildPartSelection();\n  }\n  setBuildDemolitionMode(enabled: boolean) {\n    this.demolitionMode = enabled;\n    this.demolitionPointerId = null;\n    this.demolitionDragStart = null;\n    this.demolitionDragCurrent = null;\n    this.buildPartDragPointerId = null;\n    this.editingBuildPartPointerId = null;\n    if (enabled) {\n      this.selectedBuildPartId = null;\n      this.canvas.style.cursor = "crosshair";\n    } else {\n      this.demolitionSelectedPartIds.clear();\n      this.canvas.style.cursor = this.placementPreviewBuildingType ? "crosshair" : "default";\n    }\n    this.dispatchBuildPartSelection();\n  }\n  getDemolitionSelectionCountForUi() {\n    return this.demolitionSelectedPartIds.size;\n  }\n  dismantleDemolitionSelectionForUi() {\n    if (this.demolitionSelectedPartIds.size <= 0) return;\n    const selectedIds = new Set(this.demolitionSelectedPartIds);\n    this.placedBuildParts = writeStoredBuildParts(this.placedBuildParts.filter((part) => !selectedIds.has(part.id)));\n    this.demolitionSelectedPartIds.clear();\n    if (this.selectedPlacedBuildPartId && selectedIds.has(this.selectedPlacedBuildPartId)) {\n      this.selectedPlacedBuildPartId = null;\n      this.selectedHouseId = null;\n    }\n    this.dispatchBuildPartSelection();\n  }',
  "public demolition methods",
);
replaceIn("scene",
  '  private getBuildPartAt(position: Vector2) {\n    const grid = worldToBuildGrid(position);\n    let nearest: PlacedBuildPart | null = null;\n    let nearestDistance = Number.POSITIVE_INFINITY;\n    for (const part of this.getSceneBuildParts()) {\n      const partWorld = buildGridToWorld(part);\n      const partDistance = distance(position, partWorld);\n      if (Math.abs(part.gridX - grid.gridX) <= 1 && Math.abs(part.gridY - grid.gridY) <= 1 && partDistance <= 38 && partDistance < nearestDistance) {\n        nearest = part;\n        nearestDistance = partDistance;\n      }\n    }\n    return nearest;\n  }',
  '  private getBuildPartAt(position: Vector2) {\n    const grid = worldToBuildGrid(position);\n    let nearest: PlacedBuildPart | null = null;\n    let nearestDistance = Number.POSITIVE_INFINITY;\n    for (const part of this.getSceneBuildParts()) {\n      const definition = BUILD_PARTS[part.partId];\n      const partWorld = buildGridToWorld(part);\n      const halfWidth = Math.max(28, ((definition?.width ?? 1) * BUILD_GRID_SIZE) / 2 + 10);\n      const halfHeight = Math.max(28, ((definition?.height ?? 1) * BUILD_GRID_SIZE) / 2 + 10);\n      const inGridRange = Math.abs(part.gridX - grid.gridX) <= Math.max(1, definition?.width ?? 1) && Math.abs(part.gridY - grid.gridY) <= Math.max(1, definition?.height ?? 1);\n      const inBox = Math.abs(position.x - partWorld.x) <= halfWidth && Math.abs(position.y - partWorld.y) <= halfHeight;\n      const partDistance = distance(position, partWorld);\n      if (inGridRange && inBox && partDistance < nearestDistance) {\n        nearest = part;\n        nearestDistance = partDistance;\n      }\n    }\n    return nearest;\n  }\n  private getBuildPartsInWorldRect(start: Vector2, end: Vector2) {\n    const left = Math.min(start.x, end.x);\n    const right = Math.max(start.x, end.x);\n    const top = Math.min(start.y, end.y);\n    const bottom = Math.max(start.y, end.y);\n    return this.getSceneBuildParts().filter((part) => {\n      const definition = BUILD_PARTS[part.partId];\n      const world = buildGridToWorld(part);\n      const halfWidth = ((definition?.width ?? 1) * BUILD_GRID_SIZE) / 2;\n      const halfHeight = ((definition?.height ?? 1) * BUILD_GRID_SIZE) / 2;\n      return world.x + halfWidth >= left && world.x - halfWidth <= right && world.y + halfHeight >= top && world.y - halfHeight <= bottom;\n    });\n  }',
  "accurate build part hit and rect selection",
);
replaceIn("scene",
  '    if (this.selectedBuildPartId && !this.placementPreviewBuildingType) {',
  '    if (this.demolitionMode) {\n      this.demolitionPointerId = event.pointerId;\n      this.demolitionDragStart = position;\n      this.demolitionDragCurrent = position;\n      this.canvas.setPointerCapture(event.pointerId);\n      return;\n    }\n    if (this.selectedBuildPartId && !this.placementPreviewBuildingType) {',
  "pointer down demolition",
);
replaceIn("scene",
  '    if (this.buildPartDragPointerId === event.pointerId || this.editingBuildPartPointerId === event.pointerId) this.buildPartDragPosition = position;',
  '    if (this.demolitionPointerId === event.pointerId) {\n      this.demolitionDragCurrent = position;\n      return;\n    }\n    if (this.buildPartDragPointerId === event.pointerId || this.editingBuildPartPointerId === event.pointerId) this.buildPartDragPosition = position;',
  "pointer move demolition",
);
replaceIn("scene",
  '  private handlePointerUp = (event: PointerEvent) => {\n    if (this.selectedPlacedBuildPartId && this.editingBuildPartPointerId === event.pointerId) {',
  '  private handlePointerUp = (event: PointerEvent) => {\n    if (this.demolitionMode && this.demolitionPointerId === event.pointerId) {\n      const position = this.screenToWorld(event.clientX, event.clientY);\n      const start = this.demolitionDragStart ?? position;\n      const dragDistance = distance(start, position);\n      this.demolitionPointerId = null;\n      this.demolitionDragStart = null;\n      this.demolitionDragCurrent = null;\n      this.canvas.releasePointerCapture(event.pointerId);\n      if (dragDistance < 8) {\n        const part = this.getBuildPartAt(position);\n        if (part) {\n          if (this.demolitionSelectedPartIds.has(part.id)) this.demolitionSelectedPartIds.delete(part.id);\n          else this.demolitionSelectedPartIds.add(part.id);\n          this.selectedPlacedBuildPartId = part.id;\n          this.selectedHouseId = part.houseId ?? null;\n        }\n      } else {\n        for (const part of this.getBuildPartsInWorldRect(start, position)) this.demolitionSelectedPartIds.add(part.id);\n      }\n      this.dispatchBuildPartSelection();\n      return;\n    }\n    if (this.selectedPlacedBuildPartId && this.editingBuildPartPointerId === event.pointerId) {',
  "pointer up demolition",
);
replaceIn("scene",
  '    if (this.editingBuildPartPointerId === event.pointerId) {',
  '    if (this.demolitionPointerId === event.pointerId) {\n      this.demolitionPointerId = null;\n      this.demolitionDragStart = null;\n      this.demolitionDragCurrent = null;\n    }\n    if (this.editingBuildPartPointerId === event.pointerId) {',
  "pointer cancel demolition",
);
replaceIn("scene",
  '    const isBuildPartMode = Boolean(this.selectedBuildPartId) || Boolean(this.selectedPlacedBuildPartId);',
  '    const isBuildPartMode = this.demolitionMode || Boolean(this.selectedBuildPartId) || Boolean(this.selectedPlacedBuildPartId);',
  "cursor build mode demolition",
);
replaceIn("scene",
  '        ctx.strokeStyle = part.id === this.selectedPlacedBuildPartId ? "rgba(250, 204, 21, 0.95)" : "rgba(96, 165, 250, 0.5)";\n        ctx.lineWidth = part.id === this.selectedPlacedBuildPartId ? 3 : 1;',
  '        const demolitionSelected = this.demolitionSelectedPartIds.has(part.id);\n        ctx.strokeStyle = demolitionSelected ? "rgba(248, 113, 113, 0.98)" : part.id === this.selectedPlacedBuildPartId ? "rgba(250, 204, 21, 0.95)" : "rgba(96, 165, 250, 0.5)";\n        ctx.lineWidth = demolitionSelected || part.id === this.selectedPlacedBuildPartId ? 3 : 1;',
  "highlight demolition selected",
);
replaceIn("scene",
  '    this.drawPlacementPreview(ctx, camera.x, camera.y);',
  '    this.drawPlacementPreview(ctx, camera.x, camera.y);\n    this.drawDemolitionSelectionRect(ctx, camera.x, camera.y);',
  "draw demolition rect call",
);
replaceIn("scene",
  '  private drawInteractionHint(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {',
  '  private drawDemolitionSelectionRect(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {\n    if (!this.demolitionMode || !this.demolitionDragStart || !this.demolitionDragCurrent) return;\n    const left = Math.min(this.demolitionDragStart.x, this.demolitionDragCurrent.x) - cameraX;\n    const top = Math.min(this.demolitionDragStart.y, this.demolitionDragCurrent.y) - cameraY;\n    const width = Math.abs(this.demolitionDragCurrent.x - this.demolitionDragStart.x);\n    const height = Math.abs(this.demolitionDragCurrent.y - this.demolitionDragStart.y);\n    ctx.save();\n    ctx.fillStyle = "rgba(248, 113, 113, 0.12)";\n    ctx.strokeStyle = "rgba(248, 113, 113, 0.92)";\n    ctx.lineWidth = 2;\n    ctx.setLineDash([6, 4]);\n    ctx.fillRect(left, top, width, height);\n    ctx.strokeRect(left, top, width, height);\n    ctx.restore();\n  }\n\n  private drawInteractionHint(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {',
  "draw demolition rect method",
);
replaceIn("scene",
  '    if (this.placementPreviewBuildingType) return;',
  '    if (this.placementPreviewBuildingType || this.demolitionMode) return;',
  "hide interaction in demolition",
);
replaceIn("scene",
  'export function GameScene({ onReady, onInputChange, onInteract, onWorldClick, placementBuildingType, highlightedCreatureId, selectedBuildPartId, selectedBuildPartRotation = 0, selectedBuildFloorLevel = 0 }: { onReady: (scene: GameWorldScene) => void; onInputChange: (input: GameSceneInput) => void; onInteract: () => void; onWorldClick: (target: WorldClickTarget) => void; placementBuildingType?: BuildingType | null; highlightedCreatureId?: string | null; selectedBuildPartId?: BuildPartId | null; selectedBuildPartRotation?: BuildPartRotation; selectedBuildFloorLevel?: BuildFloorLevel }) {',
  'export function GameScene({ onReady, onInputChange, onInteract, onWorldClick, placementBuildingType, highlightedCreatureId, selectedBuildPartId, selectedBuildPartRotation = 0, selectedBuildFloorLevel = 0, demolitionMode = false }: { onReady: (scene: GameWorldScene) => void; onInputChange: (input: GameSceneInput) => void; onInteract: () => void; onWorldClick: (target: WorldClickTarget) => void; placementBuildingType?: BuildingType | null; highlightedCreatureId?: string | null; selectedBuildPartId?: BuildPartId | null; selectedBuildPartRotation?: BuildPartRotation; selectedBuildFloorLevel?: BuildFloorLevel; demolitionMode?: boolean }) {',
  "GameScene demolition prop",
);
replaceIn("scene",
  '  useEffect(() => { sceneRef.current?.setBuildPartPlacement(selectedBuildPartId ?? null, selectedBuildPartRotation, selectedBuildFloorLevel); }, [selectedBuildPartId, selectedBuildPartRotation, selectedBuildFloorLevel]);',
  '  useEffect(() => { sceneRef.current?.setBuildPartPlacement(demolitionMode ? null : selectedBuildPartId ?? null, selectedBuildPartRotation, selectedBuildFloorLevel); }, [demolitionMode, selectedBuildPartId, selectedBuildPartRotation, selectedBuildFloorLevel]);\n  useEffect(() => { sceneRef.current?.setBuildDemolitionMode(demolitionMode); }, [demolitionMode]);',
  "GameScene demolition effect",
);

// ─────────────────────────────────────────────────────────────────────────────
// GameClient state, event bridge and props.
// ─────────────────────────────────────────────────────────────────────────────
replaceIn("client",
  '  const [selectedHousePartCount, setSelectedHousePartCount] = useState(0);\n  const [activeMenuTab, setActiveMenuTab] = useState<MenuTab>("crafting");',
  '  const [selectedHousePartCount, setSelectedHousePartCount] = useState(0);\n  const [buildDemolitionMode, setBuildDemolitionMode] = useState(false);\n  const [demolitionSelectionCount, setDemolitionSelectionCount] = useState(0);\n  const [activeMenuTab, setActiveMenuTab] = useState<MenuTab>("crafting");',
  "client demolition state",
);
replaceIn("client",
  '      const customEvent = event as CustomEvent<{ selectedPart?: PlacedBuildPart | null; selectedHousePartCount?: number }>;\n      setSelectedPlacedBuildPart(customEvent.detail?.selectedPart ?? null);\n      setSelectedHousePartCount(customEvent.detail?.selectedHousePartCount ?? 0);',
  '      const customEvent = event as CustomEvent<{ selectedPart?: PlacedBuildPart | null; selectedHousePartCount?: number; demolitionSelectionCount?: number }>;\n      setSelectedPlacedBuildPart(customEvent.detail?.selectedPart ?? null);\n      setSelectedHousePartCount(customEvent.detail?.selectedHousePartCount ?? 0);\n      setDemolitionSelectionCount(customEvent.detail?.demolitionSelectionCount ?? 0);',
  "client selection count listener",
);
replaceIn("client",
  '          selectedBuildPartId={selectedBuildPartId}\n          selectedBuildPartRotation={selectedBuildPartRotation}\n          selectedBuildFloorLevel={selectedBuildFloorLevel}\n        />',
  '          selectedBuildPartId={selectedBuildPartId}\n          selectedBuildPartRotation={selectedBuildPartRotation}\n          selectedBuildFloorLevel={selectedBuildFloorLevel}\n          demolitionMode={buildDemolitionMode}\n        />',
  "client GameScene demolition prop multiline",
);
replaceIn("client",
  '<GameScene onReady={handleSceneReady} onInputChange={handleInputChange} onInteract={handleDemoInteract} onWorldClick={handleWorldClick} placementBuildingType={placementBuildingType} selectedBuildPartId={selectedBuildPartId} selectedBuildPartRotation={selectedBuildPartRotation} selectedBuildFloorLevel={selectedBuildFloorLevel} />',
  '<GameScene onReady={handleSceneReady} onInputChange={handleInputChange} onInteract={handleDemoInteract} onWorldClick={handleWorldClick} placementBuildingType={placementBuildingType} selectedBuildPartId={selectedBuildPartId} selectedBuildPartRotation={selectedBuildPartRotation} selectedBuildFloorLevel={selectedBuildFloorLevel} demolitionMode={buildDemolitionMode} />',
  "client GameScene demolition prop inline",
);
replaceIn("client",
  'selectedPlacedPart={selectedPlacedBuildPart} selectedHousePartCount={selectedHousePartCount} onSelectPart={(partId) => { setSelectedBuildPartId(partId); setChatLines((prev) => [...prev.slice(-5), `[build] ${partId} 선택됨`]); }}',
  'selectedPlacedPart={selectedPlacedBuildPart} selectedHousePartCount={selectedHousePartCount} demolitionMode={buildDemolitionMode} demolitionSelectionCount={demolitionSelectionCount} onSelectPart={(partId) => { setBuildDemolitionMode(false); setSelectedBuildPartId(partId); setChatLines((prev) => [...prev.slice(-5), `[build] ${partId} 선택됨`]); }}',
  "client panel demolition props prefix",
);
replaceIn("client",
  'onFocusHouse={() => sceneRef.current?.focusSelectedHouseForUi()} onClose={() => setBuildModeOpen(false)} />',
  'onFocusHouse={() => sceneRef.current?.focusSelectedHouseForUi()} onToggleDemolitionMode={(enabled) => { setBuildDemolitionMode(enabled); if (enabled) setSelectedBuildPartId(null); setChatLines((prev) => [...prev.slice(-5), enabled ? "[build] 철거 모드: 드래그로 여러 부품을 선택하세요." : "[build] 철거 모드 해제"]); }} onDismantleDemolitionSelection={() => { sceneRef.current?.dismantleDemolitionSelectionForUi(); setChatLines((prev) => [...prev.slice(-5), "[build] 선택한 부품을 분해했습니다."]); }} onClose={() => setBuildModeOpen(false)} />',
  "client panel demolition callbacks",
);

if (panelChanged) fs.writeFileSync(panelPath, panel);
if (sceneChanged) fs.writeFileSync(scenePath, scene);
if (clientChanged) fs.writeFileSync(clientPath, client);
