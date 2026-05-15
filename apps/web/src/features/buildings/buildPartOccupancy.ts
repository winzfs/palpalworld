import type { BuildFloorLevel, BuildPartDefinition, BuildPartRotation, PlacedBuildPart } from "./buildPartCatalog";
import { BUILD_PARTS } from "./buildPartCatalog";

export type BuildEdge = "north" | "south" | "east" | "west";
export type BuildCorner = "nw" | "ne" | "sw" | "se";

export type BuildOccupancy =
  | { kind: "tile"; gridX: number; gridY: number; floorLevel: BuildFloorLevel; layer: string }
  | { kind: "edge"; gridX: number; gridY: number; floorLevel: BuildFloorLevel; edge: BuildEdge; layer: string }
  | { kind: "corner"; gridX: number; gridY: number; floorLevel: BuildFloorLevel; corner: BuildCorner; layer: string };

function normalizeRotation(rotation: BuildPartRotation): BuildPartRotation {
  return ((rotation % 360 + 360) % 360) as BuildPartRotation;
}

export function getEdgeFromRotation(rotation: BuildPartRotation): BuildEdge {
  switch (normalizeRotation(rotation)) {
    case 90:
      return "east";
    case 180:
      return "south";
    case 270:
      return "west";
    case 0:
    default:
      return "north";
  }
}

export function getBuildPartOccupancy(definition: BuildPartDefinition, gridX: number, gridY: number, floorLevel: BuildFloorLevel, rotation: BuildPartRotation): BuildOccupancy[] {
  if (definition.category === "wall" || definition.category === "door" || definition.category === "window") {
    return [{ kind: "edge", gridX, gridY, floorLevel, edge: getEdgeFromRotation(rotation), layer: definition.layer }];
  }

  if (definition.id.includes("corner_post")) {
    return [{ kind: "corner", gridX, gridY, floorLevel, corner: "nw", layer: definition.layer }];
  }

  const cells: BuildOccupancy[] = [];
  for (let y = 0; y < definition.height; y += 1) {
    for (let x = 0; x < definition.width; x += 1) {
      cells.push({ kind: "tile", gridX: gridX + x, gridY: gridY + y, floorLevel, layer: definition.layer });
    }
  }
  return cells;
}

export function getPlacedBuildPartOccupancy(part: PlacedBuildPart) {
  const definition = BUILD_PARTS[part.partId];
  if (!definition) return [];
  return getBuildPartOccupancy(definition, part.gridX, part.gridY, part.floorLevel, part.rotation);
}

export function getOccupancyKey(occupancy: BuildOccupancy) {
  if (occupancy.kind === "edge") return `${occupancy.kind}:${occupancy.gridX}:${occupancy.gridY}:${occupancy.floorLevel}:${occupancy.edge}:${occupancy.layer}`;
  if (occupancy.kind === "corner") return `${occupancy.kind}:${occupancy.gridX}:${occupancy.gridY}:${occupancy.floorLevel}:${occupancy.corner}:${occupancy.layer}`;
  return `${occupancy.kind}:${occupancy.gridX}:${occupancy.gridY}:${occupancy.floorLevel}:${occupancy.layer}`;
}

export function getEquivalentWallEdgeKey(occupancy: BuildOccupancy) {
  if (occupancy.kind !== "edge") return null;
  return getOccupancyKey({ ...occupancy, layer: "wall" });
}

export function hasOccupancyConflict(a: BuildOccupancy, b: BuildOccupancy) {
  return getOccupancyKey(a) === getOccupancyKey(b);
}

export function getOccupiedKeys(parts: PlacedBuildPart[]) {
  const keys = new Set<string>();
  for (const part of parts) {
    for (const occupancy of getPlacedBuildPartOccupancy(part)) keys.add(getOccupancyKey(occupancy));
  }
  return keys;
}

export function findReplaceableWallForPart({
  parts,
  candidateDefinition,
  gridX,
  gridY,
  floorLevel,
  rotation,
}: {
  parts: PlacedBuildPart[];
  candidateDefinition: BuildPartDefinition;
  gridX: number;
  gridY: number;
  floorLevel: BuildFloorLevel;
  rotation: BuildPartRotation;
}) {
  if (candidateDefinition.category !== "door" && candidateDefinition.category !== "window") return null;
  const candidateEdgeKeys = new Set(
    getBuildPartOccupancy(candidateDefinition, gridX, gridY, floorLevel, rotation)
      .map(getEquivalentWallEdgeKey)
      .filter(Boolean) as string[],
  );

  for (const part of parts) {
    const definition = BUILD_PARTS[part.partId];
    if (!definition || definition.category !== "wall") continue;
    const hasSameEdge = getPlacedBuildPartOccupancy(part).some((occupancy) => candidateEdgeKeys.has(getOccupancyKey(occupancy)));
    if (hasSameEdge) return part;
  }
  return null;
}

export function canReplaceWallWithPart(candidateDefinition: BuildPartDefinition) {
  return candidateDefinition.category === "door" || candidateDefinition.category === "window";
}
