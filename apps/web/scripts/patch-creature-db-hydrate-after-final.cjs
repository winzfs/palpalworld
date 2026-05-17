const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'src', 'features', 'game', 'GameClientTileDemoStation.tsx');
let source = fs.readFileSync(target, 'utf8');
const original = source;
const tag = '[patch-creature-db-hydrate-after-final]';

function log(message) {
  console.log(`${tag} ${message}`);
}

source = source.replace(
  'import { attackWorldCreature, seedMissingWorldCreatures, updateWorldCreaturePositions, upsertWorldCreature } from "../multiplayer/supabaseWorldCreatures";',
  'import { attackWorldCreature, fetchWorldCreatures, rowToCreature, seedMissingWorldCreatures, updateWorldCreaturePositions, upsertWorldCreature } from "../multiplayer/supabaseWorldCreatures";',
);

const resetBlock = `        creatureBroadcastTargetsRef.current.clear();
        demoCreaturesRef.current = createTileBasedDemoCreatures();
        demoTileIndexRef.current = createDemoTileIndex(demoResourcesRef.current, demoCreaturesRef.current, demoBuildingsRef.current);
        applyDemoSnapshot(true);
        void seedMissingWorldCreatures(client, getCurrentCreatures());
        void broadcastCreaturePositions({ channel, hostId: playerId, tile: demoTileRef.current, creatures: getCurrentCreatures() });`;

const hydrateBlock = `        creatureBroadcastTargetsRef.current.clear();
        void fetchWorldCreatures(client, demoTileRef.current).then((rows) => {
          if (cancelled || !isCreatureHostRef.current) return;
          const aliveRows = rows.filter((row) => !row.defeated && row.hp > 0);
          if (aliveRows.length > 0) {
            demoCreaturesRef.current = aliveRows.map(rowToCreature);
          } else {
            demoCreaturesRef.current = createTileBasedDemoCreatures();
            void seedMissingWorldCreatures(client, demoCreaturesRef.current);
          }
          demoTileIndexRef.current = createDemoTileIndex(demoResourcesRef.current, demoCreaturesRef.current, demoBuildingsRef.current);
          applyDemoSnapshot(true);
          void broadcastCreaturePositions({ channel, hostId: playerId, tile: demoTileRef.current, creatures: getCurrentCreatures() });
        });`;

if (source.includes(resetBlock)) {
  source = source.replace(resetBlock, hydrateBlock);
  log('patched host startup to hydrate from DB');
} else if (source.includes('fetchWorldCreatures(client, demoTileRef.current).then((rows)')) {
  log('host startup already hydrates from DB');
} else {
  log('host startup reset block not found');
}

const loopReset = `        if (getCurrentCreatures().length <= 0) {
          demoCreaturesRef.current = createTileBasedDemoCreatures();
          demoTileIndexRef.current = createDemoTileIndex(demoResourcesRef.current, demoCreaturesRef.current, demoBuildingsRef.current);
        }`;
const loopOfflineOnly = `        if (!multiplayerEnabled && getCurrentCreatures().length <= 0) {
          demoCreaturesRef.current = createTileBasedDemoCreatures();
          demoTileIndexRef.current = createDemoTileIndex(demoResourcesRef.current, demoCreaturesRef.current, demoBuildingsRef.current);
        }`;
if (source.includes(loopReset)) {
  source = source.replace(loopReset, loopOfflineOnly);
  log('disabled online empty-creature respawn reset');
} else if (source.includes(loopOfflineOnly)) {
  log('online empty-creature respawn already disabled');
}

if (source !== original) fs.writeFileSync(target, source);
else log('no changes');
