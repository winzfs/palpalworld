const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'src', 'features', 'multiplayer', 'supabaseMultiplayer.ts');
let source = fs.readFileSync(target, 'utf8');
const original = source;

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
