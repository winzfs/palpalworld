const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'src', 'features', 'multiplayer', 'MultiplayerOverlay.tsx');
let s = fs.readFileSync(target, 'utf8');
const before = s;
const tag = '[patch-overlay-creature-persist]';
const log = (m) => console.log(`${tag} ${m}`);

function mergeNamedImport(modulePath, requiredNames) {
  const escaped = modulePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const importRegex = new RegExp(`^import \\{([^}]+)\\} from "${escaped}";\\n?`, 'gm');
  const names = new Set(requiredNames);
  let found = false;
  s = s.replace(importRegex, (_full, rawNames) => {
    found = true;
    rawNames.split(',').map((name) => name.trim()).filter(Boolean).forEach((name) => names.add(name));
    return '';
  });
  const sortedNames = Array.from(names).sort((a, b) => a.localeCompare(b));
  const importLine = `import { ${sortedNames.join(', ')} } from "${modulePath}";\n`;
  s = importLine + s;
  log(found ? `merged ${modulePath}` : `added ${modulePath}`);
}

mergeNamedImport('./supabaseMultiplayer', [
  'claimWorldHost',
  'fetchOnlinePlayers',
  'getOrCreateMultiplayerPlayerId',
  'getSupabaseClient',
  'isSupabaseMultiplayerEnabled',
  'subscribeOnlinePlayers',
  'upsertLocalPresence',
]);

mergeNamedImport('./supabaseWorldCreatures', [
  'dispatchRemoteCreatureState',
  'fetchWorldCreatures',
  'subscribeWorldCreatures',
  'updateWorldCreaturePositions',
]);

const refAnchor = '  const latestResourcesRef = useRef<ResourceNodeState[]>([]);\n';
if (s.includes(refAnchor) && !s.includes('latestCreaturesRef')) {
  s = s.replace(refAnchor, refAnchor + '  const latestCreaturesRef = useRef<WorldSnapshot["creatures"]>([]);\n  const lastCreaturePublishAtRef = useRef(0);\n');
  log('added creature snapshot refs');
}

const resourceEffect = '  useEffect(() => { if (!client || !enabled) return; const publishResources = async () => { const now = performance.now(); if (now - lastResourcePublishAtRef.current < 1000) return; lastResourcePublishAtRef.current = now; const resources = latestResourcesRef.current; if (resources.length === 0) return; await upsertWorldResources(client, resources); }; const interval = window.setInterval(publishResources, 1000); return () => window.clearInterval(interval); }, [client, enabled]);\n';
const creatureEffect = '  useEffect(() => { if (!client || !enabled) return; const publishCreatures = async () => { const now = performance.now(); if (now - lastCreaturePublishAtRef.current < 800) return; const localPlayer = latestLocalPlayerRef.current; const tile = latestTileRef.current; const creatures = latestCreaturesRef.current; if (!localPlayer || !tile || creatures.length === 0) return; lastCreaturePublishAtRef.current = now; const host = await claimWorldHost(client, playerId, tile); if (!host.isHost) return; await updateWorldCreaturePositions(client, creatures); }; const interval = window.setInterval(publishCreatures, 800); return () => window.clearInterval(interval); }, [client, enabled, playerId]);\n';
if (s.includes(resourceEffect) && !s.includes('const publishCreatures = async () =>')) {
  s = s.replace(resourceEffect, resourceEffect + creatureEffect);
  log('added creature publish effect');
}

const snapshotResources = '      latestResourcesRef.current = snapshot.resources;\n';
if (s.includes(snapshotResources) && !s.includes('latestCreaturesRef.current = snapshot.creatures;')) {
  s = s.replace(snapshotResources, snapshotResources + '      latestCreaturesRef.current = snapshot.creatures;\n');
  log('tracked snapshot creatures');
}

if (s !== before) fs.writeFileSync(target, s);
else log('no changes');
