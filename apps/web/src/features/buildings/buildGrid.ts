import type { Vector2 } from "@palpalworld/shared";

export const BUILD_GRID_SIZE = 48;
export const BUILD_ISO_TILE_WIDTH = BUILD_GRID_SIZE;
export const BUILD_ISO_TILE_HEIGHT = BUILD_GRID_SIZE * 0.62;
export const BUILD_ISO_WORLD_ORIGIN_X = 1500;
export const BUILD_ISO_WORLD_ORIGIN_Y = 620;

export type BuildGridPosition = {
  gridX: number;
  gridY: number;
};

export type BuildGridRect = BuildGridPosition & {
  width: number;
  height: number;
};

export function worldToBuildGrid(position: Vector2): BuildGridPosition {
  const isoX = position.x - BUILD_ISO_WORLD_ORIGIN_X;
  const isoY = position.y - BUILD_ISO_WORLD_ORIGIN_Y;
  const halfW = BUILD_ISO_TILE_WIDTH / 2;
  const halfH = BUILD_ISO_TILE_HEIGHT / 2;
  return {
    gridX: Math.round(isoX / (2 * halfW) + isoY / (2 * halfH)),
    gridY: Math.round(-isoX / (2 * halfW) + isoY / (2 * halfH)),
  };
}

export function buildGridToWorld(position: BuildGridPosition): Vector2 {
  return {
    x: BUILD_ISO_WORLD_ORIGIN_X + (position.gridX - position.gridY) * (BUILD_ISO_TILE_WIDTH / 2),
    y: BUILD_ISO_WORLD_ORIGIN_Y + (position.gridX + position.gridY) * (BUILD_ISO_TILE_HEIGHT / 2),
  };
}

export function snapWorldToBuildGrid(position: Vector2): Vector2 {
  return buildGridToWorld(worldToBuildGrid(position));
}

export function getBuildGridRectCells(rect: BuildGridRect): BuildGridPosition[] {
  const cells: BuildGridPosition[] = [];
  for (let y = 0; y < rect.height; y += 1) {
    for (let x = 0; x < rect.width; x += 1) {
      cells.push({ gridX: rect.gridX + x, gridY: rect.gridY + y });
    }
  }
  return cells;
}

export function getBuildGridKey(position: BuildGridPosition) {
  return `${position.gridX}:${position.gridY}`;
}

export function getBuildGridRectKey(rect: BuildGridRect) {
  return `${rect.gridX}:${rect.gridY}:${rect.width}:${rect.height}`;
}

export function isSameBuildGridPosition(a: BuildGridPosition, b: BuildGridPosition) {
  return a.gridX === b.gridX && a.gridY === b.gridY;
}

export function getBuildGridManhattanDistance(a: BuildGridPosition, b: BuildGridPosition) {
  return Math.abs(a.gridX - b.gridX) + Math.abs(a.gridY - b.gridY);
}

export function getBuildGridNeighbors(position: BuildGridPosition): BuildGridPosition[] {
  return [
    { gridX: position.gridX, gridY: position.gridY - 1 },
    { gridX: position.gridX + 1, gridY: position.gridY },
    { gridX: position.gridX, gridY: position.gridY + 1 },
    { gridX: position.gridX - 1, gridY: position.gridY },
  ];
}
