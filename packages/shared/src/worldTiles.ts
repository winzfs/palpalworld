import type { RegionId, Vector2 } from "./index";

export type MapDirection = "north" | "south" | "west" | "east";

export type MapTileRef = {
  regionId: RegionId;
  tileX: number;
  tileY: number;
};

export type RegionThemeDefinition = {
  regionId: RegionId;
  name: string;
  description: string;
  columns: number;
  rows: number;
};

export type MapTileDefinition = MapTileRef & {
  id: string;
  name: string;
  description: string;
  theme: RegionThemeDefinition;
  exits: Partial<Record<MapDirection, MapTileRef>>;
};

export const MAP_TILE_SIZE = {
  width: 3000,
  height: 3000,
  portalMargin: 72,
  portalRadius: 72,
} as const;

export const REGION_THEMES: Record<string, RegionThemeDefinition> = {
  starter_meadow: {
    regionId: "starter_meadow",
    name: "초록 초원 지대",
    description: "여러 초원 타일이 이어진 시작 지역입니다.",
    columns: 3,
    rows: 3,
  },
  stone_hills: {
    regionId: "stone_hills",
    name: "바위 고원 지대",
    description: "광석과 돌무더기가 많은 고원 지역입니다.",
    columns: 3,
    rows: 3,
  },
};

export const STARTER_TILE_COLUMNS = REGION_THEMES.starter_meadow.columns;
export const STARTER_TILE_ROWS = REGION_THEMES.starter_meadow.rows;
export const DEFAULT_PLAYER_TILE: MapTileRef = { regionId: "starter_meadow", tileX: 1, tileY: 1 };

const regionTileNames: Record<string, string[]> = {
  starter_meadow: [
    "초원 서북 들판",
    "바람 언덕",
    "작은 숲길",
    "서쪽 초원",
    "시작 초원",
    "동쪽 초원길",
    "남쪽 꽃밭",
    "바위 초지",
    "오래된 터",
  ],
  stone_hills: [
    "고원 서북부",
    "부서진 바위길",
    "마른 능선",
    "고원 입구",
    "바위 고원 중심",
    "붉은 암벽길",
    "먼지 골짜기",
    "광석 언덕",
    "동쪽 절벽",
  ],
};

function getRegionTheme(regionId: RegionId) {
  return REGION_THEMES[String(regionId)] ?? null;
}

export function isSameTile(a?: MapTileRef | null, b?: MapTileRef | null) {
  return Boolean(a && b && a.regionId === b.regionId && a.tileX === b.tileX && a.tileY === b.tileY);
}

export function isTileInsideGrid(tile: MapTileRef) {
  const theme = getRegionTheme(tile.regionId);
  return Boolean(theme && tile.tileX >= 0 && tile.tileX < theme.columns && tile.tileY >= 0 && tile.tileY < theme.rows);
}

export function getTileName(tile: MapTileRef) {
  const theme = getRegionTheme(tile.regionId);
  const names = regionTileNames[String(tile.regionId)] ?? [];
  return names[tile.tileY * (theme?.columns ?? 1) + tile.tileX] ?? `${theme?.name ?? "지역"} ${tile.tileX},${tile.tileY}`;
}

export function getStarterTileName(tileX: number, tileY: number) {
  return getTileName({ regionId: "starter_meadow", tileX, tileY });
}

function getCrossRegionExit(tile: MapTileRef, direction: MapDirection): MapTileRef | null {
  if (tile.regionId === "starter_meadow" && direction === "east" && tile.tileX === 2 && tile.tileY === 1) {
    return { regionId: "stone_hills", tileX: 0, tileY: 1 };
  }
  if (tile.regionId === "stone_hills" && direction === "west" && tile.tileX === 0 && tile.tileY === 1) {
    return { regionId: "starter_meadow", tileX: 2, tileY: 1 };
  }
  return null;
}

export function getMapTile(tile: MapTileRef | null | undefined): MapTileDefinition | null {
  if (!tile || !isTileInsideGrid(tile)) return null;
  const theme = getRegionTheme(tile.regionId);
  if (!theme) return null;

  const exits: MapTileDefinition["exits"] = {};
  if (tile.tileY > 0) exits.north = { ...tile, tileY: tile.tileY - 1 };
  if (tile.tileY < theme.rows - 1) exits.south = { ...tile, tileY: tile.tileY + 1 };
  if (tile.tileX > 0) exits.west = { ...tile, tileX: tile.tileX - 1 };
  if (tile.tileX < theme.columns - 1) exits.east = { ...tile, tileX: tile.tileX + 1 };

  for (const direction of ["north", "south", "west", "east"] as MapDirection[]) {
    const crossExit = getCrossRegionExit(tile, direction);
    if (crossExit) exits[direction] = crossExit;
  }

  return {
    ...tile,
    id: `${tile.regionId}_${tile.tileX}_${tile.tileY}`,
    name: getTileName(tile),
    description: `${theme.name}에 속한 3000×3000 맵 타일입니다.`,
    theme,
    exits,
  };
}

export function getNeighborTile(tile: MapTileRef, direction: MapDirection) {
  return getMapTile(tile)?.exits[direction] ?? null;
}

export function getAllTilesInRegion(regionId: RegionId) {
  const theme = getRegionTheme(regionId);
  const result: MapTileDefinition[] = [];
  if (!theme) return result;
  for (let tileY = 0; tileY < theme.rows; tileY += 1) {
    for (let tileX = 0; tileX < theme.columns; tileX += 1) {
      const tile = getMapTile({ regionId, tileX, tileY });
      if (tile) result.push(tile);
    }
  }
  return result;
}

export function getAllStarterTiles() {
  return getAllTilesInRegion("starter_meadow");
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
  if (entityId.includes("ore") || entityId.includes("rockturtle")) return { regionId: "stone_hills", tileX: 1, tileY: 2 };
  if (entityId.includes("coal")) return { regionId: "stone_hills", tileX: 2, tileY: 2 };
  if (entityId.includes("hardwood") || entityId.includes("mossboar")) return { regionId: "starter_meadow", tileX: 2, tileY: 0 };
  return DEFAULT_PLAYER_TILE;
}
