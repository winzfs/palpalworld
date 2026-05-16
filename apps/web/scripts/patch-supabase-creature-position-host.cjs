const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'src', 'features', 'game', 'GameClientTileDemoStation.tsx');
let source = fs.readFileSync(target, 'utf8');
let changed = false;

function replaceOnce(search, replacement, label) {
  if (source.includes(replacement)) {
    console.log(`[patch-supabase-creature-position-host] already patched ${label}`);
    return;
  }
  if (!source.includes(search)) {
    console.log(`[patch-supabase-creature-position-host] skipped ${label}`);
    return;
  }
  source = source.replace(search, replacement);
  changed = true;
  console.log(`[patch-supabase-creature-position-host] patched ${label}`);
}

replaceOnce(
  'import { applyWorldCreatureDamage, fetchWorldCreatures, rowToCreature, seedMissingWorldCreatures, upsertWorldCreature, type WorldCreatureRow } from "../multiplayer/supabaseWorldCreatures";\n',
  'import { applyWorldCreatureDamage, fetchWorldCreatures, rowToCreature, seedMissingWorldCreatures, updateWorldCreaturePositions, upsertWorldCreature, type WorldCreatureRow } from "../multiplayer/supabaseWorldCreatures";\n',
  'position sync import base',
);

replaceOnce(
  'import { applyWorldCreatureDamage, fetchWorldCreatures, rowToCreature, seedMissingWorldCreatures, upsertWorldCreature, type WorldCreatureRow } from "../multiplayer/supabaseWorldCreatures";\nimport { getSupabaseClient, isSupabaseMultiplayerEnabled } from "../multiplayer/supabaseMultiplayer";\n',
  'import { applyWorldCreatureDamage, fetchWorldCreatures, rowToCreature, seedMissingWorldCreatures, updateWorldCreaturePositions, upsertWorldCreature, type WorldCreatureRow } from "../multiplayer/supabaseWorldCreatures";\nimport { getCurrentMultiplayerPlayerId, getSupabaseClient, isCurrentPlayerWorldHost, isSupabaseMultiplayerEnabled } from "../multiplayer/supabaseMultiplayer";\n',
  'position sync import with host election',
);

replaceOnce(
  '  const supabaseClientRef = useRef(getSupabaseClient());\n',
  '  const supabaseClientRef = useRef(getSupabaseClient());\n  const creaturePositionHostRef = useRef(false);\n  const lastCreaturePositionPublishAtRef = useRef(0);\n  const lastCreatureHostCheckAtRef = useRef(0);\n',
  'host refs',
);

replaceOnce(
  '      creaturePositionHostRef.current = rowsBeforeSeed.length <= 0;\n      if (rowsBeforeSeed.length <= 0) await seedMissingWorldCreatures(client, demoCreaturesRef.current);\n      const rows = await fetchWorldCreatures(client, null);',
  '      if (rowsBeforeSeed.length <= 0) await seedMissingWorldCreatures(client, demoCreaturesRef.current);\n      creaturePositionHostRef.current = await isCurrentPlayerWorldHost(client, getCurrentMultiplayerPlayerId(), demoTileRef.current);\n      const rows = await fetchWorldCreatures(client, null);',
  'host election after seed',
);

replaceOnce(
  '      if (creaturePositionHostRef.current) {\n        moveDemoCreatures(getCurrentCreatures(), deltaSeconds, now, demoPositionRef.current);\n        const client = supabaseClientRef.current;\n        if (client && isSupabaseMultiplayerEnabled() && now - lastCreaturePositionPublishAtRef.current >= 350) {\n          lastCreaturePositionPublishAtRef.current = now;\n          void updateWorldCreaturePositions(client, getCurrentCreatures());\n        }\n      }\n      applyDemoSnapshot(false);',
  '      const client = supabaseClientRef.current;\n      if (client && isSupabaseMultiplayerEnabled() && now - lastCreatureHostCheckAtRef.current >= 2500) {\n        lastCreatureHostCheckAtRef.current = now;\n        void isCurrentPlayerWorldHost(client, getCurrentMultiplayerPlayerId(), demoTileRef.current).then((isHost) => { creaturePositionHostRef.current = isHost; });\n      }\n      if (creaturePositionHostRef.current) {\n        moveDemoCreatures(getCurrentCreatures(), deltaSeconds, now, demoPositionRef.current);\n        if (client && isSupabaseMultiplayerEnabled() && now - lastCreaturePositionPublishAtRef.current >= 350) {\n          lastCreaturePositionPublishAtRef.current = now;\n          void updateWorldCreaturePositions(client, getCurrentCreatures());\n        }\n      }\n      applyDemoSnapshot(false);',
  'presence-elected creature movement publish',
);

if (changed) fs.writeFileSync(target, source);
else console.log('[patch-supabase-creature-position-host] no changes');
