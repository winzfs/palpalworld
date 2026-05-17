const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'src', 'features', 'game', 'GameClientTileDemoStation.tsx');
let source = fs.readFileSync(target, 'utf8');
let changed = false;

function replaceAll(search, replacement, label) {
  if (!source.includes(search)) return;
  source = source.split(search).join(replacement);
  changed = true;
  console.log(`[patch-remove-pixi-toggle-and-debug-hud] removed ${label}`);
}

function replaceRegex(regex, replacement, label) {
  if (!regex.test(source)) return;
  source = source.replace(regex, replacement);
  changed = true;
  console.log(`[patch-remove-pixi-toggle-and-debug-hud] patched ${label}`);
}

replaceRegex(/const pixiStageFlagStorageKey = "palpalworld\.dev\.pixiStage";\n/g, '', 'pixi localStorage flag constant');
replaceRegex(/\n  const \[pixiStageEnabled, setPixiStageEnabled\] = useState\([^\n]+\);/g, '', 'pixi toggle state');
replaceRegex(/\n  const \[creatureSyncStatus, setCreatureSyncStatus\] = useState\([^\n]+\);/g, '', 'creature sync status state');
replaceRegex(/\n  const handleTogglePixiStage = useCallback\(\(\) => \{[\s\S]*?\n  \}, \[pixiStageEnabled\]\);/g, '', 'pixi toggle handler');
replaceRegex(/\n  useEffect\(\(\) => \{\n    const handleCreatureSyncStatus = \(event: Event\) => \{[\s\S]*?\n  \}, \[\]\);/g, '', 'creature sync status listener');

replaceAll(' ${pixiStageEnabled ? "game-shell--pixi-stage" : ""}', ' game-shell--pixi-stage', 'conditional pixi shell class');
replaceAll('<PixiGameCanvas enabled={pixiStageEnabled} snapshot={snapshot} localPlayerId={demoPlayerId} />', '<PixiGameCanvas enabled={true} snapshot={snapshot} localPlayerId={demoPlayerId} />', 'conditional Pixi canvas enabled');
replaceRegex(/\n\s*<button className=\{pixiStageEnabled \? "hud-pixi-toggle hud-pixi-toggle--on" : "hud-pixi-toggle"\} onClick=\{handleTogglePixiStage\} aria-pressed=\{pixiStageEnabled\}>\{pixiStageEnabled \? "Pixi ON" : "Pixi OFF"\}<\/button>/g, '', 'Pixi ON/OFF button');
replaceRegex(/\n\s*<div className="creature-sync-status-badge">\{creatureSyncStatus\}<\/div>/g, '', 'creature sync status badge');

const overlayPath = path.join(__dirname, '..', 'src', 'features', 'multiplayer', 'MultiplayerOverlay.tsx');
if (fs.existsSync(overlayPath)) {
  let overlay = fs.readFileSync(overlayPath, 'utf8');
  let overlayChanged = false;
  const replacements = [
    [/const pixiStageFlagStorageKey = "palpalworld\.dev\.pixiStage";\n/g, ''],
    [/function readPixiStageEnabled\(\) \{[\s\S]*?\}\n\nfunction getMountedPetInfo/g, 'function getMountedPetInfo'],
    [/\n  const \[pixiStageEnabled, setPixiStageEnabled\] = useState\(readPixiStageEnabled\);/g, ''],
    [/\n  useEffect\(\(\) => \{ const sync = \(\) => setPixiStageEnabled\(readPixiStageEnabled\(\)\); sync\(\); const interval = window\.setInterval\(sync, 700\); return \(\) => window\.clearInterval\(interval\); \}, \[\]\);/g, ''],
    [/className=\{pixiStageEnabled \? "multiplayer-overlay multiplayer-overlay--pixi-players" : "multiplayer-overlay"\}/g, 'className="multiplayer-overlay"'],
    [/className=\{`\$\{pixiStageEnabled \? "multiplayer-overlay multiplayer-overlay--pixi-players" : "multiplayer-overlay"\} \$\{nightModeActive \? "multiplayer-overlay--night" : ""\}`\}/g, 'className={`multiplayer-overlay ${nightModeActive ? "multiplayer-overlay--night" : ""}`}'],
    [/\{!pixiStageEnabled \? visiblePlayers\.map\(\(player\) => \{/g, '{visiblePlayers.map((player) => {'],
    [/\}\) : null\}/g, '})}'],
  ];
  for (const [regex, replacement] of replacements) {
    if (regex.test(overlay)) {
      overlay = overlay.replace(regex, replacement);
      overlayChanged = true;
    }
  }
  if (overlayChanged) fs.writeFileSync(overlayPath, overlay);
}

for (const script of [
  './patch-existing-client-broadcast-base.cjs',
  './patch-existing-client-broadcast-receive.cjs',
  './patch-existing-client-broadcast-loop.cjs',
  './patch-existing-client-attack-rpc.cjs',
  './patch-db-pos-once.cjs',
  './patch-supabase-authoritative-creature-start.cjs',
  './patch-force-creature-db-hydrate.cjs',
  './patch-creature-hydrate-once-final.cjs',
]) {
  require(script);
}

// Final safety guard: Cloudflare next-on-pages can run prebuild twice through the Next build lifecycle.
// Keep only the first declaration for refs that older patches may insert repeatedly.
source = fs.readFileSync(target, 'utf8');
const refNames = [
  'cachedBuildPartsRef',
  'handleDemoAttackRef',
  'lastCreatureAiAtRef',
  'lastSceneSnapshotAtRef',
  'lastDemoAttackAtRef',
  'lastUiSnapshotAtRef',
  'supabaseClientRef',
  'creatureBroadcastChannelRef',
  'creatureBroadcastTargetsRef',
  'isCreatureHostRef',
  'lastCreatureHostClaimAtRef',
  'lastCreatureBroadcastAtRef',
  'lastCreatureSnapshotSaveAtRef',
  'dbPosOnceRef',
];
for (const name of refNames) {
  let seen = false;
  const lineRegex = new RegExp(`^\\s*const ${name} = useRef(?:<[^\\n]+?>)?\\([^\\n]*\\);\\n?`, 'gm');
  source = source.replace(lineRegex, (line) => {
    if (!seen) {
      seen = true;
      return line.endsWith('\n') ? line : `${line}\n`;
    }
    changed = true;
    console.log(`[patch-remove-pixi-toggle-and-debug-hud] removed duplicate ${name}`);
    return '';
  });
}
source = source.replace(/\n{4,}/g, '\n\n\n');

if (changed) fs.writeFileSync(target, source);
else console.log('[patch-remove-pixi-toggle-and-debug-hud] no GameClient changes');
