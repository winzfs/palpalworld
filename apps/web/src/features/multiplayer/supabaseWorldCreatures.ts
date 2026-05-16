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

function sanitizeCreatureHp(hp: number, maxHp: number) {
  const safeMaxHp = Number.isFinite(maxHp) && maxHp > 0 ? maxHp : 1;
  const safeHp = Number.isFinite(hp) ? hp : safeMaxHp;
  return { hp: Math.max(0, Math.min(safeHp, safeMaxHp)), maxHp: safeMaxHp };
}

export function creatureToRow(creature: CreaturePublicState): Omit<WorldCreatureRow, "updated_at"> {
  const currentTile = (creature as { currentTile?: MapTileRef }).currentTile ?? { regionId: "starter_meadow", tileX: 1, tileY: 1 } as MapTileRef;
  const { hp, maxHp } = sanitizeCreatureHp(creature.hp, creature.maxHp);
  return {
    creature_id: creature.id,
    species_id: creature.speciesId,
    level: creature.level,
    x: creature.position.x,
    y: creature.position.y,
    hp,
    max_hp: maxHp,
    region_id: currentTile.regionId,
    tile_x: currentTile.tileX,
    tile_y: currentTile.tileY,
    trait_ids: creature.traitIds ?? [],
    defeated: hp <= 0,
  };
}

export function rowToCreature(row: WorldCreatureRow): CreaturePublicState {
  const { hp, maxHp } = sanitizeCreatureHp(row.defeated ? 0 : row.hp, row.max_hp);
  return {
    id: row.creature_id,
    speciesId: row.species_id,
    level: row.level,
    position: { x: row.x, y: row.y },
    currentTile: { regionId: row.region_id, tileX: row.tile_x, tileY: row.tile_y },
    hp,
    maxHp,
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

export async function updateWorldCreaturePositions(client: SupabaseClient, creatures: CreaturePublicState[]) {
  if (creatures.length === 0) return;
  const updatedAt = new Date().toISOString();
  const rows = creatures.map((creature) => {
    const currentTile = (creature as { currentTile?: MapTileRef }).currentTile ?? { regionId: "starter_meadow", tileX: 1, tileY: 1 } as MapTileRef;
    return {
      creature_id: creature.id,
      x: creature.position.x,
      y: creature.position.y,
      region_id: currentTile.regionId,
      tile_x: currentTile.tileX,
      tile_y: currentTile.tileY,
      updated_at: updatedAt,
    };
  });
  await client.from("world_creatures").upsert(rows, { onConflict: "creature_id" });
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

export async function seedMissingWorldCreatures(client: SupabaseClient, creatures: CreaturePublicState[]) {
  if (creatures.length === 0) return;
  const ids = creatures.map((creature) => creature.id);
  const { data } = await client
    .from("world_creatures")
    .select("creature_id")
    .in("creature_id", ids);
  const existingIds = new Set((data ?? []).map((row: { creature_id: string }) => row.creature_id));
  const missing = creatures.filter((creature) => !existingIds.has(creature.id));
  await upsertWorldCreatures(client, missing);
}

export async function applyWorldCreatureDamage(client: SupabaseClient, creature: CreaturePublicState, damage: number) {
  const nextHp = Math.max(0, creature.hp - damage);
  const nextCreature = { ...creature, hp: nextHp } as CreaturePublicState;
  await upsertWorldCreature(client, nextCreature);
  return nextCreature;
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
