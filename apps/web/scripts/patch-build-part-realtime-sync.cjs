const fs = require("fs");
const path = require("path");

const target = path.join(__dirname, "..", "src", "features", "game", "GameClientTileDemoStation.tsx");
let source = fs.readFileSync(target, "utf8");
let changed = false;

function replaceOnce(search, replacement, label) {
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
  'import { BuildModePanel } from "../buildings/BuildModePanel";\nimport type { BuildFloorLevel, BuildPartId, BuildPartRotation } from "../buildings/buildPartCatalog";',
  'import { startBuildPartRealtimeSync, stopBuildPartRealtimeSync } from "../buildings/buildPartStore";',
  "build part sync import",
);

replaceOnce(
  '  useEffect(() => { setNickname(createClientNickname()); commitInventory(readStoredInventory(createDemoInventory())); }, [commitInventory]);',
  '  useEffect(() => { setNickname(createClientNickname()); commitInventory(readStoredInventory(createDemoInventory())); void startBuildPartRealtimeSync(); return () => stopBuildPartRealtimeSync(); }, [commitInventory]);',
  "sync lifecycle",
);

if (changed) fs.writeFileSync(target, source);
