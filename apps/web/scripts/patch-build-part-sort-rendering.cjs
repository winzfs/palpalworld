const fs = require("fs");
const path = require("path");

const target = path.join(__dirname, "..", "src", "features", "game", "GameScene.tsx");
let source = fs.readFileSync(target, "utf8");
let changed = false;

function replaceOnce(search, replacement, label) {
  if (!source.includes(search)) {
    console.log(`[patch-build-part-sort-rendering] skipped ${label}`);
    return;
  }
  source = source.replace(search, replacement);
  changed = true;
  console.log(`[patch-build-part-sort-rendering] patched ${label}`);
}

function ensureAfter(anchor, insertion, label) {
  if (source.includes(insertion)) return;
  replaceOnce(anchor, `${anchor}\n${insertion}`, label);
}

ensureAfter(
  'import { BuildPartRenderer } from "../rendering/BuildPartRenderer";',
  'import { getBuildPartSortKey } from "../buildings/buildPartVisual2p5d";',
  "sort key import",
);

replaceOnce(
  '    for (const part of this.getSceneBuildParts()) {\n      const world = buildGridToWorld(part);',
  '    const sortedBuildParts = [...this.getSceneBuildParts()].sort((a, b) => {\n      const definitionA = BUILD_PARTS[a.partId];\n      const definitionB = BUILD_PARTS[b.partId];\n      if (!definitionA || !definitionB) return 0;\n      return getBuildPartSortKey(definitionA, a.gridX, a.gridY, a.floorLevel) - getBuildPartSortKey(definitionB, b.gridX, b.gridY, b.floorLevel);\n    });\n    for (const part of sortedBuildParts) {\n      const world = buildGridToWorld(part);',
  "sort drawBuildParts loop",
);

if (changed) fs.writeFileSync(target, source);
