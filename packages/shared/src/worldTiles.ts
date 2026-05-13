import type { RegionId, Vector2 } from "./index";

export type MapDirection = "north" | "south" | "west" | "east";

export type MapTileRef = {
  regionId: RegionId;
  tileX: number;
  tileY: number;
};

export type MapTileDefinition = MapTileRef & {
  id: string;
  name: string;
  description: string;
  exits: Partial<Record<MapDirection, MapTileRef>>;
};

export const MAP_TILE_SIZE = {
  width: 3000,
  height: 3000,
  portalMargin: 72,
  portalRadius: 72,
} as const;

export const STARTER_TILE_COLUMNS = 3;
export const STARTER_TILE_ROWS = 3;
export const DEFAULT_PLAYER_TILE: MapTileRef = { regionId: "starter_meadow", tileX: 1, tileY: 1 };

const starterNames = [
  "초원 서북 들판",
  "바람 언덕",
  "작은 숲길",
  "서쪽 초원",
  "시작 초원",
  "물가 초원",
  "남쪽 꽃밭",
  "바위 초지",
  "오래된 터",
];

export function isSameTile(a?: MapTileRef | null, b?: MapTileRef | null) {
  return Boolean(a && b && a.regionId === b.regionId && a.tileX === b.tileX && a.tileY === b.tileY);
}

export function isTileInsideGrid(tile: MapTileRef) {
  return tile.regionId === "starter_meadow" && tile.tileX >= 0 && tile.tileX < STARTER_TILE_COLUMNS && tile.tileY >= 0 && tile.tileY < STARTER_TILE_ROWS;
}

export function getStarterTileName(tileX: number, tileY: number) {
  return starterNames[tileY * STARTER_TILE_COLUMNS + tileX] ?? `초원 ${tileX},${tileY}`;
}

export function getMapTile(tile: MapTileRef | null | undefined): MapTileDefinition | null {
  if (!tile || !isTileInsideGrid(tile)) return null;
  const exits: MapTileDefinition["exits"] = {};
  if (tile.tileY > 0) exits.north = { ...tile, tileY: tile.tileY - 1 };
  if (tile.tileY < STARTER_TILE_ROWS - 1) exits.south = { ...tile, tileY: tile.tileY + 1 };
  if (tile.tileX > 0) exits.west = { ...tile, tileX: tile.tileX - 1 };
  if (tile.tileX < STARTER_TILE_COLUMNS - 1) exits.east = { ...tile, tileX: tile.tileX + 1 };
  return {
    ...tile,
    id: `${tile.regionId}_${tile.tileX}_${tile.tileY}`,
    name: getStarterTileName(tile.tileX, tile.tileY),
    description: "초록빛 초원을 이루는 하나의 3000×3000 맵 타일입니다.",
    exits,
  };
}

export function getNeighborTile(tile: MapTileRef, direction: MapDirection) {
  return getMapTile(tile)?.exits[direction] ?? null;
}

export function getAllStarterTiles() {
  const result: MapTileDefinition[] = [];
  for (let tileY = 0; tileY < STARTER_TILE_ROWS; tileY += 1) {
    for (let tileX = 0; tileX < STARTER_TILE_COLUMNS; tileX += 1) {
      const tile = getMapTile({ regionId: "starter_meadow", tileX, tileY });
      if (tile) result.push(tile);
    }
  }
  return result;
}

export function clampPositionToTile(position: Vector2): Vector2 {
  return {
    x: Math.max(0, Math.min(MAP_TILE_SIZE.width, position.x)),
    y: Math.max(0, Math.min(MAP_TILE_SIZE.height, position.y)),
  };
}

export function getPortalPosition(direction: MapDirection): Vector2 {
  if (direction === "north") return { x: MAP_TILE_SIZE.width / 2, y: MAP_TILE_SIZE.portalMargin };
  if (direction === "south") return { x: MAP_TILE_SIZE.width / 2, y: MAP_TILE_SIZE.height - MAP_TILE_SIZE.portalMargin };
  if (direction === "west") return { x: MAP_TILE_SIZE.portalMargin, y: MAP_TILE_SIZE.height / 2 };
  return { x: MAP_TILE_SIZE.width - MAP_TILE_SIZE.portalMargin, y: MAP_TILE_SIZE.height / 2 };
}

export function getPortalDirectionAtPosition(position: Vector2, currentTile: MapTileRef): MapDirection | null {
  const tile = getMapTile(currentTile);
  if (!tile) return null;
  const directions: MapDirection[] = ["north", "south", "west", "east"];
  for (const direction of directions) {
    if (!tile.exits[direction]) continue;
    const portal = getPortalPosition(direction);
    if (Math.hypot(position.x - portal.x, position.y - portal.y) <= MAP_TILE_SIZE.portalRadius) return direction;
  }
  return null;
}

export function getSpawnPositionAfterTravel(direction: MapDirection): Vector2 {
  if (direction === "east") return { x: MAP_TILE_SIZE.portalMargin + 96, y: MAP_TILE_SIZE.height / 2 };
  if (direction === "west") return { x: MAP_TILE_SIZE.width - MAP_TILE_SIZE.portalMargin - 96, y: MAP_TILE_SIZE.height / 2 };
  if (direction === "south") return { x: MAP_TILE_SIZE.width / 2, y: MAP_TILE_SIZE.portalMargin + 96 };
  return { x: MAP_TILE_SIZE.width / 2, y: MAP_TILE_SIZE.height - MAP_TILE_SIZE.portalMargin - 96 };
}

export function getEntityTileById(entityId: string): MapTileRef {
  if (entityId.includes("fiber") || entityId.includes("leafbun-2")) return { regionId: "starter_meadow", tileX: 1, tileY: 0 };
  if (entityId.includes("berry") || entityId.includes("droplet")) return { regionId: "starter_meadow", tileX: 2, tileY: 1 };
  if (entityId.includes("ore") || entityId.includes("rockturtle")) return { regionId: "starter_meadow", tileX: 1, tileY: 2 };
  if (entityId.includes("coal")) return { regionId: "starter_meadow", tileX: 2, tileY: 2 };
  if (entityId.includes("hardwood") || entityId.includes("mossboar")) return { regionId: "starter_meadow", tileX: 2, tileY: 0 };
  return DEFAULT_PLAYER_TILE;
}
