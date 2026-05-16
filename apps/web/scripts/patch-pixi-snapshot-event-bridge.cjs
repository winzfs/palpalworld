const fs = require('fs');
const path = require('path');

const gameClientPath = path.join(__dirname, '..', 'src', 'features', 'game', 'GameClientTileDemoStation.tsx');
const pixiPath = path.join(__dirname, '..', 'src', 'features', 'game', 'pixi', 'PixiGameCanvas.tsx');
let client = fs.readFileSync(gameClientPath, 'utf8');
let pixi = fs.readFileSync(pixiPath, 'utf8');
let changedClient = false;
let changedPixi = false;

function replaceClient(search, replacement, label) {
  if (client.includes(replacement)) return;
  if (!client.includes(search)) {
    console.log(`[patch-pixi-snapshot-event-bridge] skipped client ${label}`);
    return;
  }
  client = client.replace(search, replacement);
  changedClient = true;
  console.log(`[patch-pixi-snapshot-event-bridge] patched client ${label}`);
}

function replacePixi(search, replacement, label) {
  if (pixi.includes(replacement)) return;
  if (!pixi.includes(search)) {
    console.log(`[patch-pixi-snapshot-event-bridge] skipped pixi ${label}`);
    return;
  }
  pixi = pixi.replace(search, replacement);
  changedPixi = true;
  console.log(`[patch-pixi-snapshot-event-bridge] patched pixi ${label}`);
}

replaceClient(
  '    sceneRef.current?.applySnapshot(nextSnapshot, demoPlayerId);',
  '    sceneRef.current?.applySnapshot(nextSnapshot, demoPlayerId);\n    window.dispatchEvent(new CustomEvent("palpalworld:pixi-snapshot", { detail: nextSnapshot }));',
  'snapshot dispatch event',
);

replacePixi(
  'type RemotePlayersEvent = CustomEvent<{ players?: PlayerPublicState[] }>;',
  'type RemotePlayersEvent = CustomEvent<{ players?: PlayerPublicState[] }>;\ntype PixiSnapshotEvent = CustomEvent<WorldSnapshot>;',
  'snapshot event type',
);

replacePixi(
  '  useEffect(() => { snapshotRef.current = snapshot; }, [snapshot]);\n  useEffect(() => { localPlayerIdRef.current = localPlayerId; }, [localPlayerId]);',
  '  useEffect(() => { snapshotRef.current = snapshot; }, [snapshot]);\n  useEffect(() => { localPlayerIdRef.current = localPlayerId; }, [localPlayerId]);\n\n  useEffect(() => {\n    const handlePixiSnapshot = (event: Event) => {\n      const customEvent = event as PixiSnapshotEvent;\n      if (customEvent.detail) snapshotRef.current = customEvent.detail;\n    };\n    window.addEventListener("palpalworld:pixi-snapshot", handlePixiSnapshot);\n    return () => window.removeEventListener("palpalworld:pixi-snapshot", handlePixiSnapshot);\n  }, []);',
  'snapshot event listener',
);

if (changedClient) fs.writeFileSync(gameClientPath, client);
if (changedPixi) fs.writeFileSync(pixiPath, pixi);
if (!changedClient && !changedPixi) console.log('[patch-pixi-snapshot-event-bridge] no changes');
