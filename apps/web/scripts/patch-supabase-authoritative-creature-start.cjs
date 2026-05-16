const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'src', 'features', 'game', 'GameClientTileDemoStation.tsx');
let source = fs.readFileSync(target, 'utf8');
let changed = false;

function replaceOnce(search, replacement, label) {
  if (source.includes(replacement)) return;
  if (!source.includes(search)) {
    console.log(`[patch-supabase-authoritative-creature-start] skipped ${label}`);
    return;
  }
  source = source.replace(search, replacement);
  changed = true;
  console.log(`[patch-supabase-authoritative-creature-start] patched ${label}`);
}

replaceOnce(
  '  const demoCreaturesRef = useRef<CreaturePublicState[]>(createTileBasedDemoCreatures());',
  '  const demoCreaturesRef = useRef<CreaturePublicState[]>(isSupabaseMultiplayerEnabled() ? [] : createTileBasedDemoCreatures());',
  'supabase authoritative initial creatures',
);

if (changed) fs.writeFileSync(target, source);
else console.log('[patch-supabase-authoritative-creature-start] no changes');
