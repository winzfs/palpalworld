const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'src', 'features', 'game', 'GameClientTileDemoStation.tsx');
let source = fs.readFileSync(target, 'utf8');
let changed = false;

const tag = '[patch-existing-client-broadcast-finalize]';
function mark(label) {
  changed = true;
  console.log(`${tag} ${label}`);
}
function insertAfter(anchor, text, label) {
  if (source.includes(text.trim())) return;
  if (!source.includes(anchor)) {
    console.log(`${tag} skipped ${label}`);
    return;
  }
  source = source.replace(anchor, anchor + text);
  mark(label);
}
function replaceExact(search, replacement, label) {
  if (source.includes(replacement.trim())) return;
  if (!source.includes(search)) {
    console.log(`${tag} skipped ${label}`);
    return;
  }
  source = source.replace(search, replacement);
  mark(label);
}
function removeRegex(regex, label) {
  const next = source.replace(regex, '\n');
  if (next !== source) {
    source = next;
    mark(`dedupe ${label}`);
  }
}
function ensureConst(name, value) {
  source = source.replace(new RegExp(`\\nconst ${name} = [^;]+;`, 'g'), '');
  insertAfter('const creatureMapSize = creatureMapMax - creatureMapMin;\n', `const ${name} = ${value};\n`, `ensure ${name}`);
}

insertAfter(
  'import { PixiGameCanvas } from "./pixi/PixiGameCanvas";\n',
  'import { broadcastCreaturePositions, createCreatureBroadcastChannel, requestCreatureSnapshot, type CreaturePositionsBroadcastPayload } from "../multiplayer/supabaseCreatureBroadcast";\nimport { claimWorldHost, getCurrentMultiplayerPlayerId, getSupabaseClient, isSupabaseMultiplayerEnabled } from "../multiplayer/supabaseMultiplayer";\nimport { attackWorldCreature, seedMissingWorldCreatures, updateWorldCreaturePositions, upsertWorldCreature } from "../multiplayer/supabaseWorldCreatures";\n',
  'ensure creature sync imports',
);

insertAfter(
  'type CreatureWanderTarget = { x: number; y: number; nextRetargetAt: number };\n',
  'type CreatureBroadcastTarget = { x: number; y: number; hp: number; maxHp: number; receivedAt: number };\n',
  'ensure broadcast target type',
);

ensureConst('creatureBroadcastMs', '100');
ensureConst('creatureSnapshotSaveMs', '1200');
ensureConst('creatureHostClaimMs', '2000');
ensureConst('creatureBroadcastLerpPerSecond', '18');
ensureConst('creatureBroadcastSnapDistance', '220');

insertAfter(
  'function createDemoInventory(): InventoryState {\n',
  `function isSameMapTile(a: MapTileRef, b: MapTileRef) {\n  return a.regionId === b.regionId && a.tileX === b.tileX && a.tileY === b.tileY;\n}\nfunction smoothRemoteCreatures(creatures: CreaturePublicState[], targets: Map<string, CreatureBroadcastTarget>, deltaSeconds: number, now: number) {\n  if (targets.size <= 0 || creatures.length <= 0) return;\n  const alpha = Math.max(0.16, Math.min(0.88, 1 - Math.exp(-creatureBroadcastLerpPerSecond * deltaSeconds)));\n  for (const creature of creatures) {\n    const target = targets.get(creature.id);\n    if (!target) continue;\n    if (now - target.receivedAt > 1200) { targets.delete(creature.id); continue; }\n    const dx = target.x - creature.position.x;\n    const dy = target.y - creature.position.y;\n    const distance = Math.hypot(dx, dy);\n    if (distance > creatureBroadcastSnapDistance) {\n      creature.position.x = target.x;\n      creature.position.y = target.y;\n    } else if (distance > 0.2) {\n      creature.position.x += dx * alpha;\n      creature.position.y += dy * alpha;\n    }\n    creature.hp = target.hp;\n    creature.maxHp = target.maxHp;\n  }\n}\n`,
  'ensure remote creature smoothing helpers',
);

