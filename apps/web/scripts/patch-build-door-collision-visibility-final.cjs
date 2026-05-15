const fs = require("fs");
const path = require("path");

const collisionPath = path.join(__dirname, "..", "src", "features", "buildings", "buildCollision2p5d.ts");
const visibilityPath = path.join(__dirname, "..", "src", "features", "buildings", "houseVisibility2p5d.ts");
const scenePath = path.join(__dirname, "..", "src", "features", "game", "GameScene.tsx");

let collision = fs.readFileSync(collisionPath, "utf8");
let visibility = fs.readFileSync(visibilityPath, "utf8");
let scene = fs.readFileSync(scenePath, "utf8");
let collisionChanged = false;
let visibilityChanged = false;
let sceneChanged = false;

function replaceCollision(search, replacement, label) {
  if (collision.includes(replacement)) {
    console.log(`[patch-build-door-collision-visibility-final] already-patched collision ${label}`);
    return;
  }
  if (!collision.includes(search)) {
    console.log(`[patch-build-door-collision-visibility-final] skipped collision ${label}`);
    return;
  }
  collision = collision.replace(search, replacement);
  collisionChanged = true;
  console.log(`[patch-build-door-collision-visibility-final] patched collision ${label}`);
}

function replaceVisibility(search, replacement, label) {
  if (visibility.includes(replacement)) {
    console.log(`[patch-build-door-collision-visibility-final] already-patched visibility ${label}`);
    return;
  }
  if (!visibility.includes(search)) {
    console.log(`[patch-build-door-collision-visibility-final] skipped visibility ${label}`);
    return;
  }
  visibility = visibility.replace(search, replacement);
  visibilityChanged = true;
  console.log(`[patch-build-door-collision-visibility-final] patched visibility ${label}`);
}

function replaceScene(search, replacement, label) {
  if (scene.includes(replacement)) {
    console.log(`[patch-build-door-collision-visibility-final] already-patched scene ${label}`);
    return;
  }
  if (!scene.includes(search)) {
    console.log(`[patch-build-door-collision-visibility-final] skipped scene ${label}`);
    return;
  }
  scene = scene.replace(search, replacement);
  sceneChanged = true;
  console.log(`[patch-build-door-collision-visibility-final] patched scene ${label}`);
}

replaceCollision("const PLAYER_COLLISION_RADIUS = 10;", "const PLAYER_COLLISION_RADIUS = 8;", "player radius 10 to 8");
replaceCollision("const PLAYER_COLLISION_RADIUS = 9;", "const PLAYER_COLLISION_RADIUS = 8;", "player radius 9 to 8");
replaceCollision("const WALL_COLLISION_THICKNESS = 4;", "const WALL_COLLISION_THICKNESS = 2.25;", "wall thickness 4 to 2.25");
replaceCollision("const WALL_COLLISION_THICKNESS = 2.5;", "const WALL_COLLISION_THICKNESS = 2.25;", "wall thickness 2.5 to 2.25");

replaceCollision(
  'function getWallSegment(part: PlacedBuildPart) {\n  const center = buildGridToWorld(part);',
  'function insetSegment(a: Vector2, b: Vector2, inset = 0.12) {\n  return {\n    a: { x: a.x + (b.x - a.x) * inset, y: a.y + (b.y - a.y) * inset },\n    b: { x: b.x + (a.x - b.x) * inset, y: b.y + (a.y - b.y) * inset },\n  };\n}\n\nfunction getWallSegment(part: PlacedBuildPart) {\n  const center = buildGridToWorld(part);',
  "add inset wall segment helper",
);
replaceCollision(
  '  if (edge === "north") return { a: left, b: top };\n  if (edge === "east") return { a: top, b: right };\n  if (edge === "south") return { a: right, b: bottom };\n  return { a: bottom, b: left };',
  '  if (edge === "north") return insetSegment(left, top);\n  if (edge === "east") return insetSegment(top, right);\n  if (edge === "south") return insetSegment(right, bottom);\n  return insetSegment(bottom, left);',
  "use inset wall segments",
);

