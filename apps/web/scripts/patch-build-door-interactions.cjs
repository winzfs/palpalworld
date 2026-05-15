const fs = require("fs");
const path = require("path");

const rendererPath = path.join(__dirname, "..", "src", "features", "rendering", "BuildPartRenderer.ts");
const collisionPath = path.join(__dirname, "..", "src", "features", "buildings", "buildCollision2p5d.ts");
const clientPath = path.join(__dirname, "..", "src", "features", "game", "GameClientTileDemoStation.tsx");

let renderer = fs.readFileSync(rendererPath, "utf8");
let collision = fs.readFileSync(collisionPath, "utf8");
let client = fs.readFileSync(clientPath, "utf8");
let rendererChanged = false;
let collisionChanged = false;
let clientChanged = false;

function replaceIn(which, search, replacement, label) {
  let source = which === "renderer" ? renderer : which === "collision" ? collision : client;
  if (source.includes(replacement)) {
    console.log(`[patch-build-door-interactions] already-patched ${which} ${label}`);
    return;
  }
  if (!source.includes(search)) {
    console.log(`[patch-build-door-interactions] skipped ${which} ${label}`);
    return;
  }
  source = source.replace(search, replacement);
  if (which === "renderer") { renderer = source; rendererChanged = true; }
  else if (which === "collision") { collision = source; collisionChanged = true; }
  else { client = source; clientChanged = true; }
  console.log(`[patch-build-door-interactions] patched ${which} ${label}`);
}

function insertAfter(which, anchor, insertion, label) {
  let source = which === "renderer" ? renderer : which === "collision" ? collision : client;
  if (source.includes(insertion)) {
    console.log(`[patch-build-door-interactions] already-patched ${which} ${label}`);
    return;
  }
  if (!source.includes(anchor)) {
    console.log(`[patch-build-door-interactions] skipped ${which} ${label}`);
    return;
  }
  source = source.replace(anchor, `${anchor}\n${insertion}`);
  if (which === "renderer") { renderer = source; rendererChanged = true; }
  else if (which === "collision") { collision = source; collisionChanged = true; }
  else { client = source; clientChanged = true; }
  console.log(`[patch-build-door-interactions] patched ${which} ${label}`);
}

replaceIn(
  "renderer",
  "    this.drawPart(ctx, definition, iso.x - isoCamX, iso.y - isoCamY, part.rotation, false, 1, part.floorLevel);",
  "    this.drawPart(ctx, definition, iso.x - isoCamX, iso.y - isoCamY, part.rotation, false, 1, part.floorLevel, part.isOpen === true);",
  "placed part passes open state",
);
replaceIn(
  "renderer",
  "    this.drawPart(ctx, definition, x, y, rotation, true, valid ? 1 : 0.75, floorLevel);",
  "    this.drawPart(ctx, definition, x, y, rotation, true, valid ? 1 : 0.75, floorLevel, false);",
  "preview closed state",
);
replaceIn(
  "renderer",
  "  private drawPart(ctx: CanvasRenderingContext2D, definition: BuildPartDefinition, x: number, y: number, rotation: BuildPartRotation, preview: boolean, intensity: number, floorLevel: number) {",
  "  private drawPart(ctx: CanvasRenderingContext2D, definition: BuildPartDefinition, x: number, y: number, rotation: BuildPartRotation, preview: boolean, intensity: number, floorLevel: number, isOpen = false) {",
  "drawPart open param",
);
replaceIn(
  "renderer",
  '      case "door":\n        this.drawWall(ctx, definition, x, visualY, width, height, rotation, preview);\n        this.drawDoorOnWall(ctx, x, visualY, width, height, rotation);\n        break;',
  '      case "door":\n        this.drawWall(ctx, definition, x, visualY, width, height, rotation, preview);\n        this.drawDoorOnWall(ctx, x, visualY, width, height, rotation, isOpen && !preview);\n        break;',
  "door draw open state",
);

const closedDoorMethod = `  private drawDoorOnWall(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, rotation: BuildPartRotation) {
    const plane = this.getWallPlane(x, y, width, height, rotation, BUILD_2P5D_WALL_HEIGHT);
    const sideWall = plane.edge === "east" || plane.edge === "west";
    const start = sideWall ? 0.42 : 0.34;
    const end = sideWall ? 0.58 : 0.66;
    const top = sideWall ? 0.58 : 0.64;
    const door = [
      this.pointOnWallPlane(plane, start, 0),
      this.pointOnWallPlane(plane, end, 0),
      this.pointOnWallPlane(plane, end, top),
      this.pointOnWallPlane(plane, start, top),
    ];

    ctx.save();
    ctx.fillStyle = "#4a2b16";
    ctx.strokeStyle = "#1f1308";
    ctx.lineWidth = 1.4;
    this.drawPolygon(ctx, door, true, true);
    ctx.fillStyle = "rgba(255,255,255,0.13)";
    const glintA = this.pointOnWallPlane(plane, end - 0.04, 0.08);
    const glintB = this.pointOnWallPlane(plane, end - 0.04, top - 0.08);
    this.strokePolyline(ctx, [glintA, glintB]);
    ctx.restore();
  }`;

