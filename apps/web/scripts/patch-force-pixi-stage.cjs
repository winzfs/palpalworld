const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..", "src", "features", "game");
const demoPath = path.join(root, "GameClientTileDemoStation.tsx");
const onlinePath = path.join(root, "GameClientOnlineStation.tsx");

function patchFile(filePath, patcher, label) {
  let source = fs.readFileSync(filePath, "utf8");
  const next = patcher(source);
  if (next !== source) {
    fs.writeFileSync(filePath, next);
    console.log(`[patch-force-pixi-stage] patched ${label}`);
  } else {
    console.log(`[patch-force-pixi-stage] already-patched ${label}`);
  }
}

patchFile(demoPath, (source) => {
  let next = source;

  next = next.replace(
    '  const [pixiStageEnabled, setPixiStageEnabled] = useState(() => typeof window !== "undefined" && window.localStorage.getItem(pixiStageFlagStorageKey) === "true");',
    '  const pixiStageEnabled = true;'
  );

  next = next.replace(
    /  const handleTogglePixiStage = useCallback\(\(\) => \{[\s\S]*?\n  \}, \[pixiStageEnabled\]\);/,
    '  const handleTogglePixiStage = useCallback(() => {\n    if (typeof window !== "undefined") window.localStorage.setItem(pixiStageFlagStorageKey, "true");\n  }, []);'
  );

  next = next.replace(
    '        <button className={pixiStageEnabled ? "hud-pixi-toggle hud-pixi-toggle--on" : "hud-pixi-toggle"} onClick={handleTogglePixiStage} aria-pressed={pixiStageEnabled}>{pixiStageEnabled ? "Pixi ON" : "Pixi OFF"}</button>',
    '        <button className="hud-pixi-toggle hud-pixi-toggle--on" onClick={handleTogglePixiStage} aria-pressed="true" title="Pixi 렌더러 고정">Pixi ON</button>'
  );

  return next;
}, "tile demo pixi lock");

patchFile(onlinePath, (source) => {
  let next = source;

  next = next.replace(
    'function readPixiStageEnabled() {\n  if (typeof window === "undefined") return false;\n  return window.localStorage.getItem(pixiStageFlagStorageKey) === "true";\n}',
    'function readPixiStageEnabled() {\n  if (typeof window !== "undefined") window.localStorage.setItem(pixiStageFlagStorageKey, "true");\n  return true;\n}'
  );

  return next;
}, "online pixi lock");