removeRegex(/\n\s*const supabaseClientRef = useRef\(getSupabaseClient\(\)\);/g, 'supabase client ref');
removeRegex(/\n\s*const creatureBroadcastChannelRef = useRef[\s\S]*?;\n/g, 'broadcast channel ref');
removeRegex(/\n\s*const creatureBroadcastTargetsRef = useRef[\s\S]*?;\n/g, 'broadcast targets ref');
removeRegex(/\n\s*const isCreatureHostRef = useRef\(false\);/g, 'host ref');
removeRegex(/\n\s*const lastCreatureHostClaimAtRef = useRef\([^\n]+\);/g, 'host claim ref');
removeRegex(/\n\s*const lastCreatureBroadcastAtRef = useRef\([^\n]+\);/g, 'broadcast tick ref');
removeRegex(/\n\s*const lastCreatureSnapshotSaveAtRef = useRef\([^\n]+\);/g, 'snapshot save ref');

insertAfter(
  '  const lastUiSnapshotAtRef = useRef(0);\n',
  '  const supabaseClientRef = useRef(getSupabaseClient());\n  const creatureBroadcastChannelRef = useRef<ReturnType<typeof createCreatureBroadcastChannel> | null>(null);\n  const creatureBroadcastTargetsRef = useRef(new Map<string, CreatureBroadcastTarget>());\n  const isCreatureHostRef = useRef(false);\n  const lastCreatureHostClaimAtRef = useRef(-999999);\n  const lastCreatureBroadcastAtRef = useRef(0);\n  const lastCreatureSnapshotSaveAtRef = useRef(0);\n',
  'ensure creature sync refs',
);

removeRegex(/\n\s*const applyCreatureBroadcastPayload = useCallback\(\(payload: CreaturePositionsBroadcastPayload\) => \{[\s\S]*?\n\s*\}, \[[^\]]*\]\);\n/g, 'broadcast payload handler');
insertAfter(
  '  }, [getCurrentBuildings, getCurrentCreatures, getCurrentResources, nickname]);\n',
  `\n  const applyCreatureBroadcastPayload = useCallback((payload: CreaturePositionsBroadcastPayload) => {\n    if (payload.hostId === getCurrentMultiplayerPlayerId()) return;\n    const tile = demoTileRef.current;\n    if (!isSameMapTile(payload.tile, tile)) return;\n    isCreatureHostRef.current = false;\n    const now = performance.now();\n    const existingById = new Map(demoCreaturesRef.current.map((creature) => [creature.id, creature]));\n    const nextCreatures = payload.creatures.map((packet) => {\n      const existing = existingById.get(packet.id);\n      if (!existing) {\n        creatureBroadcastTargetsRef.current.set(packet.id, { x: packet.x, y: packet.y, hp: packet.hp, maxHp: packet.maxHp, receivedAt: now });\n        return ({\n          id: packet.id,\n          speciesId: packet.speciesId,\n          level: packet.level,\n          position: { x: packet.x, y: packet.y },\n          currentTile: { ...payload.tile },\n          hp: packet.hp,\n          maxHp: packet.maxHp,\n          traitIds: packet.traitIds ?? [],\n        }) as CreaturePublicState;\n      }\n      existing.speciesId = packet.speciesId;\n      existing.level = packet.level;\n      (existing as { currentTile?: MapTileRef }).currentTile = { ...payload.tile };\n      existing.hp = packet.hp;\n      existing.maxHp = packet.maxHp;\n      existing.traitIds = packet.traitIds ?? [];\n      const dx = packet.x - existing.position.x;\n      const dy = packet.y - existing.position.y;\n      if (Math.hypot(dx, dy) > 120) {\n        existing.position.x = packet.x;\n        existing.position.y = packet.y;\n      }\n      creatureBroadcastTargetsRef.current.set(packet.id, { x: packet.x, y: packet.y, hp: packet.hp, maxHp: packet.maxHp, receivedAt: now });\n      return existing;\n    });\n    demoCreaturesRef.current = nextCreatures;\n    demoTileIndexRef.current = createDemoTileIndex(demoResourcesRef.current, demoCreaturesRef.current, demoBuildingsRef.current);\n    applyDemoSnapshot(true);\n  }, [applyDemoSnapshot]);\n`,
  'ensure broadcast payload handler',
);

