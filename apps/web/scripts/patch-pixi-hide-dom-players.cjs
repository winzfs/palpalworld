const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'features', 'multiplayer', 'MultiplayerOverlay.tsx');
let source = fs.readFileSync(filePath, 'utf8');
let changed = false;

function replaceOnce(search, replacement, label) {
  if (source.includes(replacement)) return;
  if (!source.includes(search)) {
    console.log(`[patch-pixi-hide-dom-players] skipped ${label}`);
    return;
  }
  source = source.replace(search, replacement);
  changed = true;
  console.log(`[patch-pixi-hide-dom-players] patched ${label}`);
}

replaceOnce(
  'const mountedPetStorageKey = "palpalworld.demo.mountedPetItemId";',
  'const mountedPetStorageKey = "palpalworld.demo.mountedPetItemId";\nconst pixiStageFlagStorageKey = "palpalworld.dev.pixiStage";',
  'pixi flag key',
);

replaceOnce(
  'function readMountedPetItemId() {\n  if (typeof window === "undefined") return null;\n  return window.localStorage.getItem(mountedPetStorageKey);\n}',
  'function readMountedPetItemId() {\n  if (typeof window === "undefined") return null;\n  return window.localStorage.getItem(mountedPetStorageKey);\n}\n\nfunction readPixiStageEnabled() {\n  if (typeof window === "undefined") return false;\n  return window.localStorage.getItem(pixiStageFlagStorageKey) === "true";\n}',
  'pixi flag reader',
);

replaceOnce(
  '  const [status, setStatus] = useState(enabled ? "온라인 연결 중" : "오프라인 모드");',
  '  const [status, setStatus] = useState(enabled ? "온라인 연결 중" : "오프라인 모드");\n  const [pixiStageEnabled, setPixiStageEnabled] = useState(readPixiStageEnabled);',
  'pixi flag state',
);

replaceOnce(
  '  useEffect(() => {\n    if (!client || !enabled) return;\n    refreshPlayers();',
  '  useEffect(() => {\n    const syncPixiStageEnabled = () => setPixiStageEnabled(readPixiStageEnabled());\n    syncPixiStageEnabled();\n    const interval = window.setInterval(syncPixiStageEnabled, 700);\n    return () => window.clearInterval(interval);\n  }, []);\n\n  useEffect(() => {\n    if (!client || !enabled) return;\n    refreshPlayers();',
  'pixi flag sync',
);

replaceOnce(
  '    <div className="multiplayer-overlay" aria-label="멀티플레이어 오버레이">',
  '    <div className={pixiStageEnabled ? "multiplayer-overlay multiplayer-overlay--pixi-players" : "multiplayer-overlay"} aria-label="멀티플레이어 오버레이">',
  'overlay pixi class',
);

replaceOnce(
  '      {visiblePlayers.map((player) => {',
  '      {!pixiStageEnabled ? visiblePlayers.map((player) => {',
  'disable DOM player render in Pixi mode',
);

replaceOnce(
  '      })}\n      <section',
  '      }) : null}\n      <section',
  'close DOM player conditional',
);

if (changed) fs.writeFileSync(filePath, source);
else console.log('[patch-pixi-hide-dom-players] no changes');
