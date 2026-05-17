const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'src', 'features', 'game', 'GameClientTileDemoStation.tsx');
let s = fs.readFileSync(target, 'utf8');
const before = s;
const tag = '[patch-creature-db-persist-safe]';

const unsafeSave = '        if (!disposed) await updateWorldCreaturePositions(client, getCurrentCreatures());';
const safeSave = '        if (!disposed && directCreatureDbHydratedRef.current && isCreatureHostRef.current) await updateWorldCreaturePositions(client, getCurrentCreatures());';
if (s.includes(unsafeSave)) {
  s = s.replaceAll(unsafeSave, safeSave);
  console.log(`${tag} guarded DB save until hydrated host`);
}

const fallbackSeed = '        await seedMissingWorldCreatures(client, fallbackCreatures);';
const hostFallbackSeed = '        if (isCreatureHostRef.current) await seedMissingWorldCreatures(client, fallbackCreatures);';
if (s.includes(fallbackSeed)) {
  s = s.replaceAll(fallbackSeed, hostFallbackSeed);
  console.log(`${tag} guarded fallback seed to host only`);
}

if (s !== before) fs.writeFileSync(target, s);
else console.log(`${tag} no changes`);
