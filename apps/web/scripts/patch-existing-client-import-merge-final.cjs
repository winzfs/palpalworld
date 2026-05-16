const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'src', 'features', 'game', 'GameClientTileDemoStation.tsx');
let source = fs.readFileSync(target, 'utf8');
let changed = false;

function mergeNamedImports(modulePath) {
  const importRegex = new RegExp(`import \\{([^}]+)\\} from "${modulePath.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}";\\n`, 'g');
  const matches = [...source.matchAll(importRegex)];
  if (matches.length <= 1) return;

  const names = [];
  const seen = new Set();
  for (const match of matches) {
    const parts = match[1]
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
    for (const part of parts) {
      if (seen.has(part)) continue;
      seen.add(part);
      names.push(part);
    }
  }

  source = source.replace(importRegex, '');
  const merged = `import { ${names.join(', ')} } from "${modulePath}";\n`;
  const anchor = 'import { PixiGameCanvas } from "./pixi/PixiGameCanvas";\n';
  if (source.includes(anchor)) source = source.replace(anchor, `${anchor}${merged}`);
  else source = `${merged}${source}`;
  changed = true;
  console.log(`[patch-existing-client-import-merge-final] merged ${modulePath}`);
}

mergeNamedImports('../multiplayer/supabaseMultiplayer');
mergeNamedImports('../multiplayer/supabaseWorldCreatures');
mergeNamedImports('../multiplayer/supabaseCreatureBroadcast');

if (changed) fs.writeFileSync(target, source);
else console.log('[patch-existing-client-import-merge-final] no changes');