const openDoorMethod = `  private drawDoorOnWall(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, rotation: BuildPartRotation, isOpen = false) {
    const plane = this.getWallPlane(x, y, width, height, rotation, BUILD_2P5D_WALL_HEIGHT);
    const sideWall = plane.edge === "east" || plane.edge === "west";
    const start = sideWall ? 0.42 : 0.34;
    const end = sideWall ? 0.58 : 0.66;
    const top = sideWall ? 0.58 : 0.64;

    ctx.save();
    ctx.fillStyle = isOpen ? "rgba(15,23,42,0.36)" : "#4a2b16";
    ctx.strokeStyle = "#1f1308";
    ctx.lineWidth = 1.4;

    const closedDoor = [
      this.pointOnWallPlane(plane, start, 0),
      this.pointOnWallPlane(plane, end, 0),
      this.pointOnWallPlane(plane, end, top),
      this.pointOnWallPlane(plane, start, top),
    ];
    if (!isOpen) {
      this.drawPolygon(ctx, closedDoor, true, true);
      ctx.fillStyle = "rgba(255,255,255,0.13)";
      this.strokePolyline(ctx, [this.pointOnWallPlane(plane, end - 0.04, 0.08), this.pointOnWallPlane(plane, end - 0.04, top - 0.08)]);
      ctx.restore();
      return;
    }

    this.drawPolygon(ctx, closedDoor, true, false);
    const hingeBase = this.pointOnWallPlane(plane, start, 0);
    const hingeTop = this.pointOnWallPlane(plane, start, top);
    const edgeDx = plane.baseEnd.x - plane.baseStart.x;
    const edgeDy = plane.baseEnd.y - plane.baseStart.y;
    const edgeLength = Math.max(1, Math.hypot(edgeDx, edgeDy));
    const openAmount = sideWall ? 28 : 34;
    const openSign = plane.edge === "north" || plane.edge === "east" ? 1 : -1;
    const offset = { x: (-edgeDy / edgeLength) * openAmount * openSign, y: (edgeDx / edgeLength) * openAmount * openSign };
    const panel = [
      hingeBase,
      { x: hingeBase.x + offset.x, y: hingeBase.y + offset.y },
      { x: hingeTop.x + offset.x, y: hingeTop.y + offset.y },
      hingeTop,
    ];
    ctx.fillStyle = "#5b341c";
    ctx.strokeStyle = "#1f1308";
    this.drawPolygon(ctx, panel, true, true);
    ctx.fillStyle = "rgba(250,204,21,0.85)";
    const knob = this.pointOnSegment(panel[1], panel[2], 0.42);
    ctx.beginPath();
    ctx.arc(knob.x, knob.y, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }`;
replaceIn("renderer", closedDoorMethod, openDoorMethod, "open door renderer");

replaceIn(
  "collision",
  '  if (definition.category === "door") return false;\n  return definition.category === "wall" || definition.category === "window";',
  '  if (definition.category === "door") return part.isOpen !== true;\n  return definition.category === "wall" || definition.category === "window";',
  "door open collision",
);

insertAfter(
  "client",
  'import { addBuildingToTileIndex, createDemoTileIndex, getAliveTileCreatures, getAliveTileResources, getTileBuildings } from "./demoTileIndex";',
  'import { BUILD_PARTS, type PlacedBuildPart } from "../buildings/buildPartCatalog";\nimport { buildGridToWorld } from "../buildings/buildGrid";\nimport { getBuildCollisionAtPosition } from "../buildings/buildCollision2p5d";\nimport { getBuildPartsForTile, readStoredBuildParts, toggleBuildDoorOpen } from "../buildings/buildPartStore";',
  "door and monster collision imports",
);

