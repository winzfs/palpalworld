const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'src', 'features', 'game', 'GameClientTileDemoStation.tsx');
let s = fs.readFileSync(target, 'utf8');
const before = s;
const tag = '[patch-creature-authority-state]';

const refAnchor = '  const lastUiSnapshotAtRef = useRef(0);\n';
if (s.includes(refAnchor) && !s.includes('creatureAuthorityRef')) {
  s = s.replace(refAnchor, refAnchor + '  const creatureAuthorityRef = useRef<"unknown" | "host" | "client">("unknown");\n');
  console.log(`${tag} added authority ref`);
}

s = s.replaceAll('isCreatureHostRef.current = host.isHost;', 'isCreatureHostRef.current = host.isHost;\n        creatureAuthorityRef.current = host.isHost ? "host" : "client";');
s = s.replaceAll('isCreatureHostRef.current = result.isHost;', 'isCreatureHostRef.current = result.isHost;\n          creatureAuthorityRef.current = result.isHost ? "host" : "client";');

const strictGuard = '      if (!isSupabaseMultiplayerEnabled() || isCreatureHostRef.current) moveDemoCreatures(getCurrentCreatures(), deltaSeconds, now, demoPositionRef.current);';
const authorityGuard = '      if (!isSupabaseMultiplayerEnabled() || creatureAuthorityRef.current !== "client") moveDemoCreatures(getCurrentCreatures(), deltaSeconds, now, demoPositionRef.current);';
if (s.includes(strictGuard)) {
  s = s.replaceAll(strictGuard, authorityGuard);
  console.log(`${tag} relaxed movement guard for unknown authority`);
}

if (s !== before) fs.writeFileSync(target, s);
else console.log(`${tag} no changes`);

require('./patch-creature-save-after-move.cjs');
