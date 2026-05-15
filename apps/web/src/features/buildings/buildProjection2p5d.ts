import { BUILD_GRID_SIZE } from "./buildGrid";
import type { BuildPartRotation } from "./buildPartCatalog";

export const BUILD_TILE_SIZE_PX = BUILD_GRID_SIZE;
export const BUILD_WALL_THICKNESS_PX = 14;
export const BUILD_WALL_EDGE_OVERHANG_PX = 2;
export const BUILD_WALL_POST_SIZE_PX = 10;
export const BUILD_FLOOR_SLAB_DEPTH_PX = 8;
export const BUILD_FOUNDATION_SLAB_DEPTH_PX = 14;

export const ISO_TILE_WIDTH = BUILD_GRID_SIZE;
export const ISO_TILE_HEIGHT = BUILD_GRID_SIZE * 0.62;
export const ISO_SLAB_DEPTH = 6;
export const ISO_FOUNDATION_SLAB_DEPTH = 10;
export const ISO_WALL_HEIGHT = 52;
export const ISO_LOW_WALL_HEIGHT = 26;
export const ISO_SIDE_WALL_THICKNESS = 8;
export const ISO_ROOF_RISE = 34;

export type BuildEdgeName = "north" | "east" | "south" | "west";

export type IsoPoint = { x: number; y: number };

export type IsoTilePoints2p5d = {
  top: IsoPoint;
  right: IsoPoint;
  bottom: IsoPoint;
  left: IsoPoint;
  center: IsoPoint;
};

export type IsoEdge2p5d = {
  edge: BuildEdgeName;
  start: IsoPoint;
  end: IsoPoint;
  horizontalOrFacing: boolean;
  sideFacing: boolean;
};

export type IsoWallPlane2p5d = IsoEdge2p5d & {
  baseStart: IsoPoint;
  baseEnd: IsoPoint;
  topStart: IsoPoint;
  topEnd: IsoPoint;
  wallHeight: number;
};

export type IsoFloorSlab2p5d = {
  topFace: IsoPoint[];
  rightFace: IsoPoint[];
  bottomFace: IsoPoint[];
  leftFace: IsoPoint[];
};

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

export function getIsoTilePoints2p5d({
  x,
  y,
  width,
  height,
}: {
  x: number;
  y: number;
  width?: number;
  height?: number;
}): IsoTilePoints2p5d {
  const tileWidth = width ?? ISO_TILE_WIDTH;
  const tileHeight = height ?? ISO_TILE_HEIGHT;
  return {
    top: { x, y: y - tileHeight / 2 },
    right: { x: x + tileWidth / 2, y },
    bottom: { x, y: y + tileHeight / 2 },
    left: { x: x - tileWidth / 2, y },
    center: { x, y },
  };
}

export function getIsoTilePolygon2p5d(args: { x: number; y: number; width?: number; height?: number }): IsoPoint[] {
  const tile = getIsoTilePoints2p5d(args);
  return [tile.top, tile.right, tile.bottom, tile.left];
}

export function getIsoEdgeFromRotation(rotation: BuildPartRotation, tilePoints: IsoTilePoints2p5d): IsoEdge2p5d {
  const edge = getEdgeNameFromRotation(rotation);
  if (edge === "east") {
    return { edge, start: tilePoints.top, end: tilePoints.right, horizontalOrFacing: false, sideFacing: true };
  }
  if (edge === "south") {
    return { edge, start: tilePoints.right, end: tilePoints.bottom, horizontalOrFacing: true, sideFacing: false };
  }
  if (edge === "west") {
    return { edge, start: tilePoints.bottom, end: tilePoints.left, horizontalOrFacing: false, sideFacing: true };
  }
  return { edge, start: tilePoints.left, end: tilePoints.top, horizontalOrFacing: true, sideFacing: false };
}

export function getIsoWallPlane2p5d({
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
}): IsoWallPlane2p5d {
  const tilePoints = getIsoTilePoints2p5d({ x, y, width, height: height * 0.62 });
  const edge = getIsoEdgeFromRotation(rotation, tilePoints);
  const topStart = { x: edge.start.x, y: edge.start.y - wallHeight };
  const topEnd = { x: edge.end.x, y: edge.end.y - wallHeight };
  return {
    ...edge,
    baseStart: edge.start,
    baseEnd: edge.end,
    topStart,
    topEnd,
    wallHeight,
  };
}

