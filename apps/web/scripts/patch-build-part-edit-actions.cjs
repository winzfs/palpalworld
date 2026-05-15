const fs = require("fs");
const path = require("path");

const gameScenePath = path.join(__dirname, "..", "src", "features", "game", "GameScene.tsx");
const gameClientPath = path.join(__dirname, "..", "src", "features", "game", "GameClientTileDemoStation.tsx");
let scene = fs.readFileSync(gameScenePath, "utf8");
let client = fs.readFileSync(gameClientPath, "utf8");
let changedScene = false;
let changedClient = false;

function replaceScene(search, replacement, label) {
  if (!scene.includes(search)) {
    console.log(`[patch-build-part-edit-actions] skipped scene ${label}`);
    return;
  }
  scene = scene.replace(search, replacement);
  changedScene = true;
  console.log(`[patch-build-part-edit-actions] patched scene ${label}`);
}

function replaceClient(search, replacement, label) {
  if (!client.includes(search)) {
    console.log(`[patch-build-part-edit-actions] skipped client ${label}`);
    return;
  }
  client = client.replace(search, replacement);
  changedClient = true;
  console.log(`[patch-build-part-edit-actions] patched client ${label}`);
}

function ensureClientAfter(anchor, insertion, label) {
  if (client.includes(insertion)) return;
  replaceClient(anchor, `${anchor}\n${insertion}`, label);
}

replaceScene(
  '  setBuildPartPlacement(partId: BuildPartId | null, rotation: BuildPartRotation, floorLevel: BuildFloorLevel) {\n    this.selectedBuildPartId = partId;\n    this.selectedBuildPartRotation = rotation;\n    this.selectedBuildFloorLevel = floorLevel;\n    this.buildPartDragPointerId = null;\n    this.buildPartDragPosition = null;\n    this.canvas.style.cursor = partId ? "crosshair" : this.placementPreviewBuildingType ? "crosshair" : "default";\n  }',
  '  setBuildPartPlacement(partId: BuildPartId | null, rotation: BuildPartRotation, floorLevel: BuildFloorLevel) {\n    this.selectedBuildPartId = partId;\n    this.selectedBuildPartRotation = rotation;\n    this.selectedBuildFloorLevel = floorLevel;\n    this.buildPartDragPointerId = null;\n    this.buildPartDragPosition = null;\n    this.canvas.style.cursor = partId ? "crosshair" : this.placementPreviewBuildingType ? "crosshair" : "default";\n  }\n  getSelectedPlacedBuildPartForUi() {\n    return this.getSelectedPlacedBuildPart();\n  }\n  getSelectedHousePartCountForUi() {\n    return this.selectedHouseId ? getBuildPartsForHouse(this.placedBuildParts, this.selectedHouseId).length : 0;\n  }\n  rotateSelectedPlacedBuildPartForUi() {\n    const selected = this.getSelectedPlacedBuildPart();\n    if (!selected) return;\n    this.placedBuildParts = rotatePlacedBuildPart(selected.id, rotateBuildPart(selected.rotation));\n    this.dispatchBuildPartSelection();\n  }\n  deleteSelectedPlacedBuildPartForUi() {\n    if (!this.selectedPlacedBuildPartId) return;\n    this.placedBuildParts = removeBuildPart(this.selectedPlacedBuildPartId);\n    this.selectedPlacedBuildPartId = null;\n    this.selectedHouseId = null;\n    this.dispatchBuildPartSelection();\n  }\n  clearBuildPartSelectionForUi() {\n    this.selectedPlacedBuildPartId = null;\n    this.selectedHouseId = null;\n    this.dispatchBuildPartSelection();\n  }\n  focusSelectedHouseForUi() {\n    const selected = this.getSelectedPlacedBuildPart();\n    if (!selected?.houseId) return;\n    this.selectedHouseId = selected.houseId;\n    this.dispatchBuildPartSelection();\n  }',
  "public edit methods",
);

