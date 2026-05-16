const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'src', 'features', 'game', 'GameClientTileDemoStation.tsx');
let source = fs.readFileSync(target, 'utf8');
let changed = false;

function write(label) {
  changed = true;
  console.log(`[patch-existing-client-broadcast-finalize] ${label}`);
}

function ensureAfter(anchor, insertion, label) {
  if (source.includes(insertion)) return;
  if (!source.includes(anchor)) {
    console.log(`[patch-existing-client-broadcast-finalize] skip ${label}`);
    return;
  }
  source = source.replace(anchor, anchor + insertion);
  write(label);
}

ensureAfter(
  '  useEffect(() => { setNickname(createClientNickname()); commitInventory(readStoredInventory(createDemoInventory())); }, [commitInventory]);\n',
  '  useEffect(() => {\n    const client = supabaseClientRef.current;\n    if (!client || !isSupabaseMultiplayerEnabled()) return;\n    const channel = createCreatureBroadcastChannel(client, demoTileRef.current, applyCreatureBroadcastPayload);\n    creatureBroadcastChannelRef.current = channel;\n    return () => { client.removeChannel(channel); if (creatureBroadcastChannelRef.current === channel) creatureBroadcastChannelRef.current = null; };\n  }, [applyCreatureBroadcastPayload]);\n',
  'ensure broadcast channel lifecycle',
);

const guardedLoop = `      const client = supabaseClientRef.current;
      if (client && isSupabaseMultiplayerEnabled() && now - lastCreatureHostClaimAtRef.current >= creatureHostClaimMs) {
        lastCreatureHostClaimAtRef.current = now;
        void claimWorldHost(client, getCurrentMultiplayerPlayerId(), demoTileRef.current).then((result) => {
          isCreatureHostRef.current = result.isHost;
          if (result.isHost) creatureBroadcastTargetsRef.current.clear();
        });
      }
      if (isCreatureHostRef.current) {
        moveDemoCreatures(getCurrentCreatures(), deltaSeconds, now, demoPositionRef.current);
        const channel = creatureBroadcastChannelRef.current;
        if (channel && now - lastCreatureBroadcastAtRef.current >= creatureBroadcastMs) {
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

if (!source.includes('if (isCreatureHostRef.current) {\n        moveDemoCreatures(getCurrentCreatures(), deltaSeconds, now, demoPositionRef.current);')) {
  const original = '      moveDemoCreatures(getCurrentCreatures(), deltaSeconds, now, demoPositionRef.current);\n      applyDemoSnapshot(false);';
  if (source.includes(original)) {
    source = source.replace(original, guardedLoop);
    write('replace original local creature loop');
  } else {
    const oldBroadcastBlock = /      if \(creaturePositionHostRef\.current\) \{[\s\S]*?\n      \}\n      applyDemoSnapshot\(false\);/;
    if (oldBroadcastBlock.test(source)) {
      source = source.replace(oldBroadcastBlock, guardedLoop);
      write('replace old creaturePositionHostRef loop');
    } else {
      console.log('[patch-existing-client-broadcast-finalize] no movement loop target');
    }
  }
}

if (changed) fs.writeFileSync(target, source);
else console.log('[patch-existing-client-broadcast-finalize] no changes');
