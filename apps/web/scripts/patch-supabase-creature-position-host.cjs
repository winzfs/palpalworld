const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'src', 'features', 'game', 'GameClientTileDemoStation.tsx');
let source = fs.readFileSync(target, 'utf8');
let changed = false;

function replaceOnce(search, replacement, label) {
  if (source.includes(replacement)) {
    console.log(`[patch-supabase-creature-position-host] already patched ${label}`);
    return;
  }
  if (!source.includes(search)) {
    console.log(`[patch-supabase-creature-position-host] skipped ${label}`);
    return;
  }
  source = source.replace(search, replacement);
  changed = true;
  console.log(`[patch-supabase-creature-position-host] patched ${label}`);
}

function appendAfter(anchor, insertion, label) {
  if (source.includes(insertion)) return;
  if (!source.includes(anchor)) {
    console.log(`[patch-supabase-creature-position-host] skipped ${label}`);
    return;
  }
  source = source.replace(anchor, `${anchor}\n${insertion}`);
  changed = true;
  console.log(`[patch-supabase-creature-position-host] patched ${label}`);
}

replaceOnce(
  'import { applyWorldCreatureDamage, fetchWorldCreatures, rowToCreature, seedMissingWorldCreatures, upsertWorldCreature, type WorldCreatureRow } from "../multiplayer/supabaseWorldCreatures";\nimport { getSupabaseClient, isSupabaseMultiplayerEnabled } from "../multiplayer/supabaseMultiplayer";\n',
  'import { applyWorldCreatureDamage, fetchWorldCreatures, rowToCreature, seedMissingWorldCreatures, upsertWorldCreature, updateWorldCreaturePositions, type WorldCreatureRow } from "../multiplayer/supabaseWorldCreatures";\nimport { broadcastCreaturePositions, createCreatureBroadcastChannel, type CreaturePositionsBroadcastPayload } from "../multiplayer/supabaseCreatureBroadcast";\nimport { getCurrentMultiplayerPlayerId, getSupabaseClient, isCurrentPlayerWorldHost, isSupabaseMultiplayerEnabled } from "../multiplayer/supabaseMultiplayer";\n',
  'broadcast imports from seed patch state',
);

replaceOnce(
  'import { applyWorldCreatureDamage, fetchWorldCreatures, rowToCreature, seedMissingWorldCreatures, updateWorldCreaturePositions, upsertWorldCreature, type WorldCreatureRow } from "../multiplayer/supabaseWorldCreatures";\nimport { getCurrentMultiplayerPlayerId, getSupabaseClient, isCurrentPlayerWorldHost, isSupabaseMultiplayerEnabled } from "../multiplayer/supabaseMultiplayer";\n',
  'import { applyWorldCreatureDamage, fetchWorldCreatures, rowToCreature, seedMissingWorldCreatures, upsertWorldCreature, updateWorldCreaturePositions, type WorldCreatureRow } from "../multiplayer/supabaseWorldCreatures";\nimport { broadcastCreaturePositions, createCreatureBroadcastChannel, type CreaturePositionsBroadcastPayload } from "../multiplayer/supabaseCreatureBroadcast";\nimport { getCurrentMultiplayerPlayerId, getSupabaseClient, isCurrentPlayerWorldHost, isSupabaseMultiplayerEnabled } from "../multiplayer/supabaseMultiplayer";\n',
  'broadcast imports existing host state',
);

replaceOnce(
  '  const supabaseClientRef = useRef(getSupabaseClient());\n',
  '  const supabaseClientRef = useRef(getSupabaseClient());\n  const creatureBroadcastChannelRef = useRef<ReturnType<typeof createCreatureBroadcastChannel> | null>(null);\n  const creaturePositionHostRef = useRef(false);\n  const lastCreaturePositionPublishAtRef = useRef(0);\n  const lastCreatureSnapshotSaveAtRef = useRef(0);\n  const lastCreatureHostCheckAtRef = useRef(0);\n',
  'broadcast refs from base',
);

replaceOnce(
  '  const creaturePositionHostRef = useRef(false);\n  const lastCreaturePositionPublishAtRef = useRef(0);\n  const lastCreatureHostCheckAtRef = useRef(0);\n',
  '  const creatureBroadcastChannelRef = useRef<ReturnType<typeof createCreatureBroadcastChannel> | null>(null);\n  const creaturePositionHostRef = useRef(false);\n  const lastCreaturePositionPublishAtRef = useRef(0);\n  const lastCreatureSnapshotSaveAtRef = useRef(0);\n  const lastCreatureHostCheckAtRef = useRef(0);\n',
  'broadcast refs from host state',
);

