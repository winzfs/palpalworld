const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'src', 'features', 'game', 'GameClientTileDemoStation.tsx');
let source = fs.readFileSync(target, 'utf8');
let changed = false;

function patch(label) { changed = true; console.log(`[patch-existing-client-broadcast-finalize] ${label}`); }
function addAfter(anchor, text, label) { if (source.includes(text)) return; if (!source.includes(anchor)) { console.log(`[patch-existing-client-broadcast-finalize] skip ${label}`); return; } source = source.replace(anchor, anchor + text); patch(label); }
function ensureConst(name, value) {
  const line = `const ${name} = ${value};\n`;
  const regex = new RegExp(`const ${name} = [^;]+;\\n`, 'g');
  source = source.replace(regex, '');
  addAfter('const creatureMapSize = creatureMapMax - creatureMapMin;\n', line, `dedupe ${name}`);
}
function ensureUseRef(name, expression, anchor, label) {
  const line = `  const ${name} = useRef(${expression});\n`;
  const regex = new RegExp(`\\s*const ${name} = useRef\\([^\\n]+\\);\\n`, 'g');
  source = source.replace(regex, '');
  addAfter(anchor, line, label);
}

addAfter('import { PixiGameCanvas } from "./pixi/PixiGameCanvas";\n', 'import { broadcastCreaturePositions, createCreatureBroadcastChannel, type CreaturePositionsBroadcastPayload } from "../multiplayer/supabaseCreatureBroadcast";\nimport { claimWorldHost, getCurrentMultiplayerPlayerId, getSupabaseClient, isSupabaseMultiplayerEnabled } from "../multiplayer/supabaseMultiplayer";\nimport { updateWorldCreaturePositions } from "../multiplayer/supabaseWorldCreatures";\n', 'ensure broadcast imports');
addAfter('type CreatureWanderTarget = { x: number; y: number; nextRetargetAt: number };\n', 'type CreatureBroadcastTarget = { x: number; y: number; hp: number; maxHp: number; receivedAt: number };\n', 'ensure broadcast target type');
ensureConst('creatureBroadcastMs', '250');
ensureConst('creatureSnapshotSaveMs', '1000');
ensureConst('creatureHostClaimMs', '0');
ensureConst('creatureBroadcastLerpPerSecond', '9');
ensureConst('creatureBroadcastSnapDistance', '520');

const smoothHelper = `
function smoothRemoteCreatures(creatures: CreaturePublicState[], targets: Map<string, CreatureBroadcastTarget>, deltaSeconds: number, now: number) {
  if (targets.size <= 0 || creatures.length <= 0) return;
  const alpha = Math.max(0.08, Math.min(0.72, 1 - Math.exp(-creatureBroadcastLerpPerSecond * deltaSeconds)));
  for (const creature of creatures) {
    const target = targets.get(creature.id);
    if (!target) continue;
    if (now - target.receivedAt > 2500) { targets.delete(creature.id); continue; }
    const dx = target.x - creature.position.x;
    const dy = target.y - creature.position.y;
    const distance = Math.hypot(dx, dy);
    if (distance > creatureBroadcastSnapDistance) { creature.position.x = target.x; creature.position.y = target.y; }
    else if (distance > 0.5) { creature.position.x += dx * alpha; creature.position.y += dy * alpha; }
    creature.hp = target.hp;
    creature.maxHp = target.maxHp;
  }
}
`;
addAfter('function createDemoInventory(): InventoryState {\n', smoothHelper + '\n', 'ensure smooth remote helper');

ensureUseRef('supabaseClientRef', 'getSupabaseClient()', '  const lastUiSnapshotAtRef = useRef(0);\n', 'dedupe supabase client ref');
ensureUseRef('creatureBroadcastChannelRef', '<ReturnType<typeof createCreatureBroadcastChannel> | null>(null)', '  const supabaseClientRef = useRef(getSupabaseClient());\n', 'dedupe broadcast channel ref');
ensureUseRef('creatureBroadcastTargetsRef', 'new Map<string, CreatureBroadcastTarget>()', '  const creatureBroadcastChannelRef = useRef<ReturnType<typeof createCreatureBroadcastChannel> | null>(null);\n', 'dedupe broadcast target ref');
ensureUseRef('isCreatureHostRef', 'false', '  const creatureBroadcastTargetsRef = useRef(new Map<string, CreatureBroadcastTarget>());\n', 'dedupe host ref');
ensureUseRef('lastCreatureHostClaimAtRef', '-999999', '  const isCreatureHostRef = useRef(false);\n', 'dedupe host claim ref');
ensureUseRef('lastCreatureBroadcastAtRef', '0', '  const lastCreatureHostClaimAtRef = useRef(-999999);\n', 'dedupe broadcast tick ref');
ensureUseRef('lastCreatureSnapshotSaveAtRef', '0', '  const lastCreatureBroadcastAtRef = useRef(0);\n', 'dedupe snapshot save ref');

