const fs = require('fs');
const path = require('path');
const target = path.join(__dirname, '..', 'src', 'features', 'game', 'GameClientTileDemoStation.tsx');
let source = fs.readFileSync(target, 'utf8');
let changed = false;
function r(a,b,n){ if(source.includes(b)) return; if(!source.includes(a)){ console.log('skip '+n); return;} source=source.replace(a,b); changed=true; console.log('patch '+n); }
r(
'      moveDemoCreatures(getCurrentCreatures(), deltaSeconds, now, demoPositionRef.current);\n      applyDemoSnapshot(false);',
'      const client = supabaseClientRef.current;\n      if (client && isSupabaseMultiplayerEnabled() && now - lastCreatureHostClaimAtRef.current >= creatureHostClaimMs) {\n        lastCreatureHostClaimAtRef.current = now;\n        void claimWorldHost(client, getCurrentMultiplayerPlayerId(), demoTileRef.current).then((result) => {\n          isCreatureHostRef.current = result.isHost;\n          if (result.isHost) creatureBroadcastTargetsRef.current.clear();\n        });\n      }\n      if (isCreatureHostRef.current) {\n        moveDemoCreatures(getCurrentCreatures(), deltaSeconds, now, demoPositionRef.current);\n        const channel = creatureBroadcastChannelRef.current;\n        if (channel && now - lastCreatureBroadcastAtRef.current >= creatureBroadcastMs) {\n          lastCreatureBroadcastAtRef.current = now;\n          void broadcastCreaturePositions({ channel, hostId: getCurrentMultiplayerPlayerId(), tile: demoTileRef.current, creatures: getCurrentCreatures() });\n        }\n        if (client && isSupabaseMultiplayerEnabled() && now - lastCreatureSnapshotSaveAtRef.current >= creatureSnapshotSaveMs) {\n          lastCreatureSnapshotSaveAtRef.current = now;\n          void updateWorldCreaturePositions(client, getCurrentCreatures());\n        }\n      } else {\n        smoothRemoteCreatures(getCurrentCreatures(), creatureBroadcastTargetsRef.current, deltaSeconds, now);\n      }\n      applyDemoSnapshot(false);',
'host movement loop');
if(changed) fs.writeFileSync(target, source);