appendAfter(
  '  const applyDemoSnapshot = useCallback((forceUiUpdate = false) => {\n    const nextSnapshot = createDemoSnapshot(nickname, demoPositionRef.current, demoDirectionRef.current, demoTileRef.current, getCurrentResources(), getCurrentCreatures(), getCurrentBuildings());\n    sceneRef.current?.applySnapshot(nextSnapshot, demoPlayerId);\n    const player = nextSnapshot.players[0] as any;\n    if (player?.currentTile) demoTileRef.current = { ...player.currentTile };\n    if (player?.position) { demoPositionRef.current.x = player.position.x; demoPositionRef.current.y = player.position.y; }\n    const now = performance.now();\n    if (forceUiUpdate || now - lastUiSnapshotAtRef.current >= uiSnapshotIntervalMs) { lastUiSnapshotAtRef.current = now; setSnapshot(nextSnapshot); }\n  }, [getCurrentBuildings, getCurrentCreatures, getCurrentResources, nickname]);\n',
  '  const applyCreatureBroadcastPayload = useCallback((payload: CreaturePositionsBroadcastPayload) => {\n    if (payload.hostId === getCurrentMultiplayerPlayerId()) return;\n    const byId = new Map(demoCreaturesRef.current.map((creature) => [creature.id, creature]));\n    let changed = false;\n    for (const packet of payload.creatures) {\n      const creature = byId.get(packet.id);\n      if (!creature) continue;\n      creature.position.x = packet.x;\n      creature.position.y = packet.y;\n      creature.hp = packet.hp;\n      creature.maxHp = packet.maxHp;\n      changed = true;\n    }\n    if (!changed) return;\n    demoTileIndexRef.current = createDemoTileIndex(demoResourcesRef.current, demoCreaturesRef.current, demoBuildingsRef.current);\n    applyDemoSnapshot(true);\n  }, [applyDemoSnapshot]);\n',
  'broadcast payload applier',
);

appendAfter(
  '  useEffect(() => { setNickname(createClientNickname()); commitInventory(readStoredInventory(createDemoInventory())); }, [commitInventory]);\n',
  '  useEffect(() => {\n    const client = supabaseClientRef.current;\n    if (!client || !isSupabaseMultiplayerEnabled()) return;\n    const channel = createCreatureBroadcastChannel(client, demoTileRef.current, applyCreatureBroadcastPayload);\n    creatureBroadcastChannelRef.current = channel;\n    return () => { client.removeChannel(channel); if (creatureBroadcastChannelRef.current === channel) creatureBroadcastChannelRef.current = null; };\n  }, [applyCreatureBroadcastPayload]);\n',
  'broadcast channel lifecycle',
);

replaceOnce(
  '      if (creaturePositionHostRef.current) {\n        moveDemoCreatures(getCurrentCreatures(), deltaSeconds, now, demoPositionRef.current);\n        if (client && isSupabaseMultiplayerEnabled() && now - lastCreaturePositionPublishAtRef.current >= 350) {\n          lastCreaturePositionPublishAtRef.current = now;\n          void updateWorldCreaturePositions(client, getCurrentCreatures());\n        }\n      }\n      applyDemoSnapshot(false);',
  '      if (creaturePositionHostRef.current) {\n        moveDemoCreatures(getCurrentCreatures(), deltaSeconds, now, demoPositionRef.current);\n        const channel = creatureBroadcastChannelRef.current;\n        if (channel && now - lastCreaturePositionPublishAtRef.current >= 250) {\n          lastCreaturePositionPublishAtRef.current = now;\n          void broadcastCreaturePositions({ channel, hostId: getCurrentMultiplayerPlayerId(), tile: demoTileRef.current, creatures: getCurrentCreatures() });\n        }\n        if (client && isSupabaseMultiplayerEnabled() && now - lastCreatureSnapshotSaveAtRef.current >= 8000) {\n          lastCreatureSnapshotSaveAtRef.current = now;\n          void updateWorldCreaturePositions(client, getCurrentCreatures());\n        }\n      }\n      applyDemoSnapshot(false);',
  'broadcast creature movement publish',
);

if (changed) fs.writeFileSync(target, source);
else console.log('[patch-supabase-creature-position-host] no changes');
