const fs = require("fs");
const path = require("path");

const webRoot = path.join(__dirname, "..");
const clientPath = path.join(webRoot, "src", "features", "game", "GameClientTileDemoStation.tsx");
const cssPath = path.join(webRoot, "src", "app", "hud-menu.css");
const assetCatalogPath = path.join(webRoot, "src", "features", "assets", "assetCatalog.ts");

let client = fs.readFileSync(clientPath, "utf8");
let css = fs.readFileSync(cssPath, "utf8");
let assetCatalog = fs.readFileSync(assetCatalogPath, "utf8");
let clientChanged = false;
let cssChanged = false;
let assetCatalogChanged = false;

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

function applyAsset(search, replacement, label) {
  const result = patchString(assetCatalog, search, replacement, label);
  assetCatalog = result.text;
  assetCatalogChanged ||= result.changed;
}

const nightLightingCss = `/* temporary day night field lighting */
.game-hud { z-index: 20; isolation: isolate; }
.hud-day-night-toggle { pointer-events: auto; position: absolute; left: calc(104px + var(--safe-left)); top: calc(12px + var(--safe-top)); z-index: 17; min-height: 42px; padding: 8px 12px; border: 2px solid rgb(125 211 252 / 0.45); border-radius: 999px; background: rgb(8 47 73 / 0.58); color: #e0f2fe; font-size: 12px; font-weight: 950; box-shadow: 0 8px 22px rgb(0 0 0 / 0.28), inset 0 0 0 1px rgb(255 255 255 / 0.08); backdrop-filter: blur(8px); cursor: pointer; }
.hud-day-night-toggle--night { border-color: rgb(250 204 21 / 0.48); background: rgb(83 56 19 / 0.58); color: #fff7df; }
.hud-day-night-toggle:active { transform: translateY(1px) scale(0.98); }
.night-field-overlay { pointer-events: none; position: fixed; inset: 0; z-index: 8; background: radial-gradient(circle at 50% 52%, rgb(5 8 20 / 0) 0 42px, rgb(5 8 20 / 0.58) 76px, rgb(5 8 20 / 0.9) 122px, rgb(2 4 13 / 0.95) 100%), linear-gradient(rgb(4 8 22 / 0.42), rgb(2 4 13 / 0.54)); }
.palpalworld-torch-equipped .night-field-overlay { background: radial-gradient(circle at 50% 52%, rgb(5 8 20 / 0) 0 132px, rgb(5 8 20 / 0.3) 176px, rgb(5 8 20 / 0.86) 272px, rgb(2 4 13 / 0.95) 100%), linear-gradient(rgb(4 8 22 / 0.38), rgb(2 4 13 / 0.5)); }
.night-player-light { position: fixed; left: 50%; top: 52%; width: 86px; height: 86px; border-radius: 999px; transform: translate(-50%, -50%); background: radial-gradient(circle, rgb(255 217 128 / 0.035) 0%, rgb(255 170 64 / 0.012) 48%, rgb(255 170 64 / 0) 74%); opacity: 0.28; filter: none; mix-blend-mode: screen; }
.palpalworld-torch-equipped .night-player-light { width: 250px; height: 250px; background: radial-gradient(circle, rgb(255 224 145 / 0.095) 0%, rgb(255 174 68 / 0.04) 48%, rgb(255 174 68 / 0) 76%); opacity: 0.46; }
@media (max-width: 720px) { .hud-day-night-toggle { left: calc(88px + var(--safe-left)); top: calc(8px + var(--safe-top)); min-height: 34px; padding: 5px 9px; border-width: 1px; font-size: 10px; } .night-field-overlay { background: radial-gradient(circle at 50% 52%, rgb(5 8 20 / 0) 0 34px, rgb(5 8 20 / 0.6) 64px, rgb(5 8 20 / 0.9) 104px, rgb(2 4 13 / 0.96) 100%), linear-gradient(rgb(4 8 22 / 0.42), rgb(2 4 13 / 0.54)); } .palpalworld-torch-equipped .night-field-overlay { background: radial-gradient(circle at 50% 52%, rgb(5 8 20 / 0) 0 106px, rgb(5 8 20 / 0.32) 146px, rgb(5 8 20 / 0.86) 222px, rgb(2 4 13 / 0.96) 100%), linear-gradient(rgb(4 8 22 / 0.38), rgb(2 4 13 / 0.5)); } .night-player-light { width: 68px; height: 68px; } .palpalworld-torch-equipped .night-player-light { width: 206px; height: 206px; } }
/* Keep gameplay canvas and world entities below the night mask while HUD controls stay above it. */
.game-canvas-root { z-index: 0; }
.hud-minimap, .hud-quick-button, .hud-menu-button, .hud-menu-panel, .quick-slot-bar, .inventory-overlay-panel, .station-overlay-panel, .pet-dismount-button { z-index: 12; }
.quick-slot-bar { z-index: 28; }
.inventory-overlay-panel, .station-overlay-panel { z-index: 22; }`;

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
  `const selectedStation = selectedStationBuilding ? getCraftingStationByBuildingType(String(selectedStationBuilding.type)) : null;`,
  "drop inventory torch light flag",
);

applyClientRegex(
  /<main className=\{`game-shell \$\{selectedBuildingItemId \? "game-shell--placing" : ""\}`\}>/,
  '<main className={`game-shell ${selectedBuildingItemId ? "game-shell--placing" : ""} ${isNightMode ? "game-shell--night" : ""}`}>',
  "night shell classes",
);

applyClient(
  `      <section className="game-hud" aria-label="Game HUD">`,
  `      <section className="game-hud" aria-label="Game HUD">
        {isNightMode ? <div className="night-field-overlay" aria-hidden="true"><div className="night-player-light" /></div> : null}`,
  "night overlay inside hud",
);

applyClient(
  `        <button className="hud-menu-button" onClick={() => { setMenuOpen((value) => !value); setInventoryOpen(false); setSelectedStationBuilding(null); setSelectedBuilding(null); }} aria-expanded={menuOpen}>☰ 메뉴</button>`,
  `        <button className="hud-menu-button" onClick={() => { setMenuOpen((value) => !value); setInventoryOpen(false); setSelectedStationBuilding(null); setSelectedBuilding(null); }} aria-expanded={menuOpen}>☰ 메뉴</button>
        <button className={isNightMode ? "hud-day-night-toggle hud-day-night-toggle--night" : "hud-day-night-toggle"} onClick={() => setIsNightMode((value) => !value)} aria-pressed={isNightMode}>{isNightMode ? "☀ 낮 전환" : "🌙 밤 전환"}</button>`,
  "night toggle button",
);

applyAsset(
  `healing_salve: ["#10b981", "HEAL"], ingot:`,
  `healing_salve: ["#10b981", "HEAL"], torch: ["#f97316", "FIRE"], ingot:`,
  "torch icon palette",
);

appendCss("/* temporary day night field lighting */", nightLightingCss, "night lighting css");
applyCssRegex(/\/\* temporary day night field lighting \*\/[\s\S]*$/, nightLightingCss, "refresh night lighting css");

if (clientChanged) fs.writeFileSync(clientPath, client);
if (cssChanged) fs.writeFileSync(cssPath, css);
if (assetCatalogChanged) fs.writeFileSync(assetCatalogPath, assetCatalog);
