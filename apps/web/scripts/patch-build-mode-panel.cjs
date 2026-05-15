const fs = require("fs");
const path = require("path");

const target = path.join(__dirname, "..", "src", "features", "game", "GameClientTileDemoStation.tsx");
let source = fs.readFileSync(target, "utf8");
let changed = false;

function replaceOnce(search, replacement, label) {
  if (!source.includes(search)) {
    console.log(`[patch-build-mode-panel] skipped ${label}`);
    return;
  }
  source = source.replace(search, replacement);
  changed = true;
  console.log(`[patch-build-mode-panel] patched ${label}`);
}

replaceOnce(
  'import type { BuildingState, BuildingType, CreaturePublicState, Direction, InventoryState, ItemStack, ResourceNodeState, Vector2, WorldSnapshot } from "@palpalworld/shared";',
  'import type { BuildingState, BuildingType, CreaturePublicState, Direction, InventoryState, ItemStack, ResourceNodeState, Vector2, WorldSnapshot } from "@palpalworld/shared";\nimport { BuildModePanel } from "../buildings/BuildModePanel";\nimport type { BuildFloorLevel, BuildPartId, BuildPartRotation } from "../buildings/buildPartCatalog";',
  "imports",
);

replaceOnce(
  '  const [inventoryOpen, setInventoryOpen] = useState(false);\n  const [activeMenuTab, setActiveMenuTab] = useState<MenuTab>("crafting");',
  '  const [inventoryOpen, setInventoryOpen] = useState(false);\n  const [buildModeOpen, setBuildModeOpen] = useState(false);\n  const [selectedBuildPartId, setSelectedBuildPartId] = useState<BuildPartId | null>(null);\n  const [selectedBuildPartRotation, setSelectedBuildPartRotation] = useState<BuildPartRotation>(0);\n  const [selectedBuildFloorLevel, setSelectedBuildFloorLevel] = useState<BuildFloorLevel>(0);\n  const [activeMenuTab, setActiveMenuTab] = useState<MenuTab>("crafting");',
  "build mode state",
);

replaceOnce(
  '  const openInventoryPanel = useCallback(() => { setInventoryOpen((value) => !value); setMenuOpen(false); setSelectedStationBuilding(null); setSelectedBuilding(null); }, []);\n  const openCraftingMenu = useCallback(() => { setActiveMenuTab("crafting"); setMenuOpen(true); setInventoryOpen(false); setSelectedStationBuilding(null); setSelectedBuilding(null); }, []);',
  '  const openInventoryPanel = useCallback(() => { setInventoryOpen((value) => !value); setBuildModeOpen(false); setMenuOpen(false); setSelectedStationBuilding(null); setSelectedBuilding(null); }, []);\n  const openCraftingMenu = useCallback(() => { setActiveMenuTab("crafting"); setMenuOpen(true); setBuildModeOpen(false); setInventoryOpen(false); setSelectedStationBuilding(null); setSelectedBuilding(null); }, []);\n  const openBuildingMenu = useCallback(() => { setBuildModeOpen((value) => !value); setMenuOpen(false); setInventoryOpen(false); setSelectedStationBuilding(null); setSelectedBuilding(null); setCaptureOrbReady(null); setChatLines((prev) => [...prev.slice(-5), "[build] 건설 모드: 부품을 선택한 뒤 맵에 배치하세요."]); }, []);',
  "open handlers",
);

replaceOnce(
  '        <FloatingQuickButton id="crafting" onOpen={openCraftingMenu} />',
  '        <FloatingQuickButton id="crafting" onOpen={openCraftingMenu} />\n        <FloatingQuickButton id="building" onOpen={openBuildingMenu} />',
  "floating building button",
);

replaceOnce(
  '        {inventoryOpen ? <section className="inventory-overlay-panel" aria-label="인벤토리"><button className="inventory-overlay-panel__close" onClick={() => setInventoryOpen(false)} aria-label="인벤토리 닫기">×</button><InventoryGridPanel inventory={inventory} quickSlots={quickSlots} selectedBuildingItemId={selectedBuildingItemId} onSelectBuildingItem={handleSelectBuildingItem} onAssignQuickSlot={handleAssignQuickSlot} /></section> : null}',
  '        {inventoryOpen ? <section className="inventory-overlay-panel" aria-label="인벤토리"><button className="inventory-overlay-panel__close" onClick={() => setInventoryOpen(false)} aria-label="인벤토리 닫기">×</button><InventoryGridPanel inventory={inventory} quickSlots={quickSlots} selectedBuildingItemId={selectedBuildingItemId} onSelectBuildingItem={handleSelectBuildingItem} onAssignQuickSlot={handleAssignQuickSlot} /></section> : null}\n        {buildModeOpen ? <BuildModePanel inventory={inventory} selectedPartId={selectedBuildPartId} selectedRotation={selectedBuildPartRotation} selectedFloorLevel={selectedBuildFloorLevel} onSelectPart={(partId) => { setSelectedBuildPartId(partId); setChatLines((prev) => [...prev.slice(-5), `[build] ${partId} 선택됨`]); }} onRotate={setSelectedBuildPartRotation} onSetFloorLevel={setSelectedBuildFloorLevel} onClose={() => setBuildModeOpen(false)} /> : null}',
  "build mode panel render",
);

if (changed) {
  fs.writeFileSync(target, source);
}