removeRegex(/\n\s*useEffect\(\(\) => \{[\s\S]*?createCreatureBroadcastChannel\(client, demoTileRef\.current, applyCreatureBroadcastPayload[\s\S]*?\n\s*\}, \[[^\]]*applyCreatureBroadcastPayload[^\]]*\]\);\n/g, 'broadcast lifecycle');
insertAfter(
  '  useEffect(() => { setNickname(createClientNickname()); commitInventory(readStoredInventory(createDemoInventory())); }, [commitInventory]);\n',
  `  useEffect(() => {\n    const client = supabaseClientRef.current;\n    if (!client || !isSupabaseMultiplayerEnabled()) return;\n    let cancelled = false;\n    const playerId = getCurrentMultiplayerPlayerId();\n    const channel = createCreatureBroadcastChannel(client, demoTileRef.current, applyCreatureBroadcastPayload, (request) => {\n      if (!isCreatureHostRef.current || request.requesterId === playerId) return;\n      void broadcastCreaturePositions({ channel, hostId: playerId, tile: demoTileRef.current, creatures: getCurrentCreatures() });\n    });\n    creatureBroadcastChannelRef.current = channel;\n    demoCreaturesRef.current = [];\n    creatureBroadcastTargetsRef.current.clear();\n    demoTileIndexRef.current = createDemoTileIndex(demoResourcesRef.current, demoCreaturesRef.current, demoBuildingsRef.current);\n    applyDemoSnapshot(true);\n    void claimWorldHost(client, playerId, demoTileRef.current).then((result) => {\n      if (cancelled) return;\n      isCreatureHostRef.current = result.isHost;\n      if (result.isHost) {\n        creatureBroadcastTargetsRef.current.clear();\n        demoCreaturesRef.current = createTileBasedDemoCreatures();\n        demoTileIndexRef.current = createDemoTileIndex(demoResourcesRef.current, demoCreaturesRef.current, demoBuildingsRef.current);\n        applyDemoSnapshot(true);\n        void seedMissingWorldCreatures(client, getCurrentCreatures());\n        void broadcastCreaturePositions({ channel, hostId: playerId, tile: demoTileRef.current, creatures: getCurrentCreatures() });\n      } else {\n        window.setTimeout(() => { if (!cancelled) void requestCreatureSnapshot({ channel, requesterId: playerId, tile: demoTileRef.current }); }, 150);\n        window.setTimeout(() => { if (!cancelled && demoCreaturesRef.current.length <= 0) void requestCreatureSnapshot({ channel, requesterId: playerId, tile: demoTileRef.current }); }, 900);\n      }\n    }).catch(() => {\n      if (cancelled) return;\n      isCreatureHostRef.current = false;\n      window.setTimeout(() => { if (!cancelled) void requestCreatureSnapshot({ channel, requesterId: playerId, tile: demoTileRef.current }); }, 150);\n    });\n    return () => {\n      cancelled = true;\n      void client.removeChannel(channel);\n      if (creatureBroadcastChannelRef.current === channel) creatureBroadcastChannelRef.current = null;\n    };\n  }, [applyCreatureBroadcastPayload, applyDemoSnapshot, getCurrentCreatures]);\n`,
  'ensure broadcast lifecycle',
);

const oldLoop = '      moveDemoCreatures(getCurrentCreatures(), deltaSeconds, now, demoPositionRef.current);\n      applyDemoSnapshot(false);';
const newLoop = `      const client = supabaseClientRef.current;\n      const multiplayerEnabled = Boolean(client && isSupabaseMultiplayerEnabled());\n      if (multiplayerEnabled && now - lastCreatureHostClaimAtRef.current >= creatureHostClaimMs) {\n        lastCreatureHostClaimAtRef.current = now;\n        void claimWorldHost(client, getCurrentMultiplayerPlayerId(), demoTileRef.current).then((result) => {\n          const wasHost = isCreatureHostRef.current;\n          isCreatureHostRef.current = result.isHost;\n          if (result.isHost) creatureBroadcastTargetsRef.current.clear();\n          else if (wasHost) {\n            demoCreaturesRef.current = [];\n            creatureBroadcastTargetsRef.current.clear();\n            demoTileIndexRef.current = createDemoTileIndex(demoResourcesRef.current, demoCreaturesRef.current, demoBuildingsRef.current);\n          }\n        });\n      }\n      if (!multiplayerEnabled || isCreatureHostRef.current) {\n        if (getCurrentCreatures().length <= 0) {\n          demoCreaturesRef.current = createTileBasedDemoCreatures();\n          demoTileIndexRef.current = createDemoTileIndex(demoResourcesRef.current, demoCreaturesRef.current, demoBuildingsRef.current);\n        }\n        moveDemoCreatures(getCurrentCreatures(), deltaSeconds, now, demoPositionRef.current);\n        const channel = creatureBroadcastChannelRef.current;\n        if (multiplayerEnabled && channel && now - lastCreatureBroadcastAtRef.current >= creatureBroadcastMs) {\n          lastCreatureBroadcastAtRef.current = now;\n          void broadcastCreaturePositions({ channel, hostId: getCurrentMultiplayerPlayerId(), tile: demoTileRef.current, creatures: getCurrentCreatures() });\n        }\n        if (multiplayerEnabled && now - lastCreatureSnapshotSaveAtRef.current >= creatureSnapshotSaveMs) {\n          lastCreatureSnapshotSaveAtRef.current = now;\n          void updateWorldCreaturePositions(client, getCurrentCreatures());\n        }\n      } else {\n        smoothRemoteCreatures(getCurrentCreatures(), creatureBroadcastTargetsRef.current, deltaSeconds, now);\n      }\n      applyDemoSnapshot(false);`;
replaceExact(oldLoop, newLoop, 'replace local creature loop with host-authoritative sync');

