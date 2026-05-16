const fs = require('fs');
const path = require('path');
const f = path.join(__dirname, '..', 'src', 'features', 'game', 'GameClientTileDemoStation.tsx');
let s = fs.readFileSync(f, 'utf8');
let c = false;
function r(a,b,n){ if(s.includes(b)) return; if(!s.includes(a)){ console.log('[patch-force-creature-db-hydrate] skip '+n); return; } s=s.replace(a,b); c=true; console.log('[patch-force-creature-db-hydrate] patch '+n); }
function insertBefore(a,b,n){ if(s.includes(b)) return; if(!s.includes(a)){ console.log('[patch-force-creature-db-hydrate] skip '+n); return; } s=s.replace(a,b+a); c=true; console.log('[patch-force-creature-db-hydrate] patch '+n); }

r('import { PixiGameCanvas } from "./pixi/PixiGameCanvas";\n', 'import { PixiGameCanvas } from "./pixi/PixiGameCanvas";\nimport { fetchWorldCreatures, rowToCreature } from "../multiplayer/supabaseWorldCreatures";\nimport { getSupabaseClient, isSupabaseMultiplayerEnabled } from "../multiplayer/supabaseMultiplayer";\n', 'imports');
r('  const lastUiSnapshotAtRef = useRef(0);\n', '  const lastUiSnapshotAtRef = useRef(0);\n  const forceHydrateClientRef = useRef(getSupabaseClient());\n', 'client ref');

const effect = '  useEffect(() => {\n    const client = forceHydrateClientRef.current;\n    if (!client || !isSupabaseMultiplayerEnabled()) return;\n    let stopped = false;\n    const load = async () => {\n      const rows = await fetchWorldCreatures(client, demoTileRef.current);\n      if (stopped || rows.length <= 0) return;\n      demoCreaturesRef.current = rows.map(rowToCreature);\n      demoTileIndexRef.current = createDemoTileIndex(demoResourcesRef.current, demoCreaturesRef.current, demoBuildingsRef.current);\n      applyDemoSnapshot(true);\n    };\n    void load();\n    const id = window.setInterval(load, 2500);\n    return () => { stopped = true; window.clearInterval(id); };\n  }, [applyDemoSnapshot]);\n';

r('  useEffect(() => { setNickname(createClientNickname()); commitInventory(readStoredInventory(createDemoInventory())); }, [commitInventory]);\n', '  useEffect(() => { setNickname(createClientNickname()); commitInventory(readStoredInventory(createDemoInventory())); }, [commitInventory]);\n' + effect, 'direct hydrate effect after inventory');
insertBefore('  const handleInteract = useCallback(() => {', effect, 'direct hydrate effect before handlers');

if(c) fs.writeFileSync(f,s);
else console.log('[patch-force-creature-db-hydrate] no changes');
require('./patch-existing-client-import-merge-final.cjs');
