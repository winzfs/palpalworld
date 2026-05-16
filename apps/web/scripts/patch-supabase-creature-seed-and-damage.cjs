const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'src', 'features', 'game', 'GameClientTileDemoStation.tsx');
let source = fs.readFileSync(target, 'utf8');
let changed = false;

function replaceOnce(search, replacement, label) {
  if (source.includes(replacement)) {
    console.log(`[patch-supabase-creature-seed-and-damage] already patched ${label}`);
    return;
  }
  if (!source.includes(search)) {
    console.log(`[patch-supabase-creature-seed-and-damage] skipped ${label}`);
    return;
  }
  source = source.replace(search, replacement);
  changed = true;
  console.log(`[patch-supabase-creature-seed-and-damage] patched ${label}`);
}

replaceOnce(
  'import { rowToCreature, type WorldCreatureRow } from "../multiplayer/supabaseWorldCreatures";\n',
  'import { applyWorldCreatureDamage, rowToCreature, seedMissingWorldCreatures, upsertWorldCreature, type WorldCreatureRow } from "../multiplayer/supabaseWorldCreatures";\nimport { getSupabaseClient, isSupabaseMultiplayerEnabled } from "../multiplayer/supabaseMultiplayer";\n',
  'supabase creature authority imports',
);

replaceOnce(
  '  const lastUiSnapshotAtRef = useRef(0);\n',
  '  const lastUiSnapshotAtRef = useRef(0);\n  const supabaseClientRef = useRef(getSupabaseClient());\n',
  'supabase client ref',
);

replaceOnce(
  '  useEffect(() => { setNickname(createClientNickname()); commitInventory(readStoredInventory(createDemoInventory())); }, [commitInventory]);\n',
  '  useEffect(() => { setNickname(createClientNickname()); commitInventory(readStoredInventory(createDemoInventory())); }, [commitInventory]);\n  useEffect(() => {\n    const client = supabaseClientRef.current;\n    if (!client || !isSupabaseMultiplayerEnabled()) return;\n    void seedMissingWorldCreatures(client, demoCreaturesRef.current);\n  }, []);\n',
  'seed creatures on start',
);

replaceOnce(
  '    target.hp = Math.max(0, target.hp - 18);\n    if (target.hp <= 0) { updateInventory((current) => addInventoryStack(current, "pal_essence", 1)); setChatLines((prev) => [...prev.slice(-5), `[demo] ${target.speciesId} 처치! 펄 정수 획득`]); }\n    else setChatLines((prev) => [...prev.slice(-5), `[demo] ${target.speciesId}에게 18 피해`]);\n    applyDemoSnapshot(true);',
  '    target.hp = Math.max(0, target.hp - 18);\n    const client = supabaseClientRef.current;\n    if (client && isSupabaseMultiplayerEnabled()) void applyWorldCreatureDamage(client, { ...target, hp: target.hp + 18 } as CreaturePublicState, 18);\n    if (target.hp <= 0) { updateInventory((current) => addInventoryStack(current, "pal_essence", 1)); setChatLines((prev) => [...prev.slice(-5), `[world] ${target.speciesId} 처치! 펄 정수 획득`]); }\n    else setChatLines((prev) => [...prev.slice(-5), `[world] ${target.speciesId}에게 18 피해`]);\n    applyDemoSnapshot(true);',
  'persist attack damage to supabase',
);

replaceOnce(
  '    if (success) { const liveCreature = getCurrentCreatures().find((candidate) => candidate.id === creature.id); if (liveCreature) liveCreature.hp = 0; setChatLines((prev) => [...prev.slice(-5), `[capture] ${getPetSpeciesDefinition(creature.speciesId).name} 포획 성공!`]); }',
  '    if (success) { const liveCreature = getCurrentCreatures().find((candidate) => candidate.id === creature.id); if (liveCreature) { liveCreature.hp = 0; const client = supabaseClientRef.current; if (client && isSupabaseMultiplayerEnabled()) void upsertWorldCreature(client, liveCreature); } setChatLines((prev) => [...prev.slice(-5), `[capture] ${getPetSpeciesDefinition(creature.speciesId).name} 포획 성공!`]); }',
  'persist capture defeat to supabase',
);

if (changed) fs.writeFileSync(target, source);
else console.log('[patch-supabase-creature-seed-and-damage] no changes');
