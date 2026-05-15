const fs = require("fs");
const path = require("path");

const target = path.join(__dirname, "..", "src", "features", "game", "GameClientTileDemoStation.tsx");
let source = fs.readFileSync(target, "utf8");
let changed = false;

function replaceImport(modulePath, symbols, typeSymbols = []) {
  const regex = new RegExp(`import\\s+\\{([^}]+)\\}\\s+from\\s+["']${modulePath.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}["'];`, "g");
  const matches = [...source.matchAll(regex)];
  if (matches.length <= 0) return;

  const existingValue = new Set();
  const existingType = new Set();
  for (const match of matches) {
    const body = match[1] ?? "";
    for (const raw of body.split(",")) {
      const item = raw.trim();
      if (!item) continue;
      if (item.startsWith("type ")) existingType.add(item.replace(/^type\s+/, "").trim());
      else existingValue.add(item);
    }
  }
  for (const symbol of symbols) existingValue.add(symbol);
  for (const symbol of typeSymbols) existingType.add(symbol);

  const merged = [
    ...[...existingValue].filter(Boolean).sort(),
    ...[...existingType].filter(Boolean).sort().map((symbol) => `type ${symbol}`),
  ];
  const nextLine = `import { ${merged.join(", ")} } from "${modulePath}";`;
  source = source.replace(regex, "");
  const anchor = 'import { addBuildingToTileIndex, createDemoTileIndex, getAliveTileCreatures, getAliveTileResources, getTileBuildings } from "./demoTileIndex";';
  if (source.includes(anchor)) source = source.replace(anchor, `${anchor}\n${nextLine}`);
  else source = `${nextLine}\n${source}`;
  changed = true;
}

replaceImport("../buildings/buildPartCatalog", ["BUILD_PARTS"], ["PlacedBuildPart"]);
replaceImport("../buildings/buildGrid", ["buildGridToWorld"]);
replaceImport("../buildings/buildCollision2p5d", ["getBuildCollisionAtPosition"]);
replaceImport("../buildings/buildPartStore", ["getBuildPartsForTile", "readStoredBuildParts", "toggleBuildDoorOpen"]);

source = source.replace(/\n{3,}/g, "\n\n");

if (changed) {
  fs.writeFileSync(target, source);
  console.log("[patch-game-client-import-dedupe-final] deduped GameClientTileDemoStation imports");
} else {
  console.log("[patch-game-client-import-dedupe-final] no import changes needed");
}

require("./patch-build-render-hotpath-final.cjs");
require("./patch-smooth-movement-snapshot-throttle.cjs");