replaceScene(
  '  private handleBuildPartsChanged = (event: BuildPartsChangedEvent) => {\n    this.placedBuildParts = event.detail?.parts ?? readStoredBuildParts();\n    if (this.selectedPlacedBuildPartId && !this.placedBuildParts.some((part) => part.id === this.selectedPlacedBuildPartId)) {\n      this.selectedPlacedBuildPartId = null;\n      this.selectedHouseId = null;\n    }\n  };',
  '  private handleBuildPartsChanged = (event: BuildPartsChangedEvent) => {\n    this.placedBuildParts = event.detail?.parts ?? readStoredBuildParts();\n    if (this.selectedPlacedBuildPartId && !this.placedBuildParts.some((part) => part.id === this.selectedPlacedBuildPartId)) {\n      this.selectedPlacedBuildPartId = null;\n      this.selectedHouseId = null;\n    }\n    this.dispatchBuildPartSelection();\n  };\n  private dispatchBuildPartSelection() {\n    const selectedPart = this.getSelectedPlacedBuildPart();\n    window.dispatchEvent(new CustomEvent("palpalworld:build-part-selection", {\n      detail: {\n        selectedPart,\n        selectedHouseId: this.selectedHouseId,\n        selectedHousePartCount: this.getSelectedHousePartCountForUi(),\n      },\n    }));\n  }',
  "selection dispatch",
);

replaceScene(
  '      this.selectedPlacedBuildPartId = buildPart.id;\n      this.selectedHouseId = buildPart.houseId ?? null;\n      this.editingBuildPartPointerId = event.pointerId;',
  '      this.selectedPlacedBuildPartId = buildPart.id;\n      this.selectedHouseId = buildPart.houseId ?? null;\n      this.dispatchBuildPartSelection();\n      this.editingBuildPartPointerId = event.pointerId;',
  "dispatch on part select",
);

replaceScene(
  '    this.selectedPlacedBuildPartId = placedPart.id;\n    this.selectedHouseId = placedPart.houseId ?? null;\n    this.placedBuildParts = writeStoredBuildParts([...this.placedBuildParts, placedPart]);',
  '    this.selectedPlacedBuildPartId = placedPart.id;\n    this.selectedHouseId = placedPart.houseId ?? null;\n    this.placedBuildParts = writeStoredBuildParts([...this.placedBuildParts, placedPart]);\n    this.dispatchBuildPartSelection();',
  "dispatch on new placement",
);

replaceScene(
  '    this.placedBuildParts = moveBuildPart(selected.id, grid.gridX, grid.gridY, selected.floorLevel);\n  }',
  '    this.placedBuildParts = moveBuildPart(selected.id, grid.gridX, grid.gridY, selected.floorLevel);\n    this.dispatchBuildPartSelection();\n  }',
  "dispatch on move",
);

replaceScene(
  'if ((key === "delete" || key === "backspace") && this.selectedPlacedBuildPartId) { this.placedBuildParts = removeBuildPart(this.selectedPlacedBuildPartId); this.selectedPlacedBuildPartId = null; this.selectedHouseId = null; return; } if ((key === "r") && this.selectedPlacedBuildPartId) { const selected = this.getSelectedPlacedBuildPart(); if (selected) { const nextRotation = rotateBuildPart(selected.rotation); this.placedBuildParts = rotatePlacedBuildPart(selected.id, nextRotation); } return; } if (key === "escape") { this.selectedPlacedBuildPartId = null; this.selectedHouseId = null; }',
  'if ((key === "delete" || key === "backspace") && this.selectedPlacedBuildPartId) { this.placedBuildParts = removeBuildPart(this.selectedPlacedBuildPartId); this.selectedPlacedBuildPartId = null; this.selectedHouseId = null; this.dispatchBuildPartSelection(); return; } if ((key === "r") && this.selectedPlacedBuildPartId) { const selected = this.getSelectedPlacedBuildPart(); if (selected) { const nextRotation = rotateBuildPart(selected.rotation); this.placedBuildParts = rotatePlacedBuildPart(selected.id, nextRotation); this.dispatchBuildPartSelection(); } return; } if (key === "escape") { this.selectedPlacedBuildPartId = null; this.selectedHouseId = null; this.dispatchBuildPartSelection(); }',
  "dispatch keyboard actions",
);

ensureClientAfter(
  'import type { BuildingState, BuildingType, CreaturePublicState, Direction, InventoryState, ItemStack, ResourceNodeState, Vector2, WorldSnapshot } from "@palpalworld/shared";',
  'import type { PlacedBuildPart } from "../buildings/buildPartCatalog";',
  "PlacedBuildPart import",
);

