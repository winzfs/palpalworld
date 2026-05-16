const fs = require('fs');
const path = require('path');
const f = path.join(__dirname, '..', 'src', 'features', 'game', 'GameClientTileDemoStation.tsx');
let s = fs.readFileSync(f, 'utf8');
let c = false;
function r(a,b,n){ if(s.includes(b)) return; if(!s.includes(a)){ console.log('[patch-force-creature-db-hydrate] skip '+n); return; } s=s.replace(a,b); c=true; console.log('[patch-force-creature-db-hydrate] patch '+n); }
function insertBefore(a,b,n){ if(s.includes(b)) return; if(!s.includes(a)){ console.log('[patch-force-creature-db-hydrate] skip '+n); return; } s=s.replace(a,b+a); c=true; console.log('[patch-force-creature-db-hydrate] patch '+n); }

r('import { PixiGameCanvas } from "./pixi/PixiGameCanvas";\n', 'import { PixiGameCanvas } from "./pixi/PixiGameCanvas";\nimport { fetchWorldCreatures, rowToCreature } from "../multiplayer/supabaseWorldCreatures";\nimport { getSupabaseClient, isSupabaseMultiplayerEnabled } from "../multiplayer/supabaseMultiplayer";\n', 'imports');

const effect = '  useEffect(() => {\n    const client = getSupabaseClient();\n    if (!client || !isSupabaseMultiplayerEnabled()) return;\n    let stopped = false;\n    const load = async () => {\n      const rows = await fetchWorldCreatures(client, demoTileRef.current);\n      if (stopped || rows.length <= 0) return;\n      demoCreaturesRef.current = rows.map(rowToCreature);\n      demoTileIndexRef.current = createDemoTileIndex(demoResourcesRef.current, demoCreaturesRef.current, demoBuildingsRef.current);\n      applyDemoSnapshot(true);\n    };\n    void load();\n    return () => { stopped = true; };\n  }, [applyDemoSnapshot]);\n';

r('  useEffect(() => { setNickname(createClientNickname()); commitInventory(readStoredInventory(createDemoInventory())); }, [commitInventory]);\n', '  useEffect(() => { setNickname(createClientNickname()); commitInventory(readStoredInventory(createDemoInventory())); }, [commitInventory]);\n' + effect, 'direct hydrate effect after inventory');
insertBefore('  const handleDemoInteract = useCallback(() => {', effect, 'direct hydrate effect before demo interact');

s = s.replace(/\s*const forceHydrateClientRef = useRef\(getSupabaseClient\(\)\);\n/g, '\n');
s = s.replace(/forceHydrateClientRef\.current/g, 'getSupabaseClient()');
s = s.replace(/supabaseClientRef\.current/g, 'getSupabaseClient()');
s = s.replace(/\s*const id = window\.setInterval\(load, 2500\);\n\s*return \(\) => \{ stopped = true; window\.clearInterval\(id\); \};/g, '\n    return () => { stopped = true; };');

function mergeImports(modulePath) {
  const pattern = new RegExp('import \\{([^}]+)\\} from "' + modulePath.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&') + '";\\n', 'g');
  const matches = [...s.matchAll(pattern)];
  if (matches.length <= 1) return;
  const names = [];
  const seen = new Set();
  for (const match of matches) {
    for (const raw of match[1].split(',')) {
      const name = raw.trim();
      if (!name || seen.has(name)) continue;
      seen.add(name);
      names.push(name);
    }
  }
  s = s.replace(pattern, '');
  const merged = 'import { ' + names.join(', ') + ' } from "' + modulePath + '";\n';
  const anchor = 'import { PixiGameCanvas } from "./pixi/PixiGameCanvas";\n';
  s = s.includes(anchor) ? s.replace(anchor, anchor + merged) : merged + s;
  c = true;
  console.log('[patch-force-creature-db-hydrate] merged ' + modulePath);
}

mergeImports('../multiplayer/supabaseMultiplayer');
mergeImports('../multiplayer/supabaseWorldCreatures');
mergeImports('../multiplayer/supabaseCreatureBroadcast');

if(c || s !== fs.readFileSync(f, 'utf8')) fs.writeFileSync(f,s);
else console.log('[patch-force-creature-db-hydrate] no changes');
