const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'src', 'features', 'game', 'GameClientTileDemoStation.tsx');
let s = fs.readFileSync(target, 'utf8');
const before = s;
const tag = '[patch-remote-creatures-into-demo-world]';

function log(message) { console.log(`${tag} ${message}`); }

if (!s.includes('from "../multiplayer/supabaseWorldCreatures"')) {
  s = s.replace(
    'import { LogPanel } from "../logs/LogPanel";\n',
    'import { LogPanel } from "../logs/LogPanel";\nimport { rowToCreature, type WorldCreatureRow } from "../multiplayer/supabaseWorldCreatures";\n',
  );
  log('added creature row import');
} else if (!s.includes('WorldCreatureRow')) {
  s = s.replace(
    'from "../multiplayer/supabaseWorldCreatures";',
    ', type WorldCreatureRow } from "../multiplayer/supabaseWorldCreatures";',
  ).replace('{ fetchWorldCreatures, rowToCreature,', '{ fetchWorldCreatures, rowToCreature,');
  log('added WorldCreatureRow type import');
}

const effectAnchor = '  useEffect(() => { setNickname(createClientNickname()); commitInventory(readStoredInventory(createDemoInventory())); }, [commitInventory]);\n';
const effect = `  useEffect(() => {
    const handleRemoteCreatures = (event: Event) => {
      const customEvent = event as CustomEvent<{ rows?: WorldCreatureRow[] }>;
      const rows = customEvent.detail?.rows ?? [];
      const alive = rows.filter((row) => !row.defeated && row.hp > 0);
      if (alive.length <= 0) return;
      demoCreaturesRef.current = alive.map(rowToCreature);
      demoTileIndexRef.current = createDemoTileIndex(demoResourcesRef.current, demoCreaturesRef.current, demoBuildingsRef.current);
      applyDemoSnapshot(true);
    };
    window.addEventListener("palpalworld:remote-creatures", handleRemoteCreatures);
    return () => window.removeEventListener("palpalworld:remote-creatures", handleRemoteCreatures);
  }, [applyDemoSnapshot]);
`;

if (s.includes(effectAnchor) && !s.includes('palpalworld:remote-creatures", handleRemoteCreatures')) {
  s = s.replace(effectAnchor, effectAnchor + effect);
  log('added remote creatures listener');
}

if (s !== before) fs.writeFileSync(target, s);
else log('no changes');
