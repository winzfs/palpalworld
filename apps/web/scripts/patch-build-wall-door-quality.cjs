const fs = require("fs");
const path = require("path");

const catalogPath = path.join(__dirname, "..", "src", "features", "buildings", "buildPartCatalog.ts");
const collisionPath = path.join(__dirname, "..", "src", "features", "buildings", "buildCollision2p5d.ts");
let catalog = fs.readFileSync(catalogPath, "utf8");
let collision = fs.readFileSync(collisionPath, "utf8");
let catalogChanged = false;
let collisionChanged = false;

function replaceCatalog(search, replacement, label) {
  if (catalog.includes(replacement)) {
    console.log(`[patch-build-wall-door-quality] already-patched catalog ${label}`);
    return;
  }
  if (!catalog.includes(search)) {
    console.log(`[patch-build-wall-door-quality] skipped catalog ${label}`);
    return;
  }
  catalog = catalog.replace(search, replacement);
  catalogChanged = true;
  console.log(`[patch-build-wall-door-quality] patched catalog ${label}`);
}

function replaceCollision(search, replacement, label) {
  if (collision.includes(replacement)) {
    console.log(`[patch-build-wall-door-quality] already-patched collision ${label}`);
    return;
  }
  if (!collision.includes(search)) {
    console.log(`[patch-build-wall-door-quality] skipped collision ${label}`);
    return;
  }
  collision = collision.replace(search, replacement);
  collisionChanged = true;
  console.log(`[patch-build-wall-door-quality] patched collision ${label}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Catalog helpers used by BuildModePanel / inventory UI.
// ─────────────────────────────────────────────────────────────────────────────
if (!catalog.includes("export function rotateBuildPart")) {
  catalog = `${catalog.trimEnd()}\n\nexport function rotateBuildPart(rotation: BuildPartRotation): BuildPartRotation {\n  if (rotation === 0) return 90;\n  if (rotation === 90) return 180;\n  if (rotation === 180) return 270;\n  return 0;\n}\n`;
  catalogChanged = true;
  console.log("[patch-build-wall-door-quality] patched catalog rotateBuildPart helper");
}

// Doors should be placeable on an existing floor/foundation without first placing
// a wall. They still render as edge-anchored door planes and can be opened.
replaceCatalog(
  '    requiresFloor: false,\n    requiresWall: true,\n    requiresSupport: false,\n    supportsUpperFloor: false,\n    connectsFloorLevelDelta: 0,\n    connectsToSameCategory: false,\n    cost: [wood(8), fiber(2)],',
  '    requiresFloor: true,\n    requiresWall: false,\n    requiresSupport: false,\n    supportsUpperFloor: false,\n    connectsFloorLevelDelta: 0,\n    connectsToSameCategory: false,\n    cost: [wood(8), fiber(2)],',
  "wood door floor placement",
);
replaceCatalog(
  '    requiresFloor: false,\n    requiresWall: true,\n    requiresSupport: false,\n    supportsUpperFloor: false,\n    connectsFloorLevelDelta: 0,\n    connectsToSameCategory: false,\n    cost: [stone(10), wood(2)],',
  '    requiresFloor: true,\n    requiresWall: false,\n    requiresSupport: false,\n    supportsUpperFloor: false,\n    connectsFloorLevelDelta: 0,\n    connectsToSameCategory: false,\n    cost: [stone(10), wood(2)],',
  "stone door floor placement",
);

// ─────────────────────────────────────────────────────────────────────────────
// Collision tuning.
// ─────────────────────────────────────────────────────────────────────────────
replaceCollision("const PLAYER_COLLISION_RADIUS = 10;", "const PLAYER_COLLISION_RADIUS = 8;", "smaller player collision radius");
replaceCollision("const WALL_COLLISION_THICKNESS = 4;", "const WALL_COLLISION_THICKNESS = 2.5;", "thinner wall collision");

// Shorten the effective wall collision segment slightly so the visual corner/end
// caps do not create a large invisible blocker, especially at lower-left diamond
// endpoints. The wall edge is still blocked along the main span.
replaceCollision(
  'function getWallSegment(part: PlacedBuildPart) {\n  const center = buildGridToWorld(part);',
  'function insetSegment(a: Vector2, b: Vector2, inset = 0.08) {\n  return {\n    a: { x: a.x + (b.x - a.x) * inset, y: a.y + (b.y - a.y) * inset },\n    b: { x: b.x + (a.x - b.x) * inset, y: b.y + (a.y - b.y) * inset },\n  };\n}\n\nfunction getWallSegment(part: PlacedBuildPart) {\n  const center = buildGridToWorld(part);',
  "inset wall segment helper",
);
replaceCollision(
  '  if (edge === "north") return { a: left, b: top };\n  if (edge === "east") return { a: top, b: right };\n  if (edge === "south") return { a: right, b: bottom };\n  return { a: bottom, b: left };',
  '  if (edge === "north") return insetSegment(left, top);\n  if (edge === "east") return insetSegment(top, right);\n  if (edge === "south") return insetSegment(right, bottom);\n  return insetSegment(bottom, left);',
  "use inset wall segment",
);

// Door pass-through must not be re-blocked by object collision. Closed/open door
// blocking is handled by isWallCollisionPart after patch-build-door-interactions.
replaceCollision(
  '  if (definition.category === "stairs" || definition.category === "floor" || definition.category === "roof") return false;',
  '  if (definition.category === "door") return false;\n  if (definition.category === "stairs" || definition.category === "floor" || definition.category === "roof") return false;',
  "exclude doors from object collision",
);

if (catalogChanged) fs.writeFileSync(catalogPath, catalog);
if (collisionChanged) fs.writeFileSync(collisionPath, collision);