const handler = `
  const applyCreatureBroadcastPayload = useCallback((payload: CreaturePositionsBroadcastPayload) => {
    if (payload.hostId === getCurrentMultiplayerPlayerId()) return;
    const tile = demoTileRef.current;
    if (payload.tile.regionId !== tile.regionId || payload.tile.tileX !== tile.tileX || payload.tile.tileY !== tile.tileY) return;
    const now = performance.now();
    const liveIds = new Set(demoCreaturesRef.current.map((creature) => creature.id));
    for (const packet of payload.creatures) {
      if (!liveIds.has(packet.id)) continue;
      creatureBroadcastTargetsRef.current.set(packet.id, { x: packet.x, y: packet.y, hp: packet.hp, maxHp: packet.maxHp, receivedAt: now });
    }
  }, []);
`;
addAfter('  }, [getCurrentBuildings, getCurrentCreatures, getCurrentResources, nickname]);\n', handler, 'ensure broadcast handler');

const lifecycle = `  useEffect(() => {
    const client = supabaseClientRef.current;
    if (!client || !isSupabaseMultiplayerEnabled()) return;
    void claimWorldHost(client, getCurrentMultiplayerPlayerId(), demoTileRef.current).then((result) => {
      isCreatureHostRef.current = result.isHost;
      if (result.isHost) creatureBroadcastTargetsRef.current.clear();
    });
    const channel = createCreatureBroadcastChannel(client, demoTileRef.current, applyCreatureBroadcastPayload);
    creatureBroadcastChannelRef.current = channel;
    return () => { client.removeChannel(channel); if (creatureBroadcastChannelRef.current === channel) creatureBroadcastChannelRef.current = null; };
  }, [applyCreatureBroadcastPayload]);
`;
addAfter('  useEffect(() => { setNickname(createClientNickname()); commitInventory(readStoredInventory(createDemoInventory())); }, [commitInventory]);\n', lifecycle, 'ensure broadcast lifecycle');

const guardedLoop = `      const client = supabaseClientRef.current;
      if (client && isSupabaseMultiplayerEnabled() && now - lastCreatureHostClaimAtRef.current >= creatureHostClaimMs) {
        lastCreatureHostClaimAtRef.current = now;
        void claimWorldHost(client, getCurrentMultiplayerPlayerId(), demoTileRef.current).then((result) => {
          isCreatureHostRef.current = result.isHost;
          if (result.isHost) creatureBroadcastTargetsRef.current.clear();
        });
      }
      if (!client || !isSupabaseMultiplayerEnabled() || isCreatureHostRef.current) {
        moveDemoCreatures(getCurrentCreatures(), deltaSeconds, now, demoPositionRef.current);
        const channel = creatureBroadcastChannelRef.current;
        if (client && channel && isSupabaseMultiplayerEnabled() && now - lastCreatureBroadcastAtRef.current >= creatureBroadcastMs) {
          lastCreatureBroadcastAtRef.current = now;
          void broadcastCreaturePositions({ channel, hostId: getCurrentMultiplayerPlayerId(), tile: demoTileRef.current, creatures: getCurrentCreatures() });
        }
        if (client && isSupabaseMultiplayerEnabled() && now - lastCreatureSnapshotSaveAtRef.current >= creatureSnapshotSaveMs) {
          lastCreatureSnapshotSaveAtRef.current = now;
          void updateWorldCreaturePositions(client, getCurrentCreatures());
        }
      } else {
        smoothRemoteCreatures(getCurrentCreatures(), creatureBroadcastTargetsRef.current, deltaSeconds, now);
      }
      applyDemoSnapshot(false);`;

const localLoop = '      moveDemoCreatures(getCurrentCreatures(), deltaSeconds, now, demoPositionRef.current);\n      applyDemoSnapshot(false);';
if (source.includes(localLoop)) { source = source.split(localLoop).join(guardedLoop); patch('replace standalone local creature loop'); }

if (changed) fs.writeFileSync(target, source);
else console.log('[patch-existing-client-broadcast-finalize] no changes');
