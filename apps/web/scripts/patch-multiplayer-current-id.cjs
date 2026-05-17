const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'src', 'features', 'multiplayer', 'supabaseMultiplayer.ts');
let source = fs.readFileSync(target, 'utf8');
let original = source;

const oldCurrent = `export function getCurrentMultiplayerPlayerId() {
  if (typeof window === "undefined") return "unknown";
  return window.sessionStorage.getItem(sessionPlayerIdKey)
    ?? window.localStorage.getItem(legacyPlayerIdKey)
    ?? "unknown";
}`;

const newCurrent = `export function getCurrentMultiplayerPlayerId() {
  if (typeof window === "undefined") return "unknown";
  return getOrCreateMultiplayerPlayerId();
}`;

if (source.includes(oldCurrent)) {
  source = source.replace(oldCurrent, newCurrent);
  console.log('[patch-multiplayer-current-id] patched getCurrentMultiplayerPlayerId');
} else if (source.includes(newCurrent)) {
  console.log('[patch-multiplayer-current-id] already patched getCurrentMultiplayerPlayerId');
} else {
  console.log('[patch-multiplayer-current-id] target function shape not found');
}

const oldCreate = `export function getOrCreateMultiplayerPlayerId() {
  if (typeof window === "undefined") return "server-player";

  const existingSessionId = window.sessionStorage.getItem(sessionPlayerIdKey);
  if (existingSessionId) return existingSessionId;

  const next = createPlayerId();
  window.sessionStorage.setItem(sessionPlayerIdKey, next);
  window.localStorage.setItem(legacyPlayerIdKey, next);
  return next;
}`;

const newCreate = `export function getOrCreateMultiplayerPlayerId() {
  if (typeof window === "undefined") return "server-player";

  const existingSessionId = window.sessionStorage.getItem(sessionPlayerIdKey);
  if (existingSessionId) return existingSessionId;

  const legacyId = window.localStorage.getItem(legacyPlayerIdKey);
  if (legacyId) {
    window.sessionStorage.setItem(sessionPlayerIdKey, legacyId);
    return legacyId;
  }

  const next = createPlayerId();
  window.sessionStorage.setItem(sessionPlayerIdKey, next);
  window.localStorage.setItem(legacyPlayerIdKey, next);
  return next;
}`;

if (source.includes(oldCreate)) {
  source = source.replace(oldCreate, newCreate);
  console.log('[patch-multiplayer-current-id] patched legacy id restore');
} else if (source.includes('const legacyId = window.localStorage.getItem(legacyPlayerIdKey);')) {
  console.log('[patch-multiplayer-current-id] already patched legacy id restore');
}

if (source !== original) fs.writeFileSync(target, source);

const gameTarget = path.join(__dirname, '..', 'src', 'features', 'game', 'GameClientTileDemoStation.tsx');
let game = fs.readFileSync(gameTarget, 'utf8');
const gameOriginal = game;

if (game.includes('seedMissingWorldCreatures, updateWorldCreaturePositions') && !game.includes('fetchWorldCreatures, rowToCreature')) {
  game = game.replace(
    'import { attackWorldCreature, seedMissingWorldCreatures, updateWorldCreaturePositions, upsertWorldCreature } from "../multiplayer/supabaseWorldCreatures";',
    'import { attackWorldCreature, fetchWorldCreatures, rowToCreature, seedMissingWorldCreatures, updateWorldCreaturePositions, upsertWorldCreature } from "../multiplayer/supabaseWorldCreatures";',
  );
  console.log('[patch-multiplayer-current-id] added DB creature hydrate imports');
}

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

if (game.includes(resetBlock)) {
  game = game.replace(resetBlock, hydrateBlock);
  console.log('[patch-multiplayer-current-id] patched host startup to hydrate creatures from DB');
} else if (game.includes('fetchWorldCreatures(client, demoTileRef.current).then((rows)')) {
  console.log('[patch-multiplayer-current-id] already patched host DB creature hydrate');
}

const loopReset = `        if (getCurrentCreatures().length <= 0) {
          demoCreaturesRef.current = createTileBasedDemoCreatures();
          demoTileIndexRef.current = createDemoTileIndex(demoResourcesRef.current, demoCreaturesRef.current, demoBuildingsRef.current);
        }`;
const loopOfflineOnly = `        if (!multiplayerEnabled && getCurrentCreatures().length <= 0) {
          demoCreaturesRef.current = createTileBasedDemoCreatures();
          demoTileIndexRef.current = createDemoTileIndex(demoResourcesRef.current, demoCreaturesRef.current, demoBuildingsRef.current);
        }`;
if (game.includes(loopReset)) {
  game = game.replace(loopReset, loopOfflineOnly);
  console.log('[patch-multiplayer-current-id] disabled online empty-creature respawn reset');
}

if (game !== gameOriginal) fs.writeFileSync(gameTarget, game);