export function getIsoFloorSlab2p5d({ tilePoints, slabDepth }: { tilePoints: IsoTilePoints2p5d; slabDepth: number }): IsoFloorSlab2p5d {
  const bottom = { x: tilePoints.bottom.x, y: tilePoints.bottom.y + slabDepth };
  const right = { x: tilePoints.right.x, y: tilePoints.right.y + slabDepth };
  const left = { x: tilePoints.left.x, y: tilePoints.left.y + slabDepth };
  return {
    topFace: [tilePoints.top, tilePoints.right, tilePoints.bottom, tilePoints.left],
    rightFace: [tilePoints.right, right, bottom, tilePoints.bottom],
    bottomFace: [tilePoints.bottom, bottom, left, tilePoints.left],
    leftFace: [tilePoints.left, tilePoints.bottom, bottom, left],
  };
}

export function getIsoStairRamp2p5d({ tilePoints, rotation, floorHeight }: { tilePoints: IsoTilePoints2p5d; rotation: BuildPartRotation; floorHeight: number }) {
  const edge = getIsoEdgeFromRotation(rotation, tilePoints);
  const oppositeRotation = (((rotation + 180) % 360) as BuildPartRotation);
  const opposite = getIsoEdgeFromRotation(oppositeRotation, tilePoints);
  return {
    startEdge: edge,
    endEdge: opposite,
    ramp: [edge.start, edge.end, { x: opposite.end.x, y: opposite.end.y - floorHeight }, { x: opposite.start.x, y: opposite.start.y - floorHeight }],
  };
}

export function getIsoRoofPlane2p5d({ tilePoints, rotation, roofRise }: { tilePoints: IsoTilePoints2p5d; rotation: BuildPartRotation; roofRise: number }) {
  const northSouth = rotation === 0 || rotation === 180;
  const ridgeStart = northSouth
    ? { x: (tilePoints.left.x + tilePoints.top.x) / 2, y: (tilePoints.left.y + tilePoints.top.y) / 2 - roofRise }
    : { x: (tilePoints.top.x + tilePoints.right.x) / 2, y: (tilePoints.top.y + tilePoints.right.y) / 2 - roofRise };
  const ridgeEnd = northSouth
    ? { x: (tilePoints.right.x + tilePoints.bottom.x) / 2, y: (tilePoints.right.y + tilePoints.bottom.y) / 2 - roofRise }
    : { x: (tilePoints.bottom.x + tilePoints.left.x) / 2, y: (tilePoints.bottom.y + tilePoints.left.y) / 2 - roofRise };
  return { ridgeStart, ridgeEnd };
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

export const ISO_FLOOR_HEIGHT = 58;

export function buildGridToIsoCenter(gridX: number, gridY: number): IsoPoint {
  return {
    x: (gridX - gridY) * (ISO_TILE_WIDTH / 2),
    y: (gridX + gridY) * (ISO_TILE_HEIGHT / 2),
  };
}

export function worldCameraToIsoBuildCamera(
  worldCamX: number,
  worldCamY: number,
  viewWidth: number,
  viewHeight: number,
): IsoPoint {
  const px = worldCamX + viewWidth / 2;
  const py = worldCamY + viewHeight / 2;
  const playerIsoX = (px - py) / 2;
  const playerIsoY = (px + py) * ISO_TILE_HEIGHT / (2 * BUILD_GRID_SIZE);
  return { x: playerIsoX - viewWidth / 2, y: playerIsoY - viewHeight / 2 };
}

export function screenToIsoBuildGrid(
  screenX: number,
  screenY: number,
  isoCamX: number,
  isoCamY: number,
): { gridX: number; gridY: number } {
  const isoX = screenX + isoCamX;
  const isoY = screenY + isoCamY;
  const halfW = ISO_TILE_WIDTH / 2;
  const halfH = ISO_TILE_HEIGHT / 2;
  return {
    gridX: Math.round(isoX / (2 * halfW) + isoY / (2 * halfH)),
    gridY: Math.round(-isoX / (2 * halfW) + isoY / (2 * halfH)),
  };
}
