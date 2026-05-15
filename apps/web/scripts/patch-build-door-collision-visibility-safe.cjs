const fs = require("fs");
const path = require("path");

const collisionPath = path.join(__dirname, "..", "src", "features", "buildings", "buildCollision2p5d.ts");
const scenePath = path.join(__dirname, "..", "src", "features", "game", "GameScene.tsx");

let collision = fs.readFileSync(collisionPath, "utf8");
let scene = fs.readFileSync(scenePath, "utf8");
let collisionChanged = false;
let sceneChanged = false;

function replaceCollisionRegex(regex, replacement, label) {
  if (!regex.test(collision)) {
    console.log(`[patch-build-door-collision-visibility-safe] skipped collision ${label}`);
    return;
  }
  collision = collision.replace(regex, replacement);
  collisionChanged = true;
  console.log(`[patch-build-door-collision-visibility-safe] patched collision ${label}`);
}

function replaceSceneOnce(search, replacement, label) {
  if (scene.includes(replacement)) {
    console.log(`[patch-build-door-collision-visibility-safe] already-patched scene ${label}`);
    return;
  }
  if (!scene.includes(search)) {
    console.log(`[patch-build-door-collision-visibility-safe] skipped scene ${label}`);
    return;
  }
  scene = scene.replace(search, replacement);
  sceneChanged = true;
  console.log(`[patch-build-door-collision-visibility-safe] patched scene ${label}`);
}

// Normalize collision constants after every earlier patch has run.
replaceCollisionRegex(/const PLAYER_COLLISION_RADIUS = [0-9.]+;/, "const PLAYER_COLLISION_RADIUS = 8;", "player radius");
replaceCollisionRegex(/const WALL_COLLISION_THICKNESS = [0-9.]+;/, "const WALL_COLLISION_THICKNESS = 2.25;", "wall thickness");

// Replace the wall segment area as one block. This avoids duplicate helper
// declarations and trims segment endpoints so wall corners/doorways do not feel
// much larger than their visual edge.
replaceCollisionRegex(
  /(?:function insetSegment\(a: Vector2, b: Vector2, inset = [0-9.]+\) \{[\s\S]*?\n\}\n\n)?function getWallSegment\(part: PlacedBuildPart\) \{[\s\S]*?\n\}\n\nfunction isWallCollisionPart/,
  `function insetSegment(a: Vector2, b: Vector2, inset = 0.12) {
  return {
    a: { x: a.x + (b.x - a.x) * inset, y: a.y + (b.y - a.y) * inset },
    b: { x: b.x + (a.x - b.x) * inset, y: b.y + (a.y - b.y) * inset },
  };
}

function getWallSegment(part: PlacedBuildPart) {
  const center = buildGridToWorld(part);
  const halfW = BUILD_GRID_SIZE / 2;
  const halfH = BUILD_GRID_SIZE * 0.62 / 2;
  const top = { x: center.x, y: center.y - halfH };
  const right = { x: center.x + halfW, y: center.y };
  const bottom = { x: center.x, y: center.y + halfH };
  const left = { x: center.x - halfW, y: center.y };
  const edge = getEdgeFromRotation(part.rotation);
  if (edge === "north") return insetSegment(left, top);
  if (edge === "east") return insetSegment(top, right);
  if (edge === "south") return insetSegment(right, bottom);
  return insetSegment(bottom, left);
}

function isWallCollisionPart`,
  "wall segment inset block",
);

replaceCollisionRegex(
  /function isWallCollisionPart\(part: PlacedBuildPart\) \{[\s\S]*?\n\}\n\nfunction isObjectCollisionPart/,
  `function isWallCollisionPart(part: PlacedBuildPart) {
  const definition = BUILD_PARTS[part.partId];
  if (!definition) return false;
  if (definition.category === "door") return part.isOpen !== true;
  return definition.category === "wall" || definition.category === "window";
}

function isOpenDoorPart(part: PlacedBuildPart) {
  return BUILD_PARTS[part.partId]?.category === "door" && part.isOpen === true;
}

function hasNearbyOpenDoorOnSameEdge(parts: PlacedBuildPart[], wall: PlacedBuildPart) {
  const wallEdge = getEdgeFromRotation(wall.rotation);
  return parts.some((part) => {
    if (!isOpenDoorPart(part)) return false;
    if (part.floorLevel !== wall.floorLevel) return false;
    if (getEdgeFromRotation(part.rotation) !== wallEdge) return false;
    return Math.abs(part.gridX - wall.gridX) <= 1 && Math.abs(part.gridY - wall.gridY) <= 1;
  });
}

function isObjectCollisionPart`,
  "wall collision helpers",
);

replaceCollisionRegex(
  /function isObjectCollisionPart\(part: PlacedBuildPart\) \{[\s\S]*?\n\}/,
  `function isObjectCollisionPart(part: PlacedBuildPart) {
  const definition = BUILD_PARTS[part.partId];
  if (!definition) return false;
  if (definition.category === "door") return false;
  if (definition.category === "stairs" || definition.category === "floor" || definition.category === "roof") return false;
  return definition.blocksMove || definition.layer === "object" || definition.category === "furniture" || definition.category === "utility";
}`,
  "object collision excludes door",
);

replaceCollisionRegex(
  /    if \(isWallCollisionPart\(part\)\) \{\n      const segment = getWallSegment\(part\);\n      const segmentDistance = distancePointToSegment\(position, segment\.a, segment\.b\);\n      if \(segmentDistance <= PLAYER_COLLISION_RADIUS \+ WALL_COLLISION_THICKNESS\) return \{ blocked: true, reason: "wall", part \};\n    \}/,
  `    if (isWallCollisionPart(part)) {
      if (BUILD_PARTS[part.partId]?.category === "wall" && hasNearbyOpenDoorOnSameEdge(candidates, part)) continue;
      const segment = getWallSegment(part);
      const segmentDistance = distancePointToSegment(position, segment.a, segment.b);
      if (segmentDistance <= PLAYER_COLLISION_RADIUS + WALL_COLLISION_THICKNESS) return { blocked: true, reason: "wall", part };
    }`,
  "open door adjacent wall gap",
);

// Foreground wall culling used iso positions with a world viewport. Make the
// culling forgiving so installed walls do not disappear when leaving build mode.
replaceSceneOnce(
  "    const cullPad = sourceParts.length > 80 ? 140 : 240;",
  "    const cullPad = sourceParts.length > 80 ? 900 : 1200;",
  "foreground cull padding",
);

replaceSceneOnce(
  '      const center = buildGridToIsoCenter(part.gridX, part.gridY);\n      const nearPlayer = Boolean(localPlayer && Math.hypot(localPlayer.position.x - center.x, localPlayer.position.y - center.y) <= (definition.category === "roof" ? 190 : 150));',
  '      const center = buildGridToWorld(part);\n      const nearPlayer = Boolean(localPlayer && Math.hypot(localPlayer.position.x - center.x, localPlayer.position.y - center.y) <= (definition.category === "roof" ? 190 : 150));',
  "foreground near player world center",
);

if (collisionChanged) fs.writeFileSync(collisionPath, collision);
if (sceneChanged) fs.writeFileSync(scenePath, scene);
