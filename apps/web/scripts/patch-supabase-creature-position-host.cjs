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
  'position sync import',
);

replaceOnce(
  '  const supabaseClientRef = useRef(getSupabaseClient());\n',
  '  const supabaseClientRef = useRef(getSupabaseClient());\n  const creaturePositionHostRef = useRef(false);\n  const lastCreaturePositionPublishAtRef = useRef(0);\n',
  'host refs',
);

replaceOnce(
  '      if (rowsBeforeSeed.length <= 0) await seedMissingWorldCreatures(client, demoCreaturesRef.current);\n      const rows = await fetchWorldCreatures(client, null);',
  '      creaturePositionHostRef.current = rowsBeforeSeed.length <= 0;\n      if (rowsBeforeSeed.length <= 0) await seedMissingWorldCreatures(client, demoCreaturesRef.current);\n      const rows = await fetchWorldCreatures(client, null);',
  'host election on empty world',
);

replaceOnce(
  '      // Supabase 월드 동기화 기준을 맞추기 위해 클라이언트별 로컬 몬스터 AI 이동은 중지한다.\n      // 몬스터 위치는 다음 단계에서 Supabase world_creatures 좌표를 권위 소스로 적용한다.\n      applyDemoSnapshot(false);',
  '      if (creaturePositionHostRef.current) {\n        moveDemoCreatures(getCurrentCreatures(), deltaSeconds, now, demoPositionRef.current);\n        const client = supabaseClientRef.current;\n        if (client && isSupabaseMultiplayerEnabled() && now - lastCreaturePositionPublishAtRef.current >= 350) {\n          lastCreaturePositionPublishAtRef.current = now;\n          void updateWorldCreaturePositions(client, getCurrentCreatures());\n        }\n      }\n      applyDemoSnapshot(false);',
  'host-only creature movement publish',
);

if (changed) fs.writeFileSync(target, source);
else console.log('[patch-supabase-creature-position-host] no changes');
