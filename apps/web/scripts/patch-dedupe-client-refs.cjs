const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'src', 'features', 'game', 'GameClientTileDemoStation.tsx');
let source = fs.readFileSync(target, 'utf8');
const original = source;

const refNames = [
  'cachedBuildPartsRef',
  'handleDemoAttackRef',
  'lastCreatureAiAtRef',
  'lastSceneSnapshotAtRef',
  'lastDemoAttackAtRef',
  'lastUiSnapshotAtRef',
  'supabaseClientRef',
  'creatureBroadcastChannelRef',
  'creatureBroadcastTargetsRef',
  'isCreatureHostRef',
  'lastCreatureHostClaimAtRef',
  'lastCreatureBroadcastAtRef',
  'lastCreatureSnapshotSaveAtRef',
];

for (const name of refNames) {
  let seen = false;
  const lineRegex = new RegExp(`^\\s*const ${name} = useRef(?:<[^\\n]+?>)?\\([^\\n]*\\);\\n?`, 'gm');
  source = source.replace(lineRegex, (line) => {
    if (!seen) {
      seen = true;
      return line.endsWith('\n') ? line : `${line}\n`;
    }
    console.log(`[patch-dedupe-client-refs] removed duplicate ${name}`);
    return '';
  });
}

// Some older patches can insert isolated blank gaps while deduping. Keep formatting stable.
source = source.replace(/\n{4,}/g, '\n\n\n');

if (source !== original) {
  fs.writeFileSync(target, source);
  console.log('[patch-dedupe-client-refs] cleaned duplicate refs');
} else {
  console.log('[patch-dedupe-client-refs] no duplicate refs');
}
