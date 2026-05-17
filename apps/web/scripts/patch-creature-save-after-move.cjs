const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'src', 'features', 'game', 'GameClientTileDemoStation.tsx');
let s = fs.readFileSync(target, 'utf8');
const before = s;
const tag = '[patch-creature-save-after-move]';

function log(message) { console.log(`${tag} ${message}`); }

const refAnchor = '  const lastUiSnapshotAtRef = useRef(0);\n';
if (s.includes(refAnchor) && !s.includes('forceCreatureDbSaveAtRef')) {
  s = s.replace(refAnchor, refAnchor + '  const forceCreatureDbSaveAtRef = useRef(0);\n');
  log('added save tick ref');
}

const guardedMove = '      if (!isSupabaseMultiplayerEnabled() || creatureAuthorityRef.current !== "client") moveDemoCreatures(getCurrentCreatures(), deltaSeconds, now, demoPositionRef.current);';
const guardedMoveWithSave = `      if (!isSupabaseMultiplayerEnabled() || creatureAuthorityRef.current !== "client") moveDemoCreatures(getCurrentCreatures(), deltaSeconds, now, demoPositionRef.current);
      if (supabaseClientRef.current && isSupabaseMultiplayerEnabled() && isCreatureHostRef.current && now - forceCreatureDbSaveAtRef.current >= 800) {
        forceCreatureDbSaveAtRef.current = now;
        void updateWorldCreaturePositions(supabaseClientRef.current, getCurrentCreatures());
      }`;

const strictMove = '      if (!isSupabaseMultiplayerEnabled() || isCreatureHostRef.current) moveDemoCreatures(getCurrentCreatures(), deltaSeconds, now, demoPositionRef.current);';
const strictMoveWithSave = `      if (!isSupabaseMultiplayerEnabled() || isCreatureHostRef.current) moveDemoCreatures(getCurrentCreatures(), deltaSeconds, now, demoPositionRef.current);
      if (supabaseClientRef.current && isSupabaseMultiplayerEnabled() && isCreatureHostRef.current && now - forceCreatureDbSaveAtRef.current >= 800) {
        forceCreatureDbSaveAtRef.current = now;
        void updateWorldCreaturePositions(supabaseClientRef.current, getCurrentCreatures());
      }`;

const plainMove = '      moveDemoCreatures(getCurrentCreatures(), deltaSeconds, now, demoPositionRef.current);';
const plainMoveWithSave = `      moveDemoCreatures(getCurrentCreatures(), deltaSeconds, now, demoPositionRef.current);
      if (supabaseClientRef.current && isSupabaseMultiplayerEnabled() && isCreatureHostRef.current && now - forceCreatureDbSaveAtRef.current >= 800) {
        forceCreatureDbSaveAtRef.current = now;
        void updateWorldCreaturePositions(supabaseClientRef.current, getCurrentCreatures());
      }`;

if (s.includes(guardedMove) && !s.includes('forceCreatureDbSaveAtRef.current = now;')) {
  s = s.replace(guardedMove, guardedMoveWithSave);
  log('patched save after authority guarded movement');
} else if (s.includes(strictMove) && !s.includes('forceCreatureDbSaveAtRef.current = now;')) {
  s = s.replace(strictMove, strictMoveWithSave);
  log('patched save after strict guarded movement');
} else if (s.includes(plainMove) && !s.includes('forceCreatureDbSaveAtRef.current = now;')) {
  s = s.replace(plainMove, plainMoveWithSave);
  log('patched save after plain movement');
} else if (s.includes('forceCreatureDbSaveAtRef.current = now;')) {
  log('save after movement already patched');
} else {
  log('movement line not found');
}

if (s !== before) fs.writeFileSync(target, s);
else log('no changes');
