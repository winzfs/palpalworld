import type { Vector2 } from "@palpalworld/shared";

export const BUILD_GRID_SIZE = 48;

export type BuildGridPosition = {
  gridX: number;
  gridY: number;
};

export type BuildGridRect = BuildGridPosition & {
  width: number;
  height: number;
};

export function worldToBuildGrid(position: Vector2): BuildGridPosition {
  return {
    gridX: Math.round(position.x / BUILD_GRID_SIZE),
    gridY: Math.round(position.y / BUILD_GRID_SIZE),
  };
}

export function buildGridToWorld(position: BuildGridPosition): Vector2 {
  return {
    x: position.gridX * BUILD_GRID_SIZE,
    y: position.gridY * BUILD_GRID_SIZE,
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
