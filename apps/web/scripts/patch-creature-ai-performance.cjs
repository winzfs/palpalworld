const fs = require("fs");
const path = require("path");

const clientPath = path.join(__dirname, "..", "src", "features", "game", "GameClientTileDemoStation.tsx");
let client = fs.readFileSync(clientPath, "utf8");
let changed = false;

function replaceOnce(search, replacement, label) {
  if (client.includes(replacement)) {
    console.log(`[patch-creature-ai-performance] already-patched ${label}`);
    return;
  }
  if (!client.includes(search)) {
    console.log(`[patch-creature-ai-performance] skipped ${label}`);
    return;
  }
  client = client.replace(search, replacement);
  changed = true;
  console.log(`[patch-creature-ai-performance] patched ${label}`);
}

function replaceRegex(regex, replacement, label) {
  if (client.includes(replacement)) {
    console.log(`[patch-creature-ai-performance] already-patched ${label}`);
    return;
  }
  if (!regex.test(client)) {
    console.log(`[patch-creature-ai-performance] skipped ${label}`);
    return;
  }
  client = client.replace(regex, replacement);
  changed = true;
  console.log(`[patch-creature-ai-performance] patched ${label}`);
}

const spatialHelpers = `
type CreatureSpatialIndex = Map<string, CreaturePublicState[]>;
const creatureSpatialCellSize = 220;
function getCreatureSpatialKey(x: number, y: number) {
  return \`\${Math.floor(x / creatureSpatialCellSize)}:\${Math.floor(y / creatureSpatialCellSize)}\`;
}
function createCreatureSpatialIndex(creatures: CreaturePublicState[]): CreatureSpatialIndex {
  const index: CreatureSpatialIndex = new Map();
  for (const creature of creatures) {
    if (creature.hp <= 0) continue;
    const key = getCreatureSpatialKey(creature.position.x, creature.position.y);
    const bucket = index.get(key);
    if (bucket) bucket.push(creature);
    else index.set(key, [creature]);
  }
  return index;
}
function getNearbyCreatureCandidates(index: CreatureSpatialIndex | null, creature: CreaturePublicState, fallback: CreaturePublicState[]) {
  if (!index) return fallback;
  const cx = Math.floor(creature.position.x / creatureSpatialCellSize);
  const cy = Math.floor(creature.position.y / creatureSpatialCellSize);
  const candidates: CreaturePublicState[] = [];
  for (let y = cy - 1; y <= cy + 1; y += 1) {
    for (let x = cx - 1; x <= cx + 1; x += 1) {
      const bucket = index.get(\`\${x}:\${y}\`);
      if (bucket) candidates.push(...bucket);
    }
  }
  return candidates;
}
function shouldUpdateCreatureThisFrame(creature: CreaturePublicState, playerPosition: Vector2, now: number) {
  const distance = Math.hypot(creature.position.x - playerPosition.x, creature.position.y - playerPosition.y);
  if (distance < 520) return true;
  const phase = Math.floor(now / 66) + hashId(creature.id);
  if (distance < 980) return phase % 2 === 0;
  if (distance < 1500) return phase % 3 === 0;
  return phase % 4 === 0;
}`;

replaceOnce(
  "function getSeparationVector(creature: CreaturePublicState, creatures: CreaturePublicState[]) {",
  `${spatialHelpers}
function getSeparationVector(creature: CreaturePublicState, creatures: CreaturePublicState[]) {`,
  "creature spatial helpers",
);

replaceRegex(
  /function getSeparationVector\(creature: CreaturePublicState, creatures: CreaturePublicState\[\]\) \{[\s\S]*?\n\}/,
  `function getSeparationVector(creature: CreaturePublicState, creatures: CreaturePublicState[]) {
  let pushX = 0;
  let pushY = 0;
  let count = 0;
  const maxChecks = creatures.length > 32 ? 14 : creatures.length;
  let checked = 0;
  for (const other of creatures) {
    if (other.id === creature.id || other.hp <= 0) continue;
    checked += 1;
    if (checked > maxChecks) break;
    const dx = creature.position.x - other.position.x;
    const dy = creature.position.y - other.position.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= 0 || distance > 180) continue;
    const strength = ((180 - distance) / 180) ** 1.35;
    pushX += (dx / distance) * strength;
    pushY += (dy / distance) * strength;
    count += 1;
    if (count >= 6) break;
  }
  return count > 0 ? { x: pushX / count, y: pushY / count } : { x: 0, y: 0 };
}`,
  "bounded separation calculation",
);

replaceOnce(
  "function moveDemoCreatures(creatures: CreaturePublicState[], deltaSeconds: number, now: number, playerPosition: Vector2, buildParts: PlacedBuildPart[] = []) {\n  for (const creature of creatures) {",
  "function moveDemoCreatures(creatures: CreaturePublicState[], deltaSeconds: number, now: number, playerPosition: Vector2, buildParts: PlacedBuildPart[] = []) {\n  const creatureIndex = creatures.length > 18 ? createCreatureSpatialIndex(creatures) : null;\n  for (const creature of creatures) {",
  "movement spatial index",
);

replaceOnce(
  "    if (creature.hp <= 0) continue;\n    const target = getWanderTarget(creature, now);",
  "    if (creature.hp <= 0) continue;\n    if (!shouldUpdateCreatureThisFrame(creature, playerPosition, now)) continue;\n    const target = getWanderTarget(creature, now);",
  "distributed creature updates",
);

replaceOnce(
  "    const separation = getSeparationVector(creature, creatures);",
  "    const separation = getSeparationVector(creature, getNearbyCreatureCandidates(creatureIndex, creature, creatures));",
  "nearby separation candidates",
);

if (changed) fs.writeFileSync(clientPath, client);
