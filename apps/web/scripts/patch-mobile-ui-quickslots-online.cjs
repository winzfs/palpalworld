const fs = require("fs");
const path = require("path");

const clientPath = path.join(__dirname, "..", "src", "features", "game", "GameClientTileDemoStation.tsx");
const cssPath = path.join(__dirname, "..", "src", "app", "hud-menu.css");

let client = fs.readFileSync(clientPath, "utf8");
let css = fs.readFileSync(cssPath, "utf8");
let clientChanged = false;
let cssChanged = false;

function patchString(source, search, replacement, label) {
  if (source.includes(replacement)) return { text: source, changed: false };
  if (!source.includes(search)) {
    console.log(`[patch-mobile-ui-quickslots-online] skipped ${label}`);
    return { text: source, changed: false };
  }
  console.log(`[patch-mobile-ui-quickslots-online] patched ${label}`);
  return { text: source.replace(search, replacement), changed: true };
}

function patchRegex(source, regex, replacement, label) {
  regex.lastIndex = 0;
  if (!regex.test(source)) {
    console.log(`[patch-mobile-ui-quickslots-online] skipped ${label}`);
    return { text: source, changed: false };
  }
  regex.lastIndex = 0;
  const next = source.replace(regex, replacement);
  if (next === source) return { text: source, changed: false };
  console.log(`[patch-mobile-ui-quickslots-online] patched ${label}`);
  return { text: next, changed: true };
}

function appendCss(marker, block, label) {
  if (css.includes(marker)) return;
  css = `${css.trimEnd()}\n\n${block}\n`;
  cssChanged = true;
  console.log(`[patch-mobile-ui-quickslots-online] appended ${label}`);
}

function applyClient(search, replacement, label) {
  const result = patchString(client, search, replacement, label);
  client = result.text;
  clientChanged ||= result.changed;
}

function applyClientRegex(regex, replacement, label) {
  const result = patchRegex(client, regex, replacement, label);
  client = result.text;
  clientChanged ||= result.changed;
}

function applyCssRegex(regex, replacement, label) {
  const result = patchRegex(css, regex, replacement, label);
  css = result.text;
  cssChanged ||= result.changed;
}

applyClient("const quickSlotCount = 5;", "const quickSlotCount = 8;", "quick slot count 8");

applyCssRegex(
  /\.quick-slot-bar \{[\s\S]*?\n\}/,
  `.quick-slot-bar {
  pointer-events: auto;
  position: absolute;
  right: calc(14px + var(--safe-right));
  bottom: calc(110px + var(--safe-bottom));
  z-index: 26;
  display: grid;
  grid-template-rows: repeat(4, 42px);
  grid-auto-flow: column;
  grid-auto-columns: 42px;
  gap: 6px;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}`,
  "hud quickslot 4x2",
);

applyCssRegex(
  /\.inventory-quick-assign div \{[^}]*\}/,
  `.inventory-quick-assign div { display: grid; grid-template-columns: repeat(4, minmax(30px, 1fr)); gap: 4px; }`,
  "quick assign grid",
);

applyCssRegex(
  /  \.quick-slot-bar \{[^}]*\}/,
  `  .quick-slot-bar {
    right: calc(10px + var(--safe-right));
    bottom: calc(96px + var(--safe-bottom));
    grid-template-rows: repeat(4, 36px);
    grid-auto-flow: column;
    grid-auto-columns: 36px;
    gap: 5px;
    z-index: 28;
  }`,
  "mobile hud quickslot 4x2",
);

applyClient(
  `const [minimapSize, setMinimapSize] = useState<MiniMapSize>("medium");`,
  `const [minimapSize, setMinimapSize] = useState<MiniMapSize>("medium");
  const [isNightMode, setIsNightMode] = useState(false);`,
  "night mode state",
);

applyClient(
  `const selectedStation = selectedStationBuilding ? getCraftingStationByBuildingType(String(selectedStationBuilding.type)) : null;`,
  `const selectedStation = selectedStationBuilding ? getCraftingStationByBuildingType(String(selectedStationBuilding.type)) : null;
  const hasTorchItem = useMemo(() => (inventory?.items ?? []).some((item) => item.itemId === "torch" && item.amount > 0), [inventory]);`,
  "torch light flag",
);

applyClientRegex(
  /<main className=\{`game-shell \$\{selectedBuildingItemId \? "game-shell--placing" : ""\}`\}>/,
  `<main className={\`game-shell ${selectedBuildingItemId ? "game-shell--placing" : ""} ${isNightMode ? "game-shell--night" : ""} ${hasTorchItem ? "game-shell--torch-equipped" : ""}\`}>`,
  "night shell classes",
);

