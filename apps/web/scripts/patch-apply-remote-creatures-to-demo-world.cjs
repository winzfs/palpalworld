const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'src', 'features', 'game', 'GameClientTileDemoStation.tsx');
let source = fs.readFileSync(target, 'utf8');
let changed = false;

function replaceOnce(search, replacement, label) {
  if (source.includes(replacement)) {
    console.log(`[patch-apply-remote-creatures-to-demo-world] already patched ${label}`);
    return;
  }
  if (!source.includes(search)) {
    console.log(`[patch-apply-remote-creatures-to-demo-world] skipped ${label}`);
    return;
  }
  source = source.replace(search, replacement);
  changed = true;
  console.log(`[patch-apply-remote-creatures-to-demo-world] patched ${label}`);
}

replaceOnce(
  'import { PixiGameCanvas } from "./pixi/PixiGameCanvas";\n',
  'import { PixiGameCanvas } from "./pixi/PixiGameCanvas";\nimport { rowToCreature, type WorldCreatureRow } from "../multiplayer/supabaseWorldCreatures";\n',
  'remote creature imports',
);

replaceOnce(
  '  useEffect(() => { setNickname(createClientNickname()); commitInventory(readStoredInventory(createDemoInventory())); }, [commitInventory]);\n',
  '  useEffect(() => { setNickname(createClientNickname()); commitInventory(readStoredInventory(createDemoInventory())); }, [commitInventory]);\n  useEffect(() => {\n    const handleRemoteCreatures = (event: Event) => {\n      const rows = ((event as CustomEvent<{ rows?: WorldCreatureRow[] }>).detail?.rows ?? []);\n      if (rows.length === 0) return;\n      const byId = new Map(demoCreaturesRef.current.map((creature) => [creature.id, creature]));\n      let changed = false;\n      for (const row of rows) {\n        const remoteCreature = rowToCreature(row);\n        const existing = byId.get(remoteCreature.id);\n        if (existing) {\n          existing.speciesId = remoteCreature.speciesId;\n          existing.level = remoteCreature.level;\n          existing.currentTile = { ...(remoteCreature as any).currentTile };\n          existing.hp = remoteCreature.hp;\n          existing.maxHp = remoteCreature.maxHp;\n          existing.traitIds = [...remoteCreature.traitIds];\n        } else {\n          demoCreaturesRef.current.push(remoteCreature);\n          byId.set(remoteCreature.id, remoteCreature);\n        }\n        changed = true;\n      }\n      if (!changed) return;\n      demoTileIndexRef.current = createDemoTileIndex(demoResourcesRef.current, demoCreaturesRef.current, demoBuildingsRef.current);\n      applyDemoSnapshot(true);\n    };\n    window.addEventListener("palpalworld:remote-creatures", handleRemoteCreatures);\n    return () => window.removeEventListener("palpalworld:remote-creatures", handleRemoteCreatures);\n  }, [applyDemoSnapshot]);\n',
  'remote creature event listener without DB position overwrite',
);

if (changed) fs.writeFileSync(target, source);
else console.log('[patch-apply-remote-creatures-to-demo-world] no changes');
