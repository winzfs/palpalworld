const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'features', 'game', 'GameClientTileDemoStation.tsx');
let source = fs.readFileSync(filePath, 'utf8');
let changed = false;

function replaceOnce(search, replacement, label) {
  if (!source.includes(search)) {
    console.log(`[patch-pixi-snapshot-immediate] skipped ${label}`);
    return;
  }
  source = source.replace(search, replacement);
  changed = true;
  console.log(`[patch-pixi-snapshot-immediate] patched ${label}`);
}

// Pixi renders world objects from the React snapshot prop. If the snapshot stays null
// or only updates every UI interval, Pixi can show terrain only. Keep the snapshot
// current while Pixi is the active renderer.
if (!source.includes('const pixiSnapshotSyncEveryFrame = true;')) {
  replaceOnce(
    'const uiSnapshotIntervalMs = 500;',
    'const uiSnapshotIntervalMs = 500;\nconst pixiSnapshotSyncEveryFrame = true;',
    'pixi snapshot sync flag',
  );
}

replaceOnce(
  '    if (forceUiUpdate || now - lastUiSnapshotAtRef.current >= uiSnapshotIntervalMs) { lastUiSnapshotAtRef.current = now; setSnapshot(nextSnapshot); }',
  '    if (pixiSnapshotSyncEveryFrame || forceUiUpdate || now - lastUiSnapshotAtRef.current >= uiSnapshotIntervalMs) { lastUiSnapshotAtRef.current = now; setSnapshot(nextSnapshot); }',
  'sync snapshot every frame for Pixi',
);

if (!source.includes('applyDemoSnapshot(true);\n  }, [applyDemoSnapshot]);')) {
  replaceOnce(
    '  useEffect(() => { setNickname(createClientNickname()); commitInventory(readStoredInventory(createDemoInventory())); }, [commitInventory]);',
    '  useEffect(() => { setNickname(createClientNickname()); commitInventory(readStoredInventory(createDemoInventory())); }, [commitInventory]);\n  useEffect(() => {\n    applyDemoSnapshot(true);\n  }, [applyDemoSnapshot]);',
    'initial snapshot effect',
  );
}

if (changed) fs.writeFileSync(filePath, source);
else console.log('[patch-pixi-snapshot-immediate] no changes');
