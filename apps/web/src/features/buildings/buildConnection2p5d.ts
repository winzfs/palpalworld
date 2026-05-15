import { BUILD_GRID_SIZE } from "./buildGrid";
import type { BuildPartRotation } from "./buildPartCatalog";
import { getEdgeNameFromRotation, getTileBounds2p5d, type BuildEdgeName } from "./buildProjection2p5d";

export const BUILD_CONNECTOR_SIZE_PX = 10;
export const BUILD_EDGE_INSET_PX = 5;
export const BUILD_EDGE_SEAM_WIDTH_PX = 4;

export type BuildConnectionPoint2p5d = {
  edge: BuildEdgeName;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  centerX: number;
  centerY: number;
  horizontal: boolean;
};

export function getEdgeConnectionPoint2p5d({
  x,
  y,
  width = BUILD_GRID_SIZE,
  height = BUILD_GRID_SIZE,
  rotation,
}: {
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation: BuildPartRotation;
}): BuildConnectionPoint2p5d {
  const bounds = getTileBounds2p5d(x, y, width, height);
  const edge = getEdgeNameFromRotation(rotation);
  if (edge === "north") {
    return { edge, startX: bounds.left + BUILD_EDGE_INSET_PX, startY: bounds.top, endX: bounds.right - BUILD_EDGE_INSET_PX, endY: bounds.top, centerX: x, centerY: bounds.top, horizontal: true };
  }
  if (edge === "south") {
    return { edge, startX: bounds.left + BUILD_EDGE_INSET_PX, startY: bounds.bottom, endX: bounds.right - BUILD_EDGE_INSET_PX, endY: bounds.bottom, centerX: x, centerY: bounds.bottom, horizontal: true };
  }
  if (edge === "east") {
    return { edge, startX: bounds.right, startY: bounds.top + BUILD_EDGE_INSET_PX, endX: bounds.right, endY: bounds.bottom - BUILD_EDGE_INSET_PX, centerX: bounds.right, centerY: y, horizontal: false };
  }
  return { edge, startX: bounds.left, startY: bounds.top + BUILD_EDGE_INSET_PX, endX: bounds.left, endY: bounds.bottom - BUILD_EDGE_INSET_PX, centerX: bounds.left, centerY: y, horizontal: false };
}

export function getAdjacentEdgeRotation(rotation: BuildPartRotation): BuildPartRotation {
  const next = (rotation + 180) % 360;
  return next as BuildPartRotation;
}

export function getEdgeEndpointRects2p5d(point: BuildConnectionPoint2p5d) {
  const size = BUILD_CONNECTOR_SIZE_PX;
  return [
    { left: point.startX - size / 2, top: point.startY - size / 2, width: size, height: size },
    { left: point.endX - size / 2, top: point.endY - size / 2, width: size, height: size },
  ];
}
