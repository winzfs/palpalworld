const fs = require("fs");
const path = require("path");

const target = path.join(__dirname, "..", "src", "features", "game", "GameScene.tsx");
let source = fs.readFileSync(target, "utf8");
let changed = false;

function replace(search, replacement, label) {
  if (source.includes(replacement)) {
    console.log(`[patch-build-static-cache-key-final] already-patched ${label}`);
    return;
  }
  if (!source.includes(search)) {
    console.log(`[patch-build-static-cache-key-final] skipped ${label}`);
    return;
  }
  source = source.replace(search, replacement);
  changed = true;
  console.log(`[patch-build-static-cache-key-final] patched ${label}`);
}

replace(
  '    const width = Math.ceil((this.cachedRootRectWidth || this.root.clientWidth) + 360);\n    const height = Math.ceil((this.cachedRootRectHeight || this.root.clientHeight) + 360);',
  '    const width = Math.min(1600, Math.ceil((this.cachedRootRectWidth || this.root.clientWidth) + 300));\n    const height = Math.min(1200, Math.ceil((this.cachedRootRectHeight || this.root.clientHeight) + 300));',
  "limit static cache canvas size",
);

replace(
  '    const key = parts.length + ":" + bucketX + ":" + bucketY + ":" + parts.map((part) => [part.id, part.partId, part.gridX, part.gridY, part.rotation, part.floorLevel, part.isOpen === true ? 1 : 0].join("/")).join("|");',
  '    const key = String(readBuildPartsVersionForScene()) + ":" + parts.length + ":" + bucketX + ":" + bucketY;',
  "version static cache key",
);

replace(
  '    const heavyScene = sourceParts.length > 90 || visibleParts.length > 50;\n    if (heavyScene && this.drawBuildPartsCachedBase(ctx, visibleParts, isoCamX, isoCamY, viewport)) return;',
  '    const heavyScene = sourceParts.length > 48 || visibleParts.length > 28;\n    if (heavyScene && this.drawBuildPartsCachedBase(ctx, visibleParts, isoCamX, isoCamY, viewport)) return;',
  "lower heavy scene threshold",
);

if (changed) fs.writeFileSync(target, source);
