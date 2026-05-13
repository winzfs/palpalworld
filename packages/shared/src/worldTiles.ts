import type { RegionId } from "./index";

export type MapDirection = "north" | "south" | "west" | "east";

export type MapTileRef = {
  regionId: RegionId;
  tileX: number;
  tileY: number;
};

export const MAP_TILE_SIZE = {
  width: 1200,
  height: 800,
  portalMargin: 36,
  portalRadius: 56,
} as const;

export const DEFAULT_PLAYER_TILE: MapTileRef = { regionId: "starter_meadow", tileX: 1, tileY: 1 };

export function isSameTile(a?: MapTileRef | null, b?: MapTileRef | null) {
  return Boolean(a && b && a.regionId === b.regionId && a.tileX === b.tileX && a.tileY === b.tileY);
}
