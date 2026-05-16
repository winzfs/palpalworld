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
  const [pixiStageEnabled] = useState(() => typeof window !== "undefined" && window.localStorage.getItem(pixiStageFlagStorageKey) === "true");`,
  "Pixi stage flag state",
);

applyClient(
  `      <GameScene onReady={handleSceneReady} onInputChange={handleInputChange} onInteract={handleDemoInteract} onWorldClick={handleWorldClick} placementBuildingType={placementBuildingType} />`,
  `      <GameScene onReady={handleSceneReady} onInputChange={handleInputChange} onInteract={handleDemoInteract} onWorldClick={handleWorldClick} placementBuildingType={placementBuildingType} />
      <PixiGameCanvas enabled={pixiStageEnabled} snapshot={snapshot} localPlayerId={demoPlayerId} />`,
  "Pixi canvas scaffold render",
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
}`);

if (clientChanged) fs.writeFileSync(clientPath, client);
if (cssChanged) fs.writeFileSync(cssPath, css);
