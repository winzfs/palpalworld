const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'src', 'features', 'game', 'GameClientTileDemoStation.tsx');
let s = fs.readFileSync(target, 'utf8');
const before = s;
const tag = '[patch-creature-db-persist-direct]';
const log = (m) => console.log(`${tag} ${m}`);

if (!s.includes('from "../multiplayer/supabaseMultiplayer"')) {
  s = s.replace('import { LogPanel } from "../logs/LogPanel";\n', 'import { LogPanel } from "../logs/LogPanel";\nimport { getSupabaseClient, isSupabaseMultiplayerEnabled } from "../multiplayer/supabaseMultiplayer";\n');
  log('supabase import');
}
if (!s.includes('from "../multiplayer/supabaseWorldCreatures"')) {
  s = s.replace('import { LogPanel } from "../logs/LogPanel";\n', 'import { LogPanel } from "../logs/LogPanel";\nimport { fetchWorldCreatures, rowToCreature, seedMissingWorldCreatures, updateWorldCreaturePositions } from "../multiplayer/supabaseWorldCreatures";\n');
  log('creature db import');
}

const refAnchor = '  const lastUiSnapshotAtRef = useRef(0);\n';
if (s.includes(refAnchor) && !s.includes('directCreatureDbHydratedRef')) {
  s = s.replace(refAnchor, refAnchor + '  const directCreatureDbHydratedRef = useRef(false);\n  const directCreatureDbBusyRef = useRef(false);\n');
  log('refs');
}

const anchor = '  useEffect(() => {\n    const handleInventoryChanged = (event: Event) => {';
const effect = `  useEffect(() => {
    const client = getSupabaseClient();
    if (!client || !isSupabaseMultiplayerEnabled()) return;
    let disposed = false;
    const hydrateOnce = async () => {
      const rows = await fetchWorldCreatures(client, demoTileRef.current);
      if (disposed) return;
      const alive = rows.filter((row) => !row.defeated && row.hp > 0);
      if (alive.length > 0) {
        demoCreaturesRef.current = alive.map(rowToCreature);
        demoTileIndexRef.current = createDemoTileIndex(demoResourcesRef.current, demoCreaturesRef.current, demoBuildingsRef.current);
        applyDemoSnapshot(true);
      } else {
        await seedMissingWorldCreatures(client, getCurrentCreatures());
      }
      directCreatureDbHydratedRef.current = true;
    };
    const tick = async () => {
      if (disposed || directCreatureDbBusyRef.current) return;
      directCreatureDbBusyRef.current = true;
      try {
        if (!directCreatureDbHydratedRef.current) await hydrateOnce();
        if (!disposed) await updateWorldCreaturePositions(client, getCurrentCreatures());
      } finally {
        directCreatureDbBusyRef.current = false;
      }
    };
    void tick();
    const timer = window.setInterval(() => { void tick(); }, 800);
    return () => { disposed = true; window.clearInterval(timer); };
  }, [applyDemoSnapshot, getCurrentCreatures]);

`;
if (s.includes(anchor) && !s.includes('const hydrateOnce = async () => {')) {
  s = s.replace(anchor, effect + anchor);
  log('effect');
}

if (s !== before) fs.writeFileSync(target, s);
else log('no changes');

require('./patch-creature-nonhost-no-move.cjs');
