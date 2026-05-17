const fs = require("fs");
const path = require("path");

const target = path.join(__dirname, "..", "src", "features", "game", "GameClientTileDemoStation.tsx");
let source = fs.readFileSync(target, "utf8");
let changed = false;

function replaceOnce(search, replacement, label) {
  if (!source.includes(search)) {
    console.log(`[patch-floor-fall-recovery-2p5d] skipped ${label}`);
    return;
  }
  source = source.replace(search, replacement);
  changed = true;
  console.log(`[patch-floor-fall-recovery-2p5d] patched ${label}`);
}

function ensureAfter(anchor, insertion, label) {
  if (source.includes(insertion)) return;
  replaceOnce(anchor, `${anchor}\n${insertion}`, label);
}

ensureAfter(
  'import { getBuildCollisionAtPosition } from "../buildings/buildCollision2p5d";\nimport { getBuildPartsForTile, readStoredBuildParts } from "../buildings/buildPartStore";',
  'import { findWalkableFloorAtPosition } from "../buildings/floorTraversal2p5d";',
  "floor traversal import",
);

if (source.includes('const floorHit = findWalkableFloorAtPosition(buildParts, next.x, next.y, floorState.floorLevel);')) {
  console.log('[patch-floor-fall-recovery-2p5d] already patched fall recovery tick');
} else {
  replaceOnce(
    '      demoPositionRef.current.x = next.x;\n      demoPositionRef.current.y = next.y;\n      moveDemoCreatures(getCurrentCreatures(), deltaSeconds, now, demoPositionRef.current);',
    '      const floorState = buildFloorStateRef.current;\n      if (floorState.floorLevel > 0.8 && !floorState.onStair) {\n        const floorHit = findWalkableFloorAtPosition(buildParts, next.x, next.y, floorState.floorLevel);\n        if (!floorHit) {\n          buildFloorStateRef.current = { ...floorState, floorLevel: 0, floorYOffset: 0, overFloor: false, collisionReason: null };\n          setChatLines((prev) => {\n            const last = prev[prev.length - 1] ?? "";\n            if (last.includes("2층 바닥 밖")) return prev;\n            return [...prev.slice(-5), "[build] 2층 바닥 밖으로 벗어나 1층으로 내려왔습니다."];\n          });\n        }\n      }\n      demoPositionRef.current.x = next.x;\n      demoPositionRef.current.y = next.y;\n      moveDemoCreatures(getCurrentCreatures(), deltaSeconds, now, demoPositionRef.current);',
    "fall recovery tick",
  );
}

if (changed) fs.writeFileSync(target, source);
