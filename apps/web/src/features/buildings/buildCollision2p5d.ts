import type { Vector2 } from "@palpalworld/shared";
import { BUILD_GRID_SIZE, buildGridToWorld, worldToBuildGrid } from "./buildGrid";
import { BUILD_PARTS, type PlacedBuildPart } from "./buildPartCatalog";
import { getEdgeFromRotation } from "./buildPartOccupancy";
import { getBuildPartsAtGrid, getBuildPartsNearGrid } from "./buildPartSpatialIndex2p5d";
import { findStairAtPosition } from "./stairTraversal2p5d";

export type BuildCollisionResult = {
  blocked: boolean;
  reason: "none" | "wall" | "object" | "other-floor";
  part?: PlacedBuildPart;
};

const PLAYER_COLLISION_RADIUS = 15;
const WALL_COLLISION_THICKNESS = 12;
const OBJECT_COLLISION_RADIUS = 24;

function distancePointToSegment(point: Vector2, a: Vector2, b: Vector2) {
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const wx = point.x - a.x;
  const wy = point.y - a.y;
  const lenSq = Math.max(1, vx * vx + vy * vy);
  const t = Math.max(0, Math.min(1, (wx * vx + wy * vy) / lenSq));
  const px = a.x + vx * t;
  const py = a.y + vy * t;
  return Math.hypot(point.x - px, point.y - py);
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
  if (edge === "north") return { a: left, b: top };
  if (edge === "east") return { a: top, b: right };
  if (edge === "south") return { a: right, b: bottom };
  return { a: bottom, b: left };
}

function isWallCollisionPart(part: PlacedBuildPart) {
  const definition = BUILD_PARTS[part.partId];
  if (!definition) return false;
  if (definition.category === "door") return false;
  return definition.category === "wall" || definition.category === "window";
}

function isObjectCollisionPart(part: PlacedBuildPart) {
  const definition = BUILD_PARTS[part.partId];
  if (!definition) return false;
  if (definition.category === "stairs" || definition.category === "floor" || definition.category === "roof") return false;
  return definition.blocksMove || definition.layer === "object" || definition.category === "furniture" || definition.category === "utility";
}

export function isOnStairTransition(parts: PlacedBuildPart[], position: Vector2) {
  const grid = worldToBuildGrid(position);
  return Boolean(findStairAtPosition(getBuildPartsNearGrid(parts, grid, 2), position.x, position.y));
}

export function getBuildCollisionAtPosition({
  parts,
  position,
  floorLevel,
}: {
  parts: PlacedBuildPart[];
  position: Vector2;
  floorLevel: number;
}): BuildCollisionResult {
  const grid = worldToBuildGrid(position);
  const candidates = getBuildPartsNearGrid(parts, grid, 2);
  const onStair = Boolean(findStairAtPosition(candidates, position.x, position.y));
  const activeFloor = Math.round(floorLevel);

  for (const part of candidates) {
    if (Math.abs(part.floorLevel - activeFloor) > 0) continue;
    if (onStair && BUILD_PARTS[part.partId]?.category !== "floor") continue;

    if (isWallCollisionPart(part)) {
      const segment = getWallSegment(part);
      const segmentDistance = distancePointToSegment(position, segment.a, segment.b);
      if (segmentDistance <= PLAYER_COLLISION_RADIUS + WALL_COLLISION_THICKNESS) return { blocked: true, reason: "wall", part };
    }

    if (isObjectCollisionPart(part)) {
      const center = buildGridToWorld(part);
      if (Math.hypot(position.x - center.x, position.y - center.y) <= PLAYER_COLLISION_RADIUS + OBJECT_COLLISION_RADIUS) return { blocked: true, reason: "object", part };
    }
  }

  return { blocked: false, reason: "none" };
}

export function isOverWalkableBuildCell(parts: PlacedBuildPart[], position: Vector2, floorLevel: number) {
  const grid = worldToBuildGrid(position);
  return getBuildPartsAtGrid(parts, grid).some((part) => {
    const definition = BUILD_PARTS[part.partId];
    return definition?.category === "floor" && part.floorLevel === Math.round(floorLevel);
  });
}
