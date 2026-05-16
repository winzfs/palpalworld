const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'src', 'features', 'game', 'GameScene.tsx');
let source = fs.readFileSync(target, 'utf8');
let changed = false;

function replaceAll(search, replacement, label) {
  if (!source.includes(search)) {
    console.log(`[patch-pixi-build-placement-import-dedupe] skipped ${label}`);
    return;
  }
  source = source.split(search).join(replacement);
  changed = true;
  console.log(`[patch-pixi-build-placement-import-dedupe] patched ${label}`);
}

function mergeNamedImports(modulePath) {
  const importRegex = new RegExp(`import \\{([^}]+)\\} from "${modulePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}";`, 'g');
  const matches = [...source.matchAll(importRegex)];
  if (matches.length <= 1) return;

  const names = [];
  const seen = new Set();
  for (const match of matches) {
    for (const raw of match[1].split(',')) {
      const name = raw.trim();
      if (!name || seen.has(name)) continue;
      seen.add(name);
      names.push(name);
    }
  }

  source = source.replace(importRegex, '');
  source = source.replace(/\n{3,}/g, '\n\n');
  const merged = `import { ${names.join(', ')} } from "${modulePath}";`;
  const useClient = '"use client";\n\n';
  if (source.startsWith(useClient)) source = source.replace(useClient, `${useClient}${merged}\n`);
  else source = `${merged}\n${source}`;
  changed = true;
  console.log(`[patch-pixi-build-placement-import-dedupe] merged imports from ${modulePath}`);
}

mergeNamedImports('../buildings/buildProjection2p5d');
mergeNamedImports('../buildings/buildGrid');
mergeNamedImports('../buildings/buildPartCatalog');
mergeNamedImports('../buildings/buildPartStore');

// The final Pixi placement bridge may add these imports after older patches already did.
// Keep one canonical projection import and remove exact duplicate variants left by patch order.
replaceAll(
  'import { buildGridToIsoCenter, worldCameraToIsoBuildCamera, screenToIsoBuildGrid } from "../buildings/buildProjection2p5d";\n',
  '',
  'projection duplicate order variant',
);

// Re-run projection import merge after exact duplicate cleanup.
mergeNamedImports('../buildings/buildProjection2p5d');

if (changed) fs.writeFileSync(target, source);
else console.log('[patch-pixi-build-placement-import-dedupe] no changes');
