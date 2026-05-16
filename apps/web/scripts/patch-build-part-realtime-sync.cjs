const fs = require("fs");
const path = require("path");

const target = path.join(__dirname, "..", "src", "features", "game", "GameClientTileDemoStation.tsx");
let source = fs.readFileSync(target, "utf8");
let changed = false;

function replaceOnce(search, replacement, label) {
  if (source.includes(replacement)) return;
  if (!source.includes(search)) {
    console.log(`[patch-build-part-realtime-sync] skipped ${label}`);
    return;
  }
  source = source.replace(search, replacement);
  changed = true;
  console.log(`[patch-build-part-realtime-sync] patched ${label}`);
}

function ensureAfter(anchor, insertion, label) {
  if (source.includes(insertion)) return;
  replaceOnce(anchor, `${anchor}\n${insertion}`, label);
}

ensureAfter(
  'import { addBuildingToTileIndex, createDemoTileIndex, getAliveTileCreatures, getAliveTileResources, getTileBuildings } from "./demoTileIndex";\n',
  'import { startBuildPartRealtimeSync, stopBuildPartRealtimeSync } from "../buildings/buildPartStore";',
  "build part sync import current",
);

replaceOnce(
  '  useEffect(() => { setNickname(createClientNickname()); commitInventory(readStoredInventory(createDemoInventory())); }, [commitInventory]);',
  '  useEffect(() => { setNickname(createClientNickname()); commitInventory(readStoredInventory(createDemoInventory())); void startBuildPartRealtimeSync(); return () => stopBuildPartRealtimeSync(); }, [commitInventory]);',
  "sync lifecycle current",
);

if (changed) fs.writeFileSync(target, source);
else console.log("[patch-build-part-realtime-sync] no changes");
