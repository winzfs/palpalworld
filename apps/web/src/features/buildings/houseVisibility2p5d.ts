import { BUILD_PARTS, type PlacedBuildPart } from "./buildPartCatalog";
import { getEdgeFromRotation } from "./buildPartOccupancy";

export type HouseVisibilityMode = "normal" | "editing" | "inside";

export type BuildPartVisibility = {
  alpha: number;
  outlineAlpha: number;
  hide: boolean;
  reason: "normal" | "selected-house" | "front-wall" | "roof-hidden" | "other-floor";
};

export function isRoofPart(part: PlacedBuildPart) {
  return BUILD_PARTS[part.partId]?.category === "roof";
}

export function isWallLikePart(part: PlacedBuildPart) {
  const category = BUILD_PARTS[part.partId]?.category;
  return category === "wall" || category === "door" || category === "window";
}

export function isFrontFacingWall(part: PlacedBuildPart) {
  if (!isWallLikePart(part)) return false;
  const edge = getEdgeFromRotation(part.rotation);
  return edge === "south" || edge === "east";
}

export function getBuildPartVisibility({
  part,
  selectedHouseId,
  activeFloorLevel,
  mode = "editing",
}: {
  part: PlacedBuildPart;
  selectedHouseId?: string | null;
  activeFloorLevel?: number | null;
  mode?: HouseVisibilityMode;
}): BuildPartVisibility {
  const inSelectedHouse = Boolean(selectedHouseId && part.houseId === selectedHouseId);
  const floorMismatch = typeof activeFloorLevel === "number" && part.floorLevel !== activeFloorLevel;

  if (!inSelectedHouse) {
    return {
      alpha: floorMismatch ? 0.72 : 1,
      outlineAlpha: 0.2,
      hide: false,
      reason: floorMismatch ? "other-floor" : "normal",
    };
  }

  if ((mode === "editing" || mode === "inside") && isRoofPart(part)) {
    return {
      alpha: mode === "inside" ? 0.08 : 0.22,
      outlineAlpha: 0.18,
      hide: false,
      reason: "roof-hidden",
    };
  }

  if ((mode === "editing" || mode === "inside") && isFrontFacingWall(part)) {
    return {
      alpha: mode === "inside" ? 0.18 : 0.38,
      outlineAlpha: 0.35,
      hide: false,
      reason: "front-wall",
    };
  }

  if (floorMismatch) {
    return {
      alpha: 0.38,
      outlineAlpha: 0.25,
      hide: false,
      reason: "other-floor",
    };
  }

  return {
    alpha: 1,
    outlineAlpha: 0.55,
    hide: false,
    reason: "selected-house",
  };
}
