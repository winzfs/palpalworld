const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'src', 'features', 'game', 'GameClientTileDemoStation.tsx');
let s = fs.readFileSync(target, 'utf8');
const before = s;
const tag = '[patch-creature-nonhost-no-move]';

const oldLine = '      moveDemoCreatures(getCurrentCreatures(), deltaSeconds, now, demoPositionRef.current);';
const newLine = '      if (!isSupabaseMultiplayerEnabled() || isCreatureHostRef.current) moveDemoCreatures(getCurrentCreatures(), deltaSeconds, now, demoPositionRef.current);';

if (s.includes(oldLine) && !s.includes(newLine)) {
  s = s.replace(oldLine, newLine);
  console.log(`${tag} guarded local creature movement`);
} else if (s.includes(newLine)) {
  console.log(`${tag} already guarded`);
} else {
  console.log(`${tag} movement line not found`);
}

if (s !== before) fs.writeFileSync(target, s);

require('./patch-creature-rescue-visible.cjs');
