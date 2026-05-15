import { BUILD_GRID_SIZE } from "./buildGrid";
import type { BuildPartRotation } from "./buildPartCatalog";

export const BUILD_TILE_SIZE_PX = BUILD_GRID_SIZE;
export const BUILD_WALL_THICKNESS_PX = 14;
export const BUILD_WALL_EDGE_OVERHANG_PX = 2;
export const BUILD_WALL_POST_SIZE_PX = 10;
export const BUILD_FLOOR_SLAB_DEPTH_PX = 8;
export const BUILD_FOUNDATION_SLAB_DEPTH_PX = 14;

export type BuildEdgeName = "north" | "east" | "south" | "west";

export type EdgeWallRect2p5d = {
  edge: BuildEdgeName;
  left: number;
  top: number;
  width: number;
  height: number;
  wallTop: number;
  horizontal: boolean;
};

export function getEdgeNameFromRotation(rotation: BuildPartRotation): BuildEdgeName {
  if (rotation === 90) return "east";
  if (rotation === 180) return "south";
  if (rotation === 270) return "west";
  return "north";
}

export function getTileBounds2p5d(x: number, y: number, width: number, height: number) {
  return {
    left: x - width / 2,
    top: y - height / 2,
    right: x + width / 2,
    bottom: y + height / 2,
    centerX: x,
    centerY: y,
  };
}

export function getEdgeWallRect2p5d({
  x,
  y,
  width,
  height,
  rotation,
  wallHeight,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: BuildPartRotation;
  wallHeight: number;
}): EdgeWallRect2p5d {
  const bounds = getTileBounds2p5d(x, y, width, height);
  const edge = getEdgeNameFromRotation(rotation);
  const thickness = BUILD_WALL_THICKNESS_PX;
  const overhang = BUILD_WALL_EDGE_OVERHANG_PX;

  if (edge === "east") {
    return { edge, left: bounds.right - thickness + overhang, top: bounds.top + 5, width: thickness, height: height - 10, wallTop: bounds.top + 5 - wallHeight + 12, horizontal: false };
  }
  if (edge === "south") {
    return { edge, left: bounds.left + 5, top: bounds.bottom - thickness + overhang, width: width - 10, height: thickness, wallTop: bounds.bottom - thickness + overhang - wallHeight + 12, horizontal: true };
  }
  if (edge === "west") {
    return { edge, left: bounds.left - overhang, top: bounds.top + 5, width: thickness, height: height - 10, wallTop: bounds.top + 5 - wallHeight + 12, horizontal: false };
  }
  return { edge, left: bounds.left + 5, top: bounds.top - overhang, width: width - 10, height: thickness, wallTop: bounds.top - overhang - wallHeight + 12, horizontal: true };
}

export function getEdgeSortBias2p5d(rotation: BuildPartRotation) {
  const edge = getEdgeNameFromRotation(rotation);
  if (edge === "north" || edge === "west") return -4;
  if (edge === "east") return 4;
  return 8;
}