insertAfter(
  "client",
  'function findNearestCreature(creatures: CreaturePublicState[], position: Vector2, maxRange = 180) {\n  let nearest: CreaturePublicState | null = null;\n  let nearestDistance = Number.POSITIVE_INFINITY;\n  for (const creature of creatures) {\n    if (creature.hp <= 0) continue;\n    const distance = Math.hypot(creature.position.x - position.x, creature.position.y - position.y);\n    if (distance < nearestDistance) { nearest = creature; nearestDistance = distance; }\n  }\n  return nearest && nearestDistance <= maxRange ? nearest : null;\n}',
  'function findNearestDoorPart(parts: PlacedBuildPart[], position: Vector2, maxRange = 82) {\n  let nearest: PlacedBuildPart | null = null;\n  let nearestDistance = Number.POSITIVE_INFINITY;\n  for (const part of parts) {\n    const definition = BUILD_PARTS[part.partId];\n    if (definition?.category !== "door") continue;\n    const center = buildGridToWorld(part);\n    const distance = Math.hypot(center.x - position.x, center.y - position.y);\n    if (distance < nearestDistance) { nearest = part; nearestDistance = distance; }\n  }\n  return nearest && nearestDistance <= maxRange ? nearest : null;\n}',
  "nearest door helper",
);

replaceIn(
  "client",
  'function moveDemoCreatures(creatures: CreaturePublicState[], deltaSeconds: number, now: number, playerPosition: Vector2) {',
  'function moveDemoCreatures(creatures: CreaturePublicState[], deltaSeconds: number, now: number, playerPosition: Vector2, buildParts: PlacedBuildPart[] = []) {',
  "creature movement accepts build parts",
);
replaceIn(
  "client",
  '    const next = clampCreaturePosition(clampPositionToTile({\n      x: creature.position.x + Math.cos(baseAngle) * speed * speedMultiplier * deltaSeconds,\n      y: creature.position.y + Math.sin(baseAngle) * speed * speedMultiplier * deltaSeconds,\n    }));\n    const touchedEdge = next.x <= creatureMapMin + 4 || next.x >= creatureMapMax - 4 || next.y <= creatureMapMin + 4 || next.y >= creatureMapMax - 4;\n    if (touchedEdge) creatureWanderTargets.set(creature.id, createWanderTarget(creature, now + 7777));\n    creature.position.x = next.x;\n    creature.position.y = next.y;',
  '    const desiredNext = clampCreaturePosition(clampPositionToTile({\n      x: creature.position.x + Math.cos(baseAngle) * speed * speedMultiplier * deltaSeconds,\n      y: creature.position.y + Math.sin(baseAngle) * speed * speedMultiplier * deltaSeconds,\n    }));\n    const collision = buildParts.length > 0 ? getBuildCollisionAtPosition({ parts: buildParts, position: desiredNext, floorLevel: 0 }) : { blocked: false };\n    const next = collision.blocked ? creature.position : desiredNext;\n    const touchedEdge = next.x <= creatureMapMin + 4 || next.x >= creatureMapMax - 4 || next.y <= creatureMapMin + 4 || next.y >= creatureMapMax - 4;\n    if (touchedEdge || collision.blocked) creatureWanderTargets.set(creature.id, createWanderTarget(creature, now + 7777));\n    creature.position.x = next.x;\n    creature.position.y = next.y;',
  "creature wall collision",
);
replaceIn(
  "client",
  '      moveDemoCreatures(getCurrentCreatures(), deltaSeconds, now, demoPositionRef.current);',
  '      moveDemoCreatures(getCurrentCreatures(), deltaSeconds, now, demoPositionRef.current, getBuildPartsForTile(cachedBuildPartsRef.current ?? readStoredBuildParts(), demoTileRef.current));',
  "pass cached build parts to creatures",
);

replaceIn(
  "client",
  '    const target = findNearestCreature(getCurrentCreatures(), demoPositionRef.current);\n    if (!target) { setChatLines((prev) => [...prev.slice(-5), "[demo] 현재 타일 공격 범위 안에 몬스터가 없습니다."]); return; }',
  '    const nearestDoor = findNearestDoorPart(getBuildPartsForTile(readStoredBuildParts(), demoTileRef.current), demoPositionRef.current);\n    if (nearestDoor) {\n      const beforeOpen = nearestDoor.isOpen === true;\n      toggleBuildDoorOpen(nearestDoor.id);\n      setChatLines((prev) => [...prev.slice(-5), beforeOpen ? "[build] 문을 닫았습니다." : "[build] 문을 열었습니다."]);\n      applyDemoSnapshot(true);\n      return;\n    }\n    const target = findNearestCreature(getCurrentCreatures(), demoPositionRef.current);\n    if (!target) { setChatLines((prev) => [...prev.slice(-5), "[demo] 현재 타일 공격 범위 안에 몬스터가 없습니다."]); return; }',
  "attack toggles nearby door",
);

if (rendererChanged) fs.writeFileSync(rendererPath, renderer);
if (collisionChanged) fs.writeFileSync(collisionPath, collision);
if (clientChanged) fs.writeFileSync(clientPath, client);