applyClient(
  `      <GameScene onReady={handleSceneReady} onInputChange={handleInputChange} onInteract={handleDemoInteract} onWorldClick={handleWorldClick} placementBuildingType={placementBuildingType} />`,
  `      <GameScene onReady={handleSceneReady} onInputChange={handleInputChange} onInteract={handleDemoInteract} onWorldClick={handleWorldClick} placementBuildingType={placementBuildingType} />
      {isNightMode ? <div className="night-field-overlay" aria-hidden="true"><div className={hasTorchItem ? "night-player-light night-player-light--torch" : "night-player-light"} /></div> : null}`,
  "night overlay render",
);

applyClient(
  `        <button className="hud-menu-button" onClick={() => { setMenuOpen((value) => !value); setInventoryOpen(false); setSelectedStationBuilding(null); setSelectedBuilding(null); }} aria-expanded={menuOpen}>☰ 메뉴</button>`,
  `        <button className="hud-menu-button" onClick={() => { setMenuOpen((value) => !value); setInventoryOpen(false); setSelectedStationBuilding(null); setSelectedBuilding(null); }} aria-expanded={menuOpen}>☰ 메뉴</button>
        <button className={isNightMode ? "hud-day-night-toggle hud-day-night-toggle--night" : "hud-day-night-toggle"} onClick={() => setIsNightMode((value) => !value)} aria-pressed={isNightMode}>{isNightMode ? "☀ 낮 전환" : "🌙 밤 전환"}</button>`,
  "night toggle button",
);

appendCss("/* temporary day night field lighting */", `/* temporary day night field lighting */
.game-hud { z-index: 20; }
.hud-day-night-toggle { pointer-events: auto; position: absolute; left: calc(104px + var(--safe-left)); top: calc(12px + var(--safe-top)); z-index: 17; min-height: 42px; padding: 8px 12px; border: 2px solid rgb(125 211 252 / 0.45); border-radius: 999px; background: rgb(8 47 73 / 0.58); color: #e0f2fe; font-size: 12px; font-weight: 950; box-shadow: 0 8px 22px rgb(0 0 0 / 0.28), inset 0 0 0 1px rgb(255 255 255 / 0.08); backdrop-filter: blur(8px); cursor: pointer; }
.hud-day-night-toggle--night { border-color: rgb(250 204 21 / 0.48); background: rgb(83 56 19 / 0.58); color: #fff7df; }
.hud-day-night-toggle:active { transform: translateY(1px) scale(0.98); }
.night-field-overlay { pointer-events: none; position: absolute; inset: 0; z-index: 5; background: radial-gradient(circle at 50% 52%, rgb(5 8 20 / 0.02) 0 72px, rgb(5 8 20 / 0.36) 136px, rgb(5 8 20 / 0.7) 100%), linear-gradient(rgb(4 8 22 / 0.48), rgb(2 4 13 / 0.58)); }
.game-shell--torch-equipped .night-field-overlay { background: radial-gradient(circle at 50% 52%, rgb(5 8 20 / 0) 0 138px, rgb(5 8 20 / 0.28) 220px, rgb(5 8 20 / 0.68) 100%), linear-gradient(rgb(4 8 22 / 0.42), rgb(2 4 13 / 0.52)); }
.night-player-light { position: absolute; left: 50%; top: 52%; width: 190px; height: 190px; border-radius: 999px; transform: translate(-50%, -50%); background: radial-gradient(circle, rgb(255 217 128 / 0.24) 0%, rgb(255 170 64 / 0.1) 42%, rgb(255 170 64 / 0) 70%); filter: blur(8px); opacity: 0.72; }
.night-player-light--torch { width: 340px; height: 340px; background: radial-gradient(circle, rgb(255 224 145 / 0.34) 0%, rgb(255 174 68 / 0.16) 42%, rgb(255 174 68 / 0) 72%); opacity: 0.92; }
@media (max-width: 720px) { .hud-day-night-toggle { left: calc(88px + var(--safe-left)); top: calc(8px + var(--safe-top)); min-height: 34px; padding: 5px 9px; border-width: 1px; font-size: 10px; } .night-field-overlay { background: radial-gradient(circle at 50% 52%, rgb(5 8 20 / 0.02) 0 58px, rgb(5 8 20 / 0.36) 112px, rgb(5 8 20 / 0.72) 100%), linear-gradient(rgb(4 8 22 / 0.48), rgb(2 4 13 / 0.58)); } .game-shell--torch-equipped .night-field-overlay { background: radial-gradient(circle at 50% 52%, rgb(5 8 20 / 0) 0 112px, rgb(5 8 20 / 0.28) 180px, rgb(5 8 20 / 0.68) 100%), linear-gradient(rgb(4 8 22 / 0.42), rgb(2 4 13 / 0.52)); } .night-player-light { width: 156px; height: 156px; } .night-player-light--torch { width: 280px; height: 280px; } }
`, "night lighting css");

if (clientChanged) fs.writeFileSync(clientPath, client);
if (cssChanged) fs.writeFileSync(cssPath, css);
