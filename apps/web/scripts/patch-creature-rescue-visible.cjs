const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'src', 'features', 'game', 'GameClientTileDemoStation.tsx');
let s = fs.readFileSync(target, 'utf8');
const before = s;
const tag = '[patch-creature-rescue-visible]';

const clearLine = '    demoCreaturesRef.current = [];\n    creatureBroadcastTargetsRef.current.clear();';
const keepLine = '    // Keep local creatures visible until DB or host snapshot arrives.\n    creatureBroadcastTargetsRef.current.clear();';
if (s.includes(clearLine)) {
  s = s.replace(clearLine, keepLine);
  console.log(`${tag} removed startup creature clear`);
}

const rescueAnchor = '      demoPositionRef.current.y = next.y;\n';
const rescueBlock = `      if (getCurrentCreatures().length <= 0) {
        demoCreaturesRef.current = createTileBasedDemoCreatures();
        demoTileIndexRef.current = createDemoTileIndex(demoResourcesRef.current, demoCreaturesRef.current, demoBuildingsRef.current);
      }
`;
if (s.includes(rescueAnchor) && !s.includes('removed startup creature clear') && !s.includes('if (getCurrentCreatures().length <= 0) {\n        demoCreaturesRef.current = createTileBasedDemoCreatures();')) {
  s = s.replace(rescueAnchor, rescueAnchor + rescueBlock);
  console.log(`${tag} added empty creature rescue`);
}

if (s !== before) fs.writeFileSync(target, s);
else console.log(`${tag} no changes`);
