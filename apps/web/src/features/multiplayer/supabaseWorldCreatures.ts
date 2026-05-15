import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import type { CreaturePublicState } from "@palpalworld/shared";
import type { MapTileRef } from "../../../../../packages/shared/src/worldTiles";

export type WorldCreatureRow = {
  creature_id: string;
  species_id: string;
  level: number;
  x: number;
  y: number;
  hp: number;
  max_hp: number;
  region_id: MapTileRef["regionId"];
  tile_x: number;
  tile_y: number;
  trait_ids: string[];
  defeated: boolean;
  updated_at: string;
};

export function creatureToRow(creature: CreaturePublicState): Omit<WorldCreatureRow, "updated_at"> {
  const currentTile = (creature as { currentTile?: MapTileRef }).currentTile ?? { regionId: "starter_meadow", tileX: 1, tileY: 1 } as MapTileRef;
  return {
    creature_id: creature.id,
    species_id: creature.speciesId,
    level: creature.level,
    x: creature.position.x,
    y: creature.position.y,
    hp: creature.hp,
    max_hp: creature.maxHp,
    region_id: currentTile.regionId,
    tile_x: currentTile.tileX,
    tile_y: currentTile.tileY,
    trait_ids: creature.traitIds ?? [],
    defeated: creature.hp <= 0,
  };
}

export function rowToCreature(row: WorldCreatureRow): CreaturePublicState {
  return {
    id: row.creature_id,
    speciesId: row.species_id,
    level: row.level,
    position: { x: row.x, y: row.y },
    currentTile: { regionId: row.region_id, tileX: row.tile_x, tileY: row.tile_y },
    hp: row.hp,
    maxHp: row.max_hp,
    traitIds: row.trait_ids ?? [],
  } as CreaturePublicState;
}

export async function upsertWorldCreature(client: SupabaseClient, creature: CreaturePublicState) {
  const row = creatureToRow(creature);
  await client.from("world_creatures").upsert({
    ...row,
    updated_at: new Date().toISOString(),
  });
}

export async function upsertWorldCreatures(client: SupabaseClient, creatures: CreaturePublicState[]) {
  if (creatures.length === 0) return;
  const rows = creatures.map((creature) => ({ ...creatureToRow(creature), updated_at: new Date().toISOString() }));
  await client.from("world_creatures").upsert(rows);
}

export async function fetchWorldCreatures(client: SupabaseClient, tile: MapTileRef | null) {
  let query = client
    .from("world_creatures")
    .select("creature_id,species_id,level,x,y,hp,max_hp,region_id,tile_x,tile_y,trait_ids,defeated,updated_at");

  if (tile) {
    query = query.eq("region_id", tile.regionId).eq("tile_x", tile.tileX).eq("tile_y", tile.tileY);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data as WorldCreatureRow[];
}

export function subscribeWorldCreatures(client: SupabaseClient, onChange: () => void): RealtimeChannel {
  return client
    .channel("world_creatures_state_changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "world_creatures" }, onChange)
    .subscribe();
}

export function dispatchRemoteCreatureState(rows: WorldCreatureRow[]) {
  window.dispatchEvent(new CustomEvent("palpalworld:remote-creatures", { detail: { rows } }));
}
