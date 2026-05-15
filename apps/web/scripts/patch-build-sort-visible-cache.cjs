const fs = require("fs");
const path = require("path");

const target = path.join(__dirname, "..", "src", "features", "game", "GameScene.tsx");
let source = fs.readFileSync(target, "utf8");
let changed = false;

function once(search, replacement, label) {
  if (source.includes(replacement)) {
    console.log(`[patch-build-sort-visible-cache] already-patched ${label}`);
    return;
  }
  if (!source.includes(search)) {
    console.log(`[patch-build-sort-visible-cache] skipped ${label}`);
    return;
  }
  source = source.replace(search, replacement);
  changed = true;
  console.log(`[patch-build-sort-visible-cache] patched ${label}`);
}

function addCacheBeforeLoop(marker, label) {
  once(
    marker,
    marker.replace(
      "    const visibleParts: PlacedBuildPart[] = [];",
      `    const __cacheKey = sourceParts.length + ":" + sourceParts.map((part) => [part.id, part.partId, part.gridX, part.gridY, part.rotation, part.floorLevel, part.isOpen === true ? 1 : 0].join("/")).join("|");
    const __sortCache = (this as any).__buildSortedPartsCache as { key: string; parts: PlacedBuildPart[] } | undefined;
    const sortedSourceParts = __sortCache?.key === __cacheKey
      ? __sortCache.parts
      : sourceParts.slice().sort((a, b) => {
        const definitionA = BUILD_PARTS[a.partId];
        const definitionB = BUILD_PARTS[b.partId];
        if (!definitionA || !definitionB) return 0;
        return getBuildPartSortKey(definitionA, a.gridX, a.gridY, a.floorLevel) - getBuildPartSortKey(definitionB, b.gridX, b.gridY, b.floorLevel);
      });
    if (__sortCache?.key !== __cacheKey) (this as any).__buildSortedPartsCache = { key: __cacheKey, parts: sortedSourceParts };

    const visibleParts: PlacedBuildPart[] = [];`
    ),
    label
  );
}

addCacheBeforeLoop(
`    const sourceParts = this.getSceneBuildParts();
    if (sourceParts.length <= 0) return;

    const visibleParts: PlacedBuildPart[] = [];`,
"base sort cache"
);

addCacheBeforeLoop(
`    const sourceParts = this.getSceneBuildParts();
    if (sourceParts.length <= 0) return;

    const localPlayer = this.getLocalPlayer();
    const playerFloorLevel = Math.round((this as any).localPlayerFloorLevel ?? 0);
    const visibleParts: PlacedBuildPart[] = [];`,
"foreground sort cache"
);

source = source.replace(/for \(const part of sourceParts\) \{/g, "for (const part of sortedSourceParts) {");

source = source.replace(/\n\s*visibleParts\.sort\(\(a, b\) => \{\n\s*const definitionA = BUILD_PARTS\[a\.partId\];\n\s*const definitionB = BUILD_PARTS\[b\.partId\];\n\s*if \(!definitionA \|\| !definitionB\) return 0;\n\s*return getBuildPartSortKey\(definitionA, a\.gridX, a\.gridY, a\.floorLevel\) - getBuildPartSortKey\(definitionB, b\.gridX, b\.gridY, b\.floorLevel\);\n\s*\}\);/g, "");
changed = true;

if (changed) fs.writeFileSync(target, source);
