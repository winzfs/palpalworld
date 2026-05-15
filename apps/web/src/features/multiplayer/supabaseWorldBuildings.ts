import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import type { BuildingState, BuildingType } from "@palpalworld/shared";
import type { MapTileRef } from "../../../../../packages/shared/src/worldTiles";

export type WorldBuildingRow = {
  building_id: string;
  building_type: BuildingType;
  owner_player_id: string;
  x: number;
  y: number;
  region_id: MapTileRef["regionId"];
  tile_x: number;
  tile_y: number;
  hp: number;
  max_hp: number;
  deleted: boolean;
  updated_at: string;
};

export function buildingToRow(building: BuildingState): Omit<WorldBuildingRow, "updated_at"> {
  const currentTile = (building as { currentTile?: MapTileRef }).currentTile ?? { regionId: "starter_meadow", tileX: 1, tileY: 1 } as MapTileRef;
  return {
    building_id: building.id,
    building_type: building.type,
    owner_player_id: building.ownerPlayerId ?? "unknown",
    x: building.position.x,
    y: building.position.y,
    region_id: currentTile.regionId,
    tile_x: currentTile.tileX,
    tile_y: currentTile.tileY,
    hp: building.hp,
    max_hp: building.maxHp,
    deleted: false,
  };
}

export function rowToBuilding(row: WorldBuildingRow): BuildingState {
  return {
    id: row.building_id,
    type: row.building_type,
    ownerPlayerId: row.owner_player_id,
    position: { x: row.x, y: row.y },
    currentTile: { regionId: row.region_id, tileX: row.tile_x, tileY: row.tile_y },
    hp: row.hp,
    maxHp: row.max_hp,
  } as BuildingState;
}

export async function upsertWorldBuilding(client: SupabaseClient, building: BuildingState) {
  const row = buildingToRow(building);
  await client.from("world_buildings").upsert({
    ...row,
    updated_at: new Date().toISOString(),
  });
}

export async function markWorldBuildingDeleted(client: SupabaseClient, buildingId: string) {
  await client
    .from("world_buildings")
    .update({ deleted: true, updated_at: new Date().toISOString() })
    .eq("building_id", buildingId);
}

export async function fetchWorldBuildings(client: SupabaseClient, tile: MapTileRef | null) {
  let query = client
    .from("world_buildings")
    .select("building_id,building_type,owner_player_id,x,y,region_id,tile_x,tile_y,hp,max_hp,deleted,updated_at")
    .eq("deleted", false);

  if (tile) {
    query = query.eq("region_id", tile.regionId).eq("tile_x", tile.tileX).eq("tile_y", tile.tileY);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return (data as WorldBuildingRow[]).map(rowToBuilding);
}

export function subscribeWorldBuildings(client: SupabaseClient, onChange: () => void): RealtimeChannel {
  return client
    .channel("world_buildings_state_changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "world_buildings" }, onChange)
    .subscribe();
}
