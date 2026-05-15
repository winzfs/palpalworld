const fs = require("fs");
const path = require("path");

const target = path.join(__dirname, "..", "src", "features", "game", "GameClientTileDemoStation.tsx");
let source = fs.readFileSync(target, "utf8");
let changed = false;

function replaceOnce(search, replacement, label) {
  if (!source.includes(search)) {
    console.log(`[patch-demo-movement-collision-2p5d] skipped ${label}`);
    return;
  }
  source = source.replace(search, replacement);
  changed = true;
  console.log(`[patch-demo-movement-collision-2p5d] patched ${label}`);
}

function ensureAfter(anchor, insertion, label) {
  if (source.includes(insertion)) return;
  replaceOnce(anchor, `${anchor}\n${insertion}`, label);
}

ensureAfter(
  'import { addBuildingToTileIndex, createDemoTileIndex, getAliveTileCreatures, getAliveTileResources, getTileBuildings } from "./demoTileIndex";',
  'import { getBuildCollisionAtPosition } from "../buildings/buildCollision2p5d";\nimport { getBuildPartsForTile, readStoredBuildParts } from "../buildings/buildPartStore";',
  "collision imports",
);

replaceOnce(
  '  const inputRef = useRef<GameSceneInput>({ x: 0, y: 0, primary: false, secondary: false });\n  const demoPositionRef = useRef<Vector2>({ x: 1500, y: 1500 });',
  '  const inputRef = useRef<GameSceneInput>({ x: 0, y: 0, primary: false, secondary: false });\n  const buildFloorStateRef = useRef<{ floorLevel: number; floorYOffset: number; onStair: boolean; overFloor: boolean; collisionReason?: string | null }>({ floorLevel: 0, floorYOffset: 0, onStair: false, overFloor: false, collisionReason: null });\n  const demoPositionRef = useRef<Vector2>({ x: 1500, y: 1500 });',
  "floor state ref",
);

replaceOnce(
  '  useEffect(() => {\n    const handleInventoryChanged = (event: Event) => { const customEvent = event as CustomEvent<{ inventory?: InventoryState }>; if (customEvent.detail?.inventory) setInventory(customEvent.detail.inventory); };\n    window.addEventListener("palpalworld:inventory-changed", handleInventoryChanged);\n    return () => window.removeEventListener("palpalworld:inventory-changed", handleInventoryChanged);\n  }, []);',
  '  useEffect(() => {\n    const handleInventoryChanged = (event: Event) => { const customEvent = event as CustomEvent<{ inventory?: InventoryState }>; if (customEvent.detail?.inventory) setInventory(customEvent.detail.inventory); };\n    window.addEventListener("palpalworld:inventory-changed", handleInventoryChanged);\n    return () => window.removeEventListener("palpalworld:inventory-changed", handleInventoryChanged);\n  }, []);\n  useEffect(() => {\n    const handleBuildFloorState = (event: Event) => {\n      const customEvent = event as CustomEvent<{ floorLevel?: number; floorYOffset?: number; onStair?: boolean; overFloor?: boolean; collisionReason?: string | null }>;\n      buildFloorStateRef.current = {\n        floorLevel: customEvent.detail?.floorLevel ?? 0,\n        floorYOffset: customEvent.detail?.floorYOffset ?? 0,\n        onStair: Boolean(customEvent.detail?.onStair),\n        overFloor: Boolean(customEvent.detail?.overFloor),\n        collisionReason: customEvent.detail?.collisionReason ?? null,\n      };\n    };\n    window.addEventListener("palpalworld:build-floor-state", handleBuildFloorState);\n    return () => window.removeEventListener("palpalworld:build-floor-state", handleBuildFloorState);\n  }, []);',
  "floor state listener",
);

replaceOnce(
  '      const next = clampPositionToTile({ x: demoPositionRef.current.x + normalized.x * playerMoveSpeed * deltaSeconds, y: demoPositionRef.current.y + normalized.y * playerMoveSpeed * deltaSeconds });\n      demoPositionRef.current.x = next.x;\n      demoPositionRef.current.y = next.y;',
  '      const movementStep = { x: normalized.x * playerMoveSpeed * deltaSeconds, y: normalized.y * playerMoveSpeed * deltaSeconds };\n      const buildParts = getBuildPartsForTile(readStoredBuildParts(), demoTileRef.current);\n      const floorLevel = buildFloorStateRef.current.floorLevel;\n      const fullTarget = clampPositionToTile({ x: demoPositionRef.current.x + movementStep.x, y: demoPositionRef.current.y + movementStep.y });\n      const fullCollision = getBuildCollisionAtPosition({ parts: buildParts, position: fullTarget, floorLevel });\n      let next = fullTarget;\n      if (fullCollision.blocked) {\n        const xTarget = clampPositionToTile({ x: demoPositionRef.current.x + movementStep.x, y: demoPositionRef.current.y });\n        const yTarget = clampPositionToTile({ x: demoPositionRef.current.x, y: demoPositionRef.current.y + movementStep.y });\n        const xBlocked = Math.abs(movementStep.x) > 0 && getBuildCollisionAtPosition({ parts: buildParts, position: xTarget, floorLevel }).blocked;\n        const yBlocked = Math.abs(movementStep.y) > 0 && getBuildCollisionAtPosition({ parts: buildParts, position: yTarget, floorLevel }).blocked;\n        next = clampPositionToTile({\n          x: xBlocked ? demoPositionRef.current.x : xTarget.x,\n          y: yBlocked ? demoPositionRef.current.y : yTarget.y,\n        });\n      }\n      demoPositionRef.current.x = next.x;\n      demoPositionRef.current.y = next.y;',
  "movement collision tick",
);

if (changed) fs.writeFileSync(target, source);
