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
    console.log(`[patch-pixi-stage-scaffold] skipped ${label}`);
    return { text: source, changed: false };
  }
  console.log(`[patch-pixi-stage-scaffold] patched ${label}`);
  return { text: source.replace(search, replacement), changed: true };
}

function patchRegex(source, regex, replacement, label) {
  if (typeof replacement === "string" && source.includes(replacement)) return { text: source, changed: false };
  regex.lastIndex = 0;
  if (!regex.test(source)) {
    console.log(`[patch-pixi-stage-scaffold] skipped ${label}`);
    return { text: source, changed: false };
  }
  regex.lastIndex = 0;
  const next = source.replace(regex, replacement);
  if (next === source) return { text: source, changed: false };
  console.log(`[patch-pixi-stage-scaffold] patched ${label}`);
  return { text: next, changed: true };
}

function appendCss(marker, block) {
  if (css.includes(marker)) return;
  css = `${css.trimEnd()}\n\n${block}\n`;
  cssChanged = true;
  console.log(`[patch-pixi-stage-scaffold] appended css ${marker}`);
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

applyClient(
  `import { GameScene, type GameSceneInput, type GameWorldScene, type WorldClickTarget } from "./GameScene";`,
  `import { GameScene, type GameSceneInput, type GameWorldScene, type WorldClickTarget } from "./GameScene";
import { PixiGameCanvas } from "./pixi/PixiGameCanvas";`,
  "PixiGameCanvas import",
);

applyClient(
  `const mountedPetStorageKey = "palpalworld.demo.mountedPetItemId";`,
  `const mountedPetStorageKey = "palpalworld.demo.mountedPetItemId";
const pixiStageFlagStorageKey = "palpalworld.dev.pixiStage";`,
  "Pixi stage flag key",
);

applyClient(
  `  const [minimapSize, setMinimapSize] = useState<MiniMapSize>("medium");`,
  `  const [minimapSize, setMinimapSize] = useState<MiniMapSize>("medium");
  const [pixiStageEnabled, setPixiStageEnabled] = useState(() => typeof window !== "undefined" && window.localStorage.getItem(pixiStageFlagStorageKey) === "true");`,
  "Pixi stage flag state",
);

applyClient(
  `  const handleSceneReady = useCallback((scene: GameWorldScene) => { sceneRef.current = scene; }, []);`,
  `  const handleTogglePixiStage = useCallback(() => {
    if (typeof window === "undefined") return;
    const nextEnabled = !pixiStageEnabled;
    if (nextEnabled) window.localStorage.setItem(pixiStageFlagStorageKey, "true");
    else window.localStorage.removeItem(pixiStageFlagStorageKey);
    setPixiStageEnabled(nextEnabled);
    window.setTimeout(() => window.location.reload(), 80);
  }, [pixiStageEnabled]);
  const handleSceneReady = useCallback((scene: GameWorldScene) => { sceneRef.current = scene; }, []);`,
  "Pixi stage toggle handler",
);

if (!client.includes("game-shell--pixi-stage")) {
  applyClientRegex(
    /<main className=\{`game-shell([^`]*)`\}>/,
    '<main className={`game-shell$1 ${pixiStageEnabled ? "game-shell--pixi-stage" : ""}`}>',
    "Pixi stage shell class",
  );
}

if (!client.includes("<PixiGameCanvas enabled={pixiStageEnabled}")) {
  applyClient(
    `      <GameScene onReady={handleSceneReady} onInputChange={handleInputChange} onInteract={handleDemoInteract} onWorldClick={handleWorldClick} placementBuildingType={placementBuildingType} />`,
    `      <GameScene onReady={handleSceneReady} onInputChange={handleInputChange} onInteract={handleDemoInteract} onWorldClick={handleWorldClick} placementBuildingType={placementBuildingType} />
      <PixiGameCanvas enabled={pixiStageEnabled} snapshot={snapshot} localPlayerId={demoPlayerId} />`,
    "Pixi canvas scaffold render literal",
  );
}

if (!client.includes("<PixiGameCanvas enabled={pixiStageEnabled}")) {
  applyClientRegex(
    /(\s+<GameScene\b[\s\S]*?\/>)/,
    `$1
      <PixiGameCanvas enabled={pixiStageEnabled} snapshot={snapshot} localPlayerId={demoPlayerId} />`,
    "Pixi canvas scaffold render regex",
  );
}

applyClient(
  `        <button className="hud-menu-button" onClick={() => { setMenuOpen((value) => !value); setInventoryOpen(false); setSelectedStationBuilding(null); setSelectedBuilding(null); }} aria-expanded={menuOpen}>☰ 메뉴</button>`,
  `        <button className="hud-menu-button" onClick={() => { setMenuOpen((value) => !value); setInventoryOpen(false); setSelectedStationBuilding(null); setSelectedBuilding(null); }} aria-expanded={menuOpen}>☰ 메뉴</button>
        <button className={pixiStageEnabled ? "hud-pixi-toggle hud-pixi-toggle--on" : "hud-pixi-toggle"} onClick={handleTogglePixiStage} aria-pressed={pixiStageEnabled}>{pixiStageEnabled ? "Pixi ON" : "Pixi OFF"}</button>`,
  "Pixi toggle button",
);

appendCss("pixi stage scaffold", `/* pixi stage scaffold */
.pixi-game-canvas {
  pointer-events: none;
  position: absolute;
  inset: 0;
  z-index: 7;
  display: none;
  overflow: hidden;
}

.pixi-game-canvas--enabled {
  display: block;
}

.pixi-game-canvas canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.game-shell--pixi-stage .multiplayer-player {
  display: none !important;
}

.game-shell--pixi-stage .multiplayer-status::after {
  content: " · Pixi 플레이어 렌더";
  color: #bae6fd;
  font-weight: 800;
}

.hud-pixi-toggle {
  pointer-events: auto;
  position: absolute;
  left: calc(188px + var(--safe-left));
  top: calc(12px + var(--safe-top));
  z-index: 18;
  min-height: 42px;
  padding: 8px 12px;
  border: 2px solid rgb(167 139 250 / 0.42);
  border-radius: 999px;
  background: rgb(46 16 101 / 0.58);
  color: #ede9fe;
  font-size: 12px;
  font-weight: 950;
  box-shadow: 0 8px 22px rgb(0 0 0 / 0.28), inset 0 0 0 1px rgb(255 255 255 / 0.08);
  backdrop-filter: blur(8px);
  cursor: pointer;
}

.hud-pixi-toggle--on {
  border-color: rgb(34 211 238 / 0.56);
  background: rgb(8 47 73 / 0.68);
  color: #cffafe;
}

.hud-pixi-toggle:active {
  transform: translateY(1px) scale(0.98);
}

@media (max-width: 720px) {
  .hud-pixi-toggle {
    left: calc(176px + var(--safe-left));
    top: calc(8px + var(--safe-top));
    min-height: 34px;
    padding: 5px 9px;
    border-width: 1px;
    font-size: 10px;
  }
}`);

if (clientChanged) fs.writeFileSync(clientPath, client);
if (cssChanged) fs.writeFileSync(cssPath, css);