replaceCollision(
  'function isWallCollisionPart(part: PlacedBuildPart) {\n  const definition = BUILD_PARTS[part.partId];\n  if (!definition) return false;\n  if (definition.category === "door") return part.isOpen !== true;\n  return definition.category === "wall" || definition.category === "window";\n}',
  'function isWallCollisionPart(part: PlacedBuildPart) {\n  const definition = BUILD_PARTS[part.partId];\n  if (!definition) return false;\n  if (definition.category === "door") return part.isOpen !== true;\n  return definition.category === "wall" || definition.category === "window";\n}\n\nfunction isOpenDoorPart(part: PlacedBuildPart) {\n  return BUILD_PARTS[part.partId]?.category === "door" && part.isOpen === true;\n}\n\nfunction hasNearbyOpenDoorOnSameEdge(parts: PlacedBuildPart[], wall: PlacedBuildPart) {\n  const wallEdge = getEdgeFromRotation(wall.rotation);\n  return parts.some((part) => {\n    if (!isOpenDoorPart(part)) return false;\n    if (part.floorLevel !== wall.floorLevel) return false;\n    if (getEdgeFromRotation(part.rotation) !== wallEdge) return false;\n    return Math.abs(part.gridX - wall.gridX) <= 1 && Math.abs(part.gridY - wall.gridY) <= 1;\n  });\n}',
  "open door adjacent wall helper",
);
replaceCollision(
  'function isObjectCollisionPart(part: PlacedBuildPart) {\n  const definition = BUILD_PARTS[part.partId];\n  if (!definition) return false;\n  if (definition.category === "stairs" || definition.category === "floor" || definition.category === "roof") return false;',
  'function isObjectCollisionPart(part: PlacedBuildPart) {\n  const definition = BUILD_PARTS[part.partId];\n  if (!definition) return false;\n  if (definition.category === "door") return false;\n  if (definition.category === "stairs" || definition.category === "floor" || definition.category === "roof") return false;',
  "exclude door from object collision",
);
replaceCollision(
  '    if (isWallCollisionPart(part)) {\n      const segment = getWallSegment(part);\n      const segmentDistance = distancePointToSegment(position, segment.a, segment.b);\n      if (segmentDistance <= PLAYER_COLLISION_RADIUS + WALL_COLLISION_THICKNESS) return { blocked: true, reason: "wall", part };\n    }',
  '    if (isWallCollisionPart(part)) {\n      if (BUILD_PARTS[part.partId]?.category === "wall" && hasNearbyOpenDoorOnSameEdge(candidates, part)) continue;\n      const segment = getWallSegment(part);\n      const segmentDistance = distancePointToSegment(position, segment.a, segment.b);\n      if (segmentDistance <= PLAYER_COLLISION_RADIUS + WALL_COLLISION_THICKNESS) return { blocked: true, reason: "wall", part };\n    }',
  "skip adjacent wall when open door shares edge",
);

replaceVisibility(
  '  const inSelectedHouse = Boolean(selectedHouseId && part.houseId === selectedHouseId);\n  const floorMismatch = typeof activeFloorLevel === "number" && part.floorLevel !== activeFloorLevel;',
  '  const inSelectedHouse = Boolean(selectedHouseId && part.houseId === selectedHouseId);\n  const floorMismatch = typeof activeFloorLevel === "number" && part.floorLevel !== activeFloorLevel;\n\n  if (mode === "normal") {\n    return {\n      alpha: floorMismatch ? 0.82 : 1,\n      outlineAlpha: 0.22,\n      hide: false,\n      reason: floorMismatch ? "other-floor" : "normal",\n    };\n  }',
  "normal mode never hides build parts",
);

replaceScene(
  '      const center = buildGridToIsoCenter(part.gridX, part.gridY);\n      const nearPlayer = Boolean(localPlayer && Math.hypot(localPlayer.position.x - center.x, localPlayer.position.y - center.y) <= (definition.category === "roof" ? 190 : 150));',
  '      const center = buildGridToWorld(part);\n      const nearPlayer = Boolean(localPlayer && Math.hypot(localPlayer.position.x - center.x, localPlayer.position.y - center.y) <= (definition.category === "roof" ? 190 : 150));',
  "foreground near-player uses world position",
);

if (collisionChanged) fs.writeFileSync(collisionPath, collision);
if (visibilityChanged) fs.writeFileSync(visibilityPath, visibility);
if (sceneChanged) fs.writeFileSync(scenePath, scene);
