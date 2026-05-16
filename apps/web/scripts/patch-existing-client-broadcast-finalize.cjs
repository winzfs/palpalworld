const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'src', 'features', 'game', 'GameClientTileDemoStation.tsx');
let source = fs.readFileSync(target, 'utf8');
let changed = false;

function patch(label) { changed = true; console.log(`[patch-existing-client-broadcast-finalize] ${label}`); }
function addAfter(anchor, text, label) { if (source.includes(text)) return; if (!source.includes(anchor)) { console.log(`[patch-existing-client-broadcast-finalize] skip ${label}`); return; } source = source.replace(anchor, anchor + text); patch(label); }
function ensureRef(anchor, text, label) { if (source.includes(text)) return; addAfter(anchor, text, label); }

addAfter('import { PixiGameCanvas } from "./pixi/PixiGameCanvas";\n', 'import { broadcastCreaturePositions, createCreatureBroadcastChannel, type CreaturePositionsBroadcastPayload } from "../multiplayer/supabaseCreatureBroadcast";\nimport { claimWorldHost, getCurrentMultiplayerPlayerId, getSupabaseClient, isSupabaseMultiplayerEnabled } from "../multiplayer/supabaseMultiplayer";\nimport { updateWorldCreaturePositions } from "../multiplayer/supabaseWorldCreatures";\n', 'ensure broadcast imports');
addAfter('type CreatureWanderTarget = { x: number; y: number; nextRetargetAt: number };\n', 'type CreatureBroadcastTarget = { x: number; y: number; hp: number; maxHp: number; receivedAt: number };\n', 'ensure broadcast target type');
addAfter('const creatureMapSize = creatureMapMax - creatureMapMin;\n', 'const creatureBroadcastMs = 250;\nconst creatureSnapshotSaveMs = 1000;\nconst creatureHostClaimMs = 0;\nconst creatureBroadcastLerpPerSecond = 9;\nconst creatureBroadcastSnapDistance = 520;\n', 'ensure broadcast constants');

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

const baseRefAnchor = source.includes('  const supabaseClientRef = useRef(getSupabaseClient());\n') ? '  const supabaseClientRef = useRef(getSupabaseClient());\n' : '  const lastUiSnapshotAtRef = useRef(0);\n';
if (!source.includes('  const supabaseClientRef = useRef(getSupabaseClient());\n')) ensureRef('  const lastUiSnapshotAtRef = useRef(0);\n', '  const supabaseClientRef = useRef(getSupabaseClient());\n', 'ensure supabase client ref');
ensureRef(baseRefAnchor, '  const creatureBroadcastChannelRef = useRef<ReturnType<typeof createCreatureBroadcastChannel> | null>(null);\n', 'ensure broadcast channel ref');
ensureRef('  const creatureBroadcastChannelRef = useRef<ReturnType<typeof createCreatureBroadcastChannel> | null>(null);\n', '  const creatureBroadcastTargetsRef = useRef(new Map<string, CreatureBroadcastTarget>());\n', 'ensure broadcast target ref');
ensureRef('  const creatureBroadcastTargetsRef = useRef(new Map<string, CreatureBroadcastTarget>());\n', '  const isCreatureHostRef = useRef(false);\n', 'ensure host ref');
ensureRef('  const isCreatureHostRef = useRef(false);\n', '  const lastCreatureHostClaimAtRef = useRef(-999999);\n', 'ensure host claim ref');
ensureRef('  const lastCreatureHostClaimAtRef = useRef(-999999);\n', '  const lastCreatureBroadcastAtRef = useRef(0);\n', 'ensure broadcast tick ref');
ensureRef('  const lastCreatureBroadcastAtRef = useRef(0);\n', '  const lastCreatureSnapshotSaveAtRef = useRef(0);\n', 'ensure snapshot save ref');

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

source = source.replaceAll('const creatureSnapshotSaveMs = 8000;', 'const creatureSnapshotSaveMs = 1000;');
source = source.replaceAll('const creatureHostClaimMs = 2200;', 'const creatureHostClaimMs = 0;');
source = source.replaceAll('const lastCreatureHostClaimAtRef = useRef(0);', 'const lastCreatureHostClaimAtRef = useRef(-999999);');

if (changed) fs.writeFileSync(target, source);
else console.log('[patch-existing-client-broadcast-finalize] no changes');