replaceClient(
  '  const [selectedBuildFloorLevel, setSelectedBuildFloorLevel] = useState<BuildFloorLevel>(0);\n  const [activeMenuTab, setActiveMenuTab] = useState<MenuTab>("crafting");',
  '  const [selectedBuildFloorLevel, setSelectedBuildFloorLevel] = useState<BuildFloorLevel>(0);\n  const [selectedPlacedBuildPart, setSelectedPlacedBuildPart] = useState<PlacedBuildPart | null>(null);\n  const [selectedHousePartCount, setSelectedHousePartCount] = useState(0);\n  const [activeMenuTab, setActiveMenuTab] = useState<MenuTab>("crafting");',
  "client selection state",
);

replaceClient(
  '  useEffect(() => {\n    const handleInventoryChanged = (event: Event) => { const customEvent = event as CustomEvent<{ inventory?: InventoryState }>; if (customEvent.detail?.inventory) setInventory(customEvent.detail.inventory); };\n    window.addEventListener("palpalworld:inventory-changed", handleInventoryChanged);\n    return () => window.removeEventListener("palpalworld:inventory-changed", handleInventoryChanged);\n  }, []);',
  '  useEffect(() => {\n    const handleInventoryChanged = (event: Event) => { const customEvent = event as CustomEvent<{ inventory?: InventoryState }>; if (customEvent.detail?.inventory) setInventory(customEvent.detail.inventory); };\n    window.addEventListener("palpalworld:inventory-changed", handleInventoryChanged);\n    return () => window.removeEventListener("palpalworld:inventory-changed", handleInventoryChanged);\n  }, []);\n  useEffect(() => {\n    const handleBuildPartSelection = (event: Event) => {\n      const customEvent = event as CustomEvent<{ selectedPart?: PlacedBuildPart | null; selectedHousePartCount?: number }>;\n      setSelectedPlacedBuildPart(customEvent.detail?.selectedPart ?? null);\n      setSelectedHousePartCount(customEvent.detail?.selectedHousePartCount ?? 0);\n    };\n    window.addEventListener("palpalworld:build-part-selection", handleBuildPartSelection);\n    return () => window.removeEventListener("palpalworld:build-part-selection", handleBuildPartSelection);\n  }, []);',
  "client selection listener",
);

replaceClient(
  '{buildModeOpen ? <BuildModePanel inventory={inventory} selectedPartId={selectedBuildPartId} selectedRotation={selectedBuildPartRotation} selectedFloorLevel={selectedBuildFloorLevel} onSelectPart={(partId) => { setSelectedBuildPartId(partId); setChatLines((prev) => [...prev.slice(-5), `[build] ${partId} 선택됨`]); }} onRotate={setSelectedBuildPartRotation} onSetFloorLevel={setSelectedBuildFloorLevel} onClose={() => setBuildModeOpen(false)} /> : null}',
  '{buildModeOpen ? <BuildModePanel inventory={inventory} selectedPartId={selectedBuildPartId} selectedRotation={selectedBuildPartRotation} selectedFloorLevel={selectedBuildFloorLevel} selectedPlacedPart={selectedPlacedBuildPart} selectedHousePartCount={selectedHousePartCount} onSelectPart={(partId) => { setSelectedBuildPartId(partId); setChatLines((prev) => [...prev.slice(-5), `[build] ${partId} 선택됨`]); }} onRotate={setSelectedBuildPartRotation} onSetFloorLevel={setSelectedBuildFloorLevel} onRotateSelectedPlacedPart={() => sceneRef.current?.rotateSelectedPlacedBuildPartForUi()} onDeleteSelectedPlacedPart={() => sceneRef.current?.deleteSelectedPlacedBuildPartForUi()} onClearSelection={() => sceneRef.current?.clearBuildPartSelectionForUi()} onFocusHouse={() => sceneRef.current?.focusSelectedHouseForUi()} onClose={() => setBuildModeOpen(false)} /> : null}',
  "client build panel edit props",
);

if (changedScene) fs.writeFileSync(gameScenePath, scene);
if (changedClient) fs.writeFileSync(gameClientPath, client);
