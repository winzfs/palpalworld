const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'src', 'features', 'game', 'GameClientTileDemoStation.tsx');
let s = fs.readFileSync(target, 'utf8');
const before = s;
const tag = '[patch-creature-db-authoritative-loop]';

s = s.replace(
  'import { attackWorldCreature, seedMissingWorldCreatures, updateWorldCreaturePositions, upsertWorldCreature } from "../multiplayer/supabaseWorldCreatures";',
  'import { attackWorldCreature, fetchWorldCreatures, rowToCreature, seedMissingWorldCreatures, updateWorldCreaturePositions, upsertWorldCreature } from "../multiplayer/supabaseWorldCreatures";',
);

const refAnchor = '  const lastUiSnapshotAtRef = useRef(0);\n';
if (s.includes(refAnchor) && !s.includes('creatureDbHydratedRef')) {
  s = s.replace(refAnchor, refAnchor + '  const creatureDbHydratedRef = useRef(false);\n  const creatureDbSyncBusyRef = useRef(false);\n');
  console.log(`${tag} refs`);
}

const effectAnchor = '  useEffect(() => {\n    const handleInventoryChanged = (event: Event) => {';
const effect = `  useEffect(() => {
    const client = supabaseClientRef.current;
    if (!client || !isSupabaseMultiplayerEnabled()) return;
    let disposed = false;
    const applyRows = async () => {
      const rows = await fetchWorldCreatures(client, demoTileRef.current);
      if (disposed) return false;
      const alive = rows.filter((row) => !row.defeated && row.hp > 0);
      if (alive.length <= 0) return false;
      demoCreaturesRef.current = alive.map(rowToCreature);
      demoTileIndexRef.current = createDemoTileIndex(demoResourcesRef.current, demoCreaturesRef.current, demoBuildingsRef.current);
      applyDemoSnapshot(true);
      return true;
    };
    const tick = async () => {
      if (disposed || creatureDbSyncBusyRef.current) return;
      creatureDbSyncBusyRef.current = true;
      try {
        const playerId = getCurrentMultiplayerPlayerId();
        const host = await claimWorldHost(client, playerId, demoTileRef.current);
        if (disposed) return;
        isCreatureHostRef.current = host.isHost;
        if (!creatureDbHydratedRef.current) {
          const restored = await applyRows();
          if (!restored && getCurrentCreatures().length > 0) await seedMissingWorldCreatures(client, getCurrentCreatures());
          creatureDbHydratedRef.current = true;
        }
        if (host.isHost) await updateWorldCreaturePositions(client, getCurrentCreatures());
        else await applyRows();
      } finally {
        creatureDbSyncBusyRef.current = false;
      }
    };
    void tick();
    const timer = window.setInterval(() => { void tick(); }, 800);
    return () => { disposed = true; window.clearInterval(timer); };
  }, [applyDemoSnapshot, getCurrentCreatures]);

`;
if (s.includes(effectAnchor) && !s.includes('const applyRows = async () => {')) {
  s = s.replace(effectAnchor, effect + effectAnchor);
  console.log(`${tag} effect`);
}

if (s !== before) fs.writeFileSync(target, s);
else console.log(`${tag} no changes`);