const oldAttack = '    target.hp = Math.max(0, target.hp - 18);\n    if (target.hp <= 0) { updateInventory((current) => addInventoryStack(current, "pal_essence", 1)); setChatLines((prev) => [...prev.slice(-5), `[demo] ${target.speciesId} 처치! 펄 정수 획득`]); }\n    else setChatLines((prev) => [...prev.slice(-5), `[demo] ${target.speciesId}에게 18 피해`]);\n    applyDemoSnapshot(true);';
const newAttack = `    const client = supabaseClientRef.current;\n    if (client && isSupabaseMultiplayerEnabled()) {\n      void attackWorldCreature(client, target.id, getCurrentMultiplayerPlayerId(), 18).then((result) => {\n        if (!result) return;\n        target.hp = result.hp;\n        target.maxHp = result.maxHp;\n        if (result.defeated) {\n          updateInventory((current) => addInventoryStack(current, "pal_essence", 1));\n          setChatLines((prev) => [...prev.slice(-5), "[world] " + target.speciesId + " 처치! 펄 정수 획득"]);\n        } else {\n          setChatLines((prev) => [...prev.slice(-5), "[world] " + target.speciesId + "에게 " + result.damageApplied + " 피해"]);\n        }\n        applyDemoSnapshot(true);\n        const channel = creatureBroadcastChannelRef.current;\n        if (channel && isCreatureHostRef.current) void broadcastCreaturePositions({ channel, hostId: getCurrentMultiplayerPlayerId(), tile: demoTileRef.current, creatures: getCurrentCreatures() });\n      });\n      return;\n    }\n    target.hp = Math.max(0, target.hp - 18);\n    if (target.hp <= 0) { updateInventory((current) => addInventoryStack(current, "pal_essence", 1)); setChatLines((prev) => [...prev.slice(-5), "[demo] " + target.speciesId + " 처치! 펄 정수 획득"]); }\n    else setChatLines((prev) => [...prev.slice(-5), "[demo] " + target.speciesId + "에게 18 피해"]);\n    applyDemoSnapshot(true);`;
replaceExact(oldAttack, newAttack, 'route creature attacks through supabase rpc');

const oldCapture = '    if (success) { const liveCreature = getCurrentCreatures().find((candidate) => candidate.id === creature.id); if (liveCreature) liveCreature.hp = 0; setChatLines((prev) => [...prev.slice(-5), `[capture] ${getPetSpeciesDefinition(creature.speciesId).name} 포획 성공!`]); }';
const newCapture = '    if (success) { const liveCreature = getCurrentCreatures().find((candidate) => candidate.id === creature.id); if (liveCreature) { liveCreature.hp = 0; const client = supabaseClientRef.current; if (client && isSupabaseMultiplayerEnabled()) void upsertWorldCreature(client, liveCreature); } setChatLines((prev) => [...prev.slice(-5), `[capture] ${getPetSpeciesDefinition(creature.speciesId).name} 포획 성공!`]); }';
replaceExact(oldCapture, newCapture, 'persist capture defeat');

if (changed) fs.writeFileSync(target, source);
else console.log(`${tag} no changes`);
