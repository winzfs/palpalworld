const fs = require('fs');
const path = require('path');

const webRoot = path.join(__dirname, '..');
const demoPath = path.join(webRoot, 'src', 'features', 'game', 'GameClientTileDemoStation.tsx');
const onlinePath = path.join(webRoot, 'src', 'features', 'game', 'GameClientOnlineStation.tsx');
const cssPath = path.join(webRoot, 'src', 'app', 'hud-menu.css');

function patchFile(filePath, patcher, label) {
  let source = fs.readFileSync(filePath, 'utf8');
  const next = patcher(source);
  if (next !== source) {
    fs.writeFileSync(filePath, next);
    console.log(`[patch-pixi-lock-final] patched ${label}`);
  } else {
    console.log(`[patch-pixi-lock-final] no changes ${label}`);
  }
}

patchFile(demoPath, (source) => {
  let next = source;

  next = next.replace(
    /const \[pixiStageEnabled, setPixiStageEnabled\] = useState\([^;]+\);/,
    'const pixiStageEnabled = true;'
  );

  next = next.replace(
    /\s*const handleTogglePixiStage = useCallback\(\(\) => \{[\s\S]*?\n\s*\}, \[pixiStageEnabled\]\);/,
    '\n  const handleTogglePixiStage = useCallback(() => {}, []);'
  );

  next = next.replace(
    /<button className=\{pixiStageEnabled \? "hud-pixi-toggle hud-pixi-toggle--on" : "hud-pixi-toggle"\} onClick=\{handleTogglePixiStage\} aria-pressed=\{pixiStageEnabled\}>\{pixiStageEnabled \? "Pixi ON" : "Pixi OFF"\}<\/button>/,
    ''
  );

  next = next.replace(
    /\s*useEffect\(\(\) => \{\n\s*if \(typeof window === "undefined"\) return;\n\s*window\.localStorage\.setItem\(pixiStageFlagStorageKey, "true"\);\n\s*window\.dispatchEvent\(new Event\("palpalworld:pixi-stage-forced-init"\)\);\n\s*\}, \[\]\);/,
    ''
  );

  return next;
}, 'tile demo pixi lock final');

patchFile(onlinePath, (source) => {
  let next = source;

  next = next.replace(
    /function readPixiStageEnabled\(\) \{[\s\S]*?\n\}/,
    'function readPixiStageEnabled() {\n  return true;\n}'
  );

  next = next.replace(
    /const \[pixiStageEnabled\] = useState\(readPixiStageEnabled\);/,
    'const pixiStageEnabled = true;'
  );

  return next;
}, 'online pixi lock final');

patchFile(cssPath, (css) => {
  let next = css;
  if (!next.includes('/* pixi canvas visual fallback guard */')) {
    next = `${next.trimEnd()}\n\n/* pixi canvas visual fallback guard */\n.game-shell--pixi-stage .game-canvas-root > canvas {\n  opacity: 0 !important;\n}\n.game-shell--pixi-stage .pixi-game-canvas {\n  opacity: 1 !important;\n  visibility: visible !important;\n}\n`;
  }
  return next;
}, 'pixi canvas visual guard css');