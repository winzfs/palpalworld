import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import type { PlacedBuildPart } from "../buildings/buildPartCatalog";
import { getSupabaseClient, isSupabaseMultiplayerEnabled } from "./supabaseMultiplayer";

export type WorldBuildPartRow = {
  id: string;
  house_id: string | null;
  part_id: string;
  owner_player_id: string;
  region_id: string;
  tile_x: number;
  tile_y: number;
  grid_x: number;
  grid_y: number;
  floor_level: number;
  rotation: number;
  hp: number;
  max_hp: number;
  created_at: number;
  updated_at: number;
};

export function isBuildPartSyncEnabled() {
  return isSupabaseMultiplayerEnabled();
}

export function getBuildPartSyncClient() {
  return getSupabaseClient();
}

export function buildPartToRow(part: PlacedBuildPart): WorldBuildPartRow {
  return {
    id: part.id,
    house_id: part.houseId ?? null,
    part_id: part.partId,
    owner_player_id: part.ownerPlayerId,
    region_id: part.regionId,
    tile_x: part.tileX,
    tile_y: part.tileY,
    grid_x: part.gridX,
    grid_y: part.gridY,
    floor_level: part.floorLevel,
    rotation: part.rotation,
    hp: part.hp,
    max_hp: part.maxHp,
    created_at: part.createdAt,
    updated_at: part.updatedAt,
  };
}

export function rowToBuildPart(row: WorldBuildPartRow): PlacedBuildPart {
  return {
    id: row.id,
    houseId: row.house_id ?? undefined,
    partId: row.part_id as PlacedBuildPart["partId"],
    ownerPlayerId: row.owner_player_id,
    regionId: row.region_id,
    tileX: row.tile_x,
    tileY: row.tile_y,
    gridX: row.grid_x,
    gridY: row.grid_y,
    floorLevel: row.floor_level as PlacedBuildPart["floorLevel"],
    rotation: row.rotation as PlacedBuildPart["rotation"],
    hp: row.hp,
    maxHp: row.max_hp,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchWorldBuildParts(client: SupabaseClient, regionId?: string) {
  let query = client
    .from("world_build_parts")
    .select("id,house_id,part_id,owner_player_id,region_id,tile_x,tile_y,grid_x,grid_y,floor_level,rotation,hp,max_hp,created_at,updated_at");

  if (regionId) query = query.eq("region_id", regionId);

  const { data, error } = await query;
  if (error || !data) return [];
  return (data as WorldBuildPartRow[]).map(rowToBuildPart);
}

export async function upsertWorldBuildPart(client: SupabaseClient, part: PlacedBuildPart) {
  await client.from("world_build_parts").upsert(buildPartToRow(part));
}

export async function deleteWorldBuildPart(client: SupabaseClient, partId: string) {
  await client.from("world_build_parts").delete().eq("id", partId);
}

export function subscribeWorldBuildParts(
  client: SupabaseClient,
  onChange: (payload: { eventType: string; part?: PlacedBuildPart; oldId?: string }) => void,
): RealtimeChannel {
  return client
    .channel("world_build_parts_changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "world_build_parts" }, (payload) => {
      if (payload.eventType === "DELETE") {
        const oldRow = payload.old as Partial<WorldBuildPartRow> | null;
        onChange({ eventType: "DELETE", oldId: oldRow?.id });
        return;
      }

      const row = payload.new as WorldBuildPartRow | null;
      if (row) onChange({ eventType: payload.eventType, part: rowToBuildPart(row) });
    })
    .subscribe();
}
