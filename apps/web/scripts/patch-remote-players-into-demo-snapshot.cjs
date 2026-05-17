const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'src', 'features', 'game', 'GameClientTileDemoStation.tsx');
let s = fs.readFileSync(target, 'utf8');
const before = s;
const tag = '[patch-remote-players-into-demo-snapshot]';

const refAnchor = '  const lastUiSnapshotAtRef = useRef(0);\n';
if (s.includes(refAnchor) && !s.includes('remotePlayersRef')) {
  s = s.replace(refAnchor, refAnchor + '  const remotePlayersRef = useRef<WorldSnapshot["players"]>([]);\n');
  console.log(`${tag} added remote players ref`);
}

const snapshotLine = '    const nextSnapshot = createDemoSnapshot(nickname, demoPositionRef.current, demoDirectionRef.current, demoTileRef.current, getCurrentResources(), getCurrentCreatures(), getCurrentBuildings());';
const snapshotMerge = '    const nextSnapshot = createDemoSnapshot(nickname, demoPositionRef.current, demoDirectionRef.current, demoTileRef.current, getCurrentResources(), getCurrentCreatures(), getCurrentBuildings());\n    nextSnapshot.players = [nextSnapshot.players[0], ...remotePlayersRef.current.filter((player) => player.id !== demoPlayerId)];';
if (s.includes(snapshotLine) && !s.includes('remotePlayersRef.current.filter')) {
  s = s.replace(snapshotLine, snapshotMerge);
  console.log(`${tag} merged remote players into snapshot`);
}

const effectAnchor = '  useEffect(() => { setNickname(createClientNickname()); commitInventory(readStoredInventory(createDemoInventory())); }, [commitInventory]);\n';
const effect = `  useEffect(() => {
    const handleRemotePlayers = (event: Event) => {
      const customEvent = event as CustomEvent<{ players?: WorldSnapshot["players"] }>;
      remotePlayersRef.current = customEvent.detail?.players ?? [];
      applyDemoSnapshot(true);
    };
    window.addEventListener("palpalworld:remote-players", handleRemotePlayers);
    return () => window.removeEventListener("palpalworld:remote-players", handleRemotePlayers);
  }, [applyDemoSnapshot]);
`;
if (s.includes(effectAnchor) && !s.includes('palpalworld:remote-players", handleRemotePlayers')) {
  s = s.replace(effectAnchor, effectAnchor + effect);
  console.log(`${tag} added remote players listener`);
}

if (s !== before) fs.writeFileSync(target, s);
else console.log(`${tag} no changes`);

require('./patch-remote-creatures-into-demo-world.cjs');
require('./patch-overlay-creature-persist.cjs');
