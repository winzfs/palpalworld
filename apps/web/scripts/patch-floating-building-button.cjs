const fs = require("fs");
const path = require("path");

const target = path.join(__dirname, "..", "src", "features", "game", "GameClientTileDemoStation.tsx");
let source = fs.readFileSync(target, "utf8");
let changed = false;

function replaceOnce(search, replacement, label) {
  if (!source.includes(search)) {
    console.log(`[patch-floating-building-button] skipped ${label}`);
    return;
  }
  source = source.replace(search, replacement);
  changed = true;
  console.log(`[patch-floating-building-button] patched ${label}`);
}

replaceOnce(
  'type QuickButtonId = "inventory" | "crafting";',
  'type QuickButtonId = "inventory" | "crafting" | "building";',
  "QuickButtonId",
);

replaceOnce(
  '  crafting: { x: 12, y: 164, icon: "🛠", label: "제작" },\n};',
  '  crafting: { x: 12, y: 164, icon: "🛠", label: "제작" },\n  building: { x: 12, y: 216, icon: "🏠", label: "건설" },\n};',
  "quickButtonDefaults.building",
);

replaceOnce(
  '  const openCraftingMenu = useCallback(() => { setActiveMenuTab("crafting"); setMenuOpen(true); setInventoryOpen(false); setSelectedStationBuilding(null); setSelectedBuilding(null); }, []);',
  '  const openCraftingMenu = useCallback(() => { setActiveMenuTab("crafting"); setMenuOpen(true); setInventoryOpen(false); setSelectedStationBuilding(null); setSelectedBuilding(null); }, []);\n  const openBuildingMenu = useCallback(() => { setActiveMenuTab("crafting"); setMenuOpen(true); setInventoryOpen(false); setSelectedStationBuilding(null); setSelectedBuilding(null); setCaptureOrbReady(null); setChatLines((prev) => [...prev.slice(-5), "[build] 건설 모드: 제작 탭에서 건물/부품을 선택하세요."]); }, []);',
  "openBuildingMenu",
);

replaceOnce(
  '        <FloatingQuickButton id="crafting" onOpen={openCraftingMenu} />',
  '        <FloatingQuickButton id="crafting" onOpen={openCraftingMenu} />\n        <FloatingQuickButton id="building" onOpen={openBuildingMenu} />',
  "building FloatingQuickButton",
);

if (changed) {
  fs.writeFileSync(target, source);
}
