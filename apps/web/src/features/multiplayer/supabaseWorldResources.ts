import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import type { ResourceNodeState } from "@palpalworld/shared";
import type { MapTileRef } from "../../../../../packages/shared/src/worldTiles";

export type WorldResourceRow = {
  resource_id: string;
  resource_type: string;
  x: number;
  y: number;
  remaining_amount: number;
  max_amount: number;
  region_id: MapTileRef["regionId"];
  tile_x: number;
  tile_y: number;
  depleted: boolean;
  updated_at: string;
};

export function resourceToRow(resource: ResourceNodeState): Omit<WorldResourceRow, "updated_at"> {
  const currentTile = (resource as { currentTile?: MapTileRef }).currentTile ?? { regionId: "starter_meadow", tileX: 1, tileY: 1 } as MapTileRef;
  return {
    resource_id: resource.id,
    resource_type: resource.resourceType,
    x: resource.position.x,
    y: resource.position.y,
    remaining_amount: resource.remainingAmount,
    max_amount: resource.maxAmount,
    region_id: currentTile.regionId,
    tile_x: currentTile.tileX,
    tile_y: currentTile.tileY,
    depleted: resource.remainingAmount <= 0,
  };
}

export async function upsertWorldResources(client: SupabaseClient, resources: ResourceNodeState[]) {
  if (resources.length === 0) return;
  const rows = resources.map((resource) => ({ ...resourceToRow(resource), updated_at: new Date().toISOString() }));
  await client.from("world_resources").upsert(rows);
}

export async function fetchWorldResources(client: SupabaseClient, tile: MapTileRef | null) {
  let query = client
    .from("world_resources")
    .select("resource_id,resource_type,x,y,remaining_amount,max_amount,region_id,tile_x,tile_y,depleted,updated_at");

  if (tile) {
    query = query.eq("region_id", tile.regionId).eq("tile_x", tile.tileX).eq("tile_y", tile.tileY);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data as WorldResourceRow[];
}

export function subscribeWorldResources(client: SupabaseClient, onChange: () => void): RealtimeChannel {
  return client
    .channel("world_resources_state_changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "world_resources" }, onChange)
    .subscribe();
}

export function dispatchRemoteResourceState(rows: WorldResourceRow[]) {
  window.dispatchEvent(new CustomEvent("palpalworld:remote-resources", { detail: { rows } }));
}
