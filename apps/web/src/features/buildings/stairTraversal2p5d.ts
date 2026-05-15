import { BUILD_GRID_SIZE, buildGridToWorld } from "./buildGrid";
import { BUILD_PARTS, type BuildPartRotation, type PlacedBuildPart } from "./buildPartCatalog";
import { BUILD_2P5D_FLOOR_HEIGHT } from "./buildPartVisual2p5d";

export type StairTraversalSegment = {
  partId: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  startFloorLevel: number;
  endFloorLevel: number;
  length: number;
  width: number;
};

function directionFromRotation(rotation: BuildPartRotation) {
  switch (rotation) {
    case 90:
      return { x: 1, y: 0 };
    case 180:
      return { x: 0, y: 1 };
    case 270:
      return { x: -1, y: 0 };
    case 0:
    default:
      return { x: 0, y: -1 };
  }
}

export function isTraversableStairPart(part: PlacedBuildPart) {
  const definition = BUILD_PARTS[part.partId];
  return Boolean(definition && definition.category === "stairs" && definition.connectsFloorLevelDelta !== 0);
}

export function getStairTraversalSegment(part: PlacedBuildPart): StairTraversalSegment | null {
  const definition = BUILD_PARTS[part.partId];
  if (!definition || definition.category !== "stairs" || definition.connectsFloorLevelDelta === 0) return null;
  const center = buildGridToWorld(part);
  const direction = directionFromRotation(part.rotation);
  const length = Math.max(definition.height, definition.width, 2) * BUILD_GRID_SIZE;
  const width = BUILD_GRID_SIZE * 0.72;
  const halfLength = length / 2;
  const startFloorLevel = part.floorLevel;
  const endFloorLevel = part.floorLevel + definition.connectsFloorLevelDelta;

  return {
    partId: part.id,
    startX: center.x - direction.x * halfLength,
    startY: center.y - direction.y * halfLength,
    endX: center.x + direction.x * halfLength,
    endY: center.y + direction.y * halfLength,
    startFloorLevel,
    endFloorLevel,
    length,
    width,
  };
}

export function getStairProgress(segment: StairTraversalSegment, x: number, y: number) {
  const vx = segment.endX - segment.startX;
  const vy = segment.endY - segment.startY;
  const wx = x - segment.startX;
  const wy = y - segment.startY;
  const lenSq = Math.max(1, vx * vx + vy * vy);
  return Math.max(0, Math.min(1, (wx * vx + wy * vy) / lenSq));
}

export function getDistanceToStairSegment(segment: StairTraversalSegment, x: number, y: number) {
  const progress = getStairProgress(segment, x, y);
  const px = segment.startX + (segment.endX - segment.startX) * progress;
  const py = segment.startY + (segment.endY - segment.startY) * progress;
  return Math.hypot(x - px, y - py);
}

export function getFloorLevelOnStair(segment: StairTraversalSegment, x: number, y: number) {
  const progress = getStairProgress(segment, x, y);
  return segment.startFloorLevel + (segment.endFloorLevel - segment.startFloorLevel) * progress;
}

export function getFloorYOffsetOnStair(segment: StairTraversalSegment, x: number, y: number) {
  return getFloorLevelOnStair(segment, x, y) * BUILD_2P5D_FLOOR_HEIGHT;
}

export function findStairAtPosition(parts: PlacedBuildPart[], x: number, y: number) {
  let best: { part: PlacedBuildPart; segment: StairTraversalSegment; distance: number } | null = null;
  for (const part of parts) {
    const segment = getStairTraversalSegment(part);
    if (!segment) continue;
    const distance = getDistanceToStairSegment(segment, x, y);
    if (distance <= segment.width / 2 && (!best || distance < best.distance)) best = { part, segment, distance };
  }
  return best;
}
