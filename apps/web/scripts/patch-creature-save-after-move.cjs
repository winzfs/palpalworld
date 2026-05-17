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

const saveBlock = `      if (isSupabaseMultiplayerEnabled() && creatureAuthorityRef.current !== "client" && now - forceCreatureDbSaveAtRef.current >= 800) {
        const creatureSaveClient = supabaseClientRef.current ?? getSupabaseClient();
        if (creatureSaveClient) {
          forceCreatureDbSaveAtRef.current = now;
          void updateWorldCreaturePositions(creatureSaveClient, getCurrentCreatures());
        }
      }`;

const oldSaveRegex = /\n      if \(supabaseClientRef\.current && isSupabaseMultiplayerEnabled\(\) && isCreatureHostRef\.current && now - forceCreatureDbSaveAtRef\.current >= 800\) \{\n        forceCreatureDbSaveAtRef\.current = now;\n        void updateWorldCreaturePositions\(supabaseClientRef\.current, getCurrentCreatures\(\)\);\n      \}/g;
if (oldSaveRegex.test(s)) {
  s = s.replace(oldSaveRegex, `\n${saveBlock}`);
  log('replaced save block with client fallback');
}

const guardedMove = '      if (!isSupabaseMultiplayerEnabled() || creatureAuthorityRef.current !== "client") moveDemoCreatures(getCurrentCreatures(), deltaSeconds, now, demoPositionRef.current);';
const strictMove = '      if (!isSupabaseMultiplayerEnabled() || isCreatureHostRef.current) moveDemoCreatures(getCurrentCreatures(), deltaSeconds, now, demoPositionRef.current);';
const plainMove = '      moveDemoCreatures(getCurrentCreatures(), deltaSeconds, now, demoPositionRef.current);';

if (!s.includes('const creatureSaveClient = supabaseClientRef.current ?? getSupabaseClient();')) {
  if (s.includes(guardedMove)) {
    s = s.replace(guardedMove, `${guardedMove}\n${saveBlock}`);
    log('patched save after authority guarded movement');
  } else if (s.includes(strictMove)) {
    s = s.replace(strictMove, `${strictMove}\n${saveBlock}`);
    log('patched save after strict guarded movement');
  } else if (s.includes(plainMove)) {
    s = s.replace(plainMove, `${plainMove}\n${saveBlock}`);
    log('patched save after plain movement');
  } else {
    log('movement line not found');
  }
} else {
  log('save after movement already patched');
}

if (s !== before) fs.writeFileSync(target, s);
else log('no changes');
