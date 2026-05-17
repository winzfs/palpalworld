const fs = require('fs');
const path = require('path');

require('./patch-multiplayer-current-id.cjs');

const target = path.join(__dirname, '..', 'src', 'features', 'game', 'GameClientTileDemoStation.tsx');
let source = fs.readFileSync(target, 'utf8');
let changed = false;
const tag = '[patch-creature-sync-force-final]';

function patch(label) {
  changed = true;
  console.log(`${tag} ${label}`);
}

function replaceOnce(search, replacement, label) {
  if (!source.includes(search)) {
    console.log(`${tag} skipped ${label}`);
    return false;
  }
  if (source.includes(replacement.trim())) return true;
  source = source.replace(search, replacement);
  patch(label);
  return true;
}

const lifecycle = `  useEffect(() => {
    const client = supabaseClientRef.current;
    if (!client || !isSupabaseMultiplayerEnabled()) return;
    let cancelled = false;
    const playerId = getCurrentMultiplayerPlayerId();
    const channel = createCreatureBroadcastChannel(client, demoTileRef.current, applyCreatureBroadcastPayload, (request) => {
      if (!isCreatureHostRef.current || request.requesterId === playerId) return;
      void broadcastCreaturePositions({ channel, hostId: playerId, tile: demoTileRef.current, creatures: getCurrentCreatures() });
    });
    creatureBroadcastChannelRef.current = channel;
    demoCreaturesRef.current = [];
    creatureBroadcastTargetsRef.current.clear();
    demoTileIndexRef.current = createDemoTileIndex(demoResourcesRef.current, demoCreaturesRef.current, demoBuildingsRef.current);
    applyDemoSnapshot(true);
    void claimWorldHost(client, playerId, demoTileRef.current).then((result) => {
      if (cancelled) return;
      isCreatureHostRef.current = result.isHost;
      if (result.isHost) {
        creatureBroadcastTargetsRef.current.clear();
        demoCreaturesRef.current = createTileBasedDemoCreatures();
        demoTileIndexRef.current = createDemoTileIndex(demoResourcesRef.current, demoCreaturesRef.current, demoBuildingsRef.current);
        applyDemoSnapshot(true);
        void seedMissingWorldCreatures(client, getCurrentCreatures());
        void broadcastCreaturePositions({ channel, hostId: playerId, tile: demoTileRef.current, creatures: getCurrentCreatures() });
      } else {
        window.setTimeout(() => { if (!cancelled) void requestCreatureSnapshot({ channel, requesterId: playerId, tile: demoTileRef.current }); }, 150);
        window.setTimeout(() => { if (!cancelled && demoCreaturesRef.current.length <= 0) void requestCreatureSnapshot({ channel, requesterId: playerId, tile: demoTileRef.current }); }, 900);
      }
    }).catch(() => {
      if (cancelled) return;
      isCreatureHostRef.current = false;
      window.setTimeout(() => { if (!cancelled) void requestCreatureSnapshot({ channel, requesterId: playerId, tile: demoTileRef.current }); }, 150);
    });
    return () => {
      cancelled = true;
      void client.removeChannel(channel);
      if (creatureBroadcastChannelRef.current === channel) creatureBroadcastChannelRef.current = null;
    };
  }, [applyCreatureBroadcastPayload, applyDemoSnapshot, getCurrentCreatures]);
`;

if (!source.includes('createCreatureBroadcastChannel(client, demoTileRef.current, applyCreatureBroadcastPayload')) {
  const anchor = '  useEffect(() => {\n    const handleInventoryChanged = (event: Event) => {';
  if (source.includes(anchor)) {
    source = source.replace(anchor, `${lifecycle}\n${anchor}`);
    patch('forced broadcast lifecycle');
  } else {
    console.log(`${tag} skipped forced broadcast lifecycle`);
  }
}

const hostLoop = `      const client = supabaseClientRef.current;
      const multiplayerEnabled = Boolean(client && isSupabaseMultiplayerEnabled());
      if (multiplayerEnabled && now - lastCreatureHostClaimAtRef.current >= creatureHostClaimMs) {
        lastCreatureHostClaimAtRef.current = now;
        void claimWorldHost(client, getCurrentMultiplayerPlayerId(), demoTileRef.current).then((result) => {
          const wasHost = isCreatureHostRef.current;
          isCreatureHostRef.current = result.isHost;
          if (result.isHost) creatureBroadcastTargetsRef.current.clear();
          else if (wasHost) {
            demoCreaturesRef.current = [];
            creatureBroadcastTargetsRef.current.clear();
            demoTileIndexRef.current = createDemoTileIndex(demoResourcesRef.current, demoCreaturesRef.current, demoBuildingsRef.current);
          }
        });
      }
      if (!multiplayerEnabled || isCreatureHostRef.current) {
        if (getCurrentCreatures().length <= 0) {
          demoCreaturesRef.current = createTileBasedDemoCreatures();
          demoTileIndexRef.current = createDemoTileIndex(demoResourcesRef.current, demoCreaturesRef.current, demoBuildingsRef.current);
        }
        moveDemoCreatures(getCurrentCreatures(), deltaSeconds, now, demoPositionRef.current);
        const channel = creatureBroadcastChannelRef.current;
        if (multiplayerEnabled && channel && now - lastCreatureBroadcastAtRef.current >= creatureBroadcastMs) {
          lastCreatureBroadcastAtRef.current = now;
          void broadcastCreaturePositions({ channel, hostId: getCurrentMultiplayerPlayerId(), tile: demoTileRef.current, creatures: getCurrentCreatures() });
        }
        if (multiplayerEnabled && now - lastCreatureSnapshotSaveAtRef.current >= creatureSnapshotSaveMs) {
          lastCreatureSnapshotSaveAtRef.current = now;
          void updateWorldCreaturePositions(client, getCurrentCreatures());
        }
      } else {
        smoothRemoteCreatures(getCurrentCreatures(), creatureBroadcastTargetsRef.current, deltaSeconds, now);
      }
      if (input.primary) handleDemoAttackRef.current?.();
      applyDemoSnapshot(false);`;

if (!source.includes('lastCreatureBroadcastAtRef.current = now;')) {
  const perfLoop = `      if (now - lastCreatureAiAtRef.current >= 80) {
        const creatureDeltaSeconds = Math.min(0.16, (now - lastCreatureAiAtRef.current) / 1000);
        moveDemoCreatures(getCurrentCreatures(), creatureDeltaSeconds, now, demoPositionRef.current);
        lastCreatureAiAtRef.current = now;
      }
      if (input.primary) handleDemoAttackRef.current?.();
      applyDemoSnapshot(false);`;
  const simpleLoop = `      moveDemoCreatures(getCurrentCreatures(), deltaSeconds, now, demoPositionRef.current);
      applyDemoSnapshot(false);`;
  if (!replaceOnce(perfLoop, hostLoop, 'forced host-authoritative perf loop')) {
    replaceOnce(simpleLoop, hostLoop, 'forced host-authoritative simple loop');
  }
}

if (changed) fs.writeFileSync(target, source);
else console.log(`${tag} no changes`);

require('./patch-creature-db-hydrate-after-final.cjs');
require('./patch-creature-db-authoritative-loop.cjs');
require('./patch-creature-db-persist-direct.cjs');
