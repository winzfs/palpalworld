const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'features', 'game', 'GameClientTileDemoStation.tsx');
let source = fs.readFileSync(filePath, 'utf8');
let changed = false;

function replaceOnce(search, replacement, label) {
  if (source.includes(replacement)) return true;
  if (!source.includes(search)) {
    console.log(`[patch-demo-creature-hp-normalize] skipped ${label}`);
    return false;
  }
  source = source.replace(search, replacement);
  changed = true;
  console.log(`[patch-demo-creature-hp-normalize] patched ${label}`);
  return true;
}

if (!source.includes('function normalizeDemoCreatureHpForCurrentBalance(')) {
  replaceOnce(
    'function createDemoSnapshot(nickname: string, position: Vector2, direction: Direction, currentTile: MapTileRef, resources: ResourceNodeState[], creatures: CreaturePublicState[], buildings: BuildingState[]): WorldSnapshot {',
    'function normalizeDemoCreatureHpForCurrentBalance(creatures: CreaturePublicState[]) {\n  for (const creature of creatures) {\n    if (creature.hp <= 0) continue;\n    if (creature.hp >= creature.maxHp) continue;\n    const hpRatio = creature.maxHp > 0 ? creature.hp / creature.maxHp : 1;\n    // Existing demo creatures can keep old low HP after a balance migration.\n    // If they look almost empty after max HP changes, refill them once so hit effects can be tested clearly.\n    if (hpRatio < 0.5) creature.hp = creature.maxHp;\n  }\n}\nfunction createDemoSnapshot(nickname: string, position: Vector2, direction: Direction, currentTile: MapTileRef, resources: ResourceNodeState[], creatures: CreaturePublicState[], buildings: BuildingState[]): WorldSnapshot {',
    'normalize helper',
  );
}

if (!source.includes('normalizeDemoCreatureHpForCurrentBalance(demoCreaturesRef.current);')) {
  replaceOnce(
    '  const demoCreaturesRef = useRef<CreaturePublicState[]>(createTileBasedDemoCreatures());\n  const demoBuildingsRef = useRef<BuildingState[]>(createTileBasedDemoBuildings());',
    '  const demoCreaturesRef = useRef<CreaturePublicState[]>(createTileBasedDemoCreatures());\n  normalizeDemoCreatureHpForCurrentBalance(demoCreaturesRef.current);\n  const demoBuildingsRef = useRef<BuildingState[]>(createTileBasedDemoBuildings());',
    'normalize demo creatures after ref init',
  );
}

if (changed) fs.writeFileSync(filePath, source);
else console.log('[patch-demo-creature-hp-normalize] no changes');
