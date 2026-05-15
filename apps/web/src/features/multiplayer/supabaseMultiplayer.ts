import { createClient, type RealtimeChannel, type SupabaseClient } from "@supabase/supabase-js";
import type { Direction, PlayerPublicState } from "@palpalworld/shared";
import type { MapTileRef } from "../../../../../packages/shared/src/worldTiles";

export type WorldPlayerPresenceRow = {
  player_id: string;
  nickname: string;
  x: number;
  y: number;
  direction: Direction;
  region_id: MapTileRef["regionId"];
  tile_x: number;
  tile_y: number;
  updated_at: string;
};

export type LocalPresencePayload = {
  playerId: string;
  nickname: string;
  position: { x: number; y: number };
  direction: Direction;
  currentTile: MapTileRef;
};

const defaultSupabaseUrl = "https://bbpqhwexbdozkxsfoyrn.supabase.co";
const defaultSupabasePublishableKey = "sb_publishable_gZu3HGdokX2wQsvnaS6SaA__xjvRrn4";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? defaultSupabaseUrl;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? defaultSupabasePublishableKey;

let cachedClient: SupabaseClient | null = null;

export function isSupabaseMultiplayerEnabled() {
  return Boolean(supabaseUrl && supabaseKey);
}

export function getSupabaseClient() {
  if (!supabaseUrl || !supabaseKey) return null;
  if (!cachedClient) cachedClient = createClient(supabaseUrl, supabaseKey);
  return cachedClient;
}

export function getOrCreateMultiplayerPlayerId() {
  if (typeof window === "undefined") return "server-player";
  const key = "palpalworld.multiplayer.playerId";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const next = crypto.randomUUID ? crypto.randomUUID() : `player-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
  window.localStorage.setItem(key, next);
  return next;
}

export function rowToPlayer(row: WorldPlayerPresenceRow): PlayerPublicState {
  return {
    id: row.player_id,
    nickname: row.nickname,
    position: { x: row.x, y: row.y },
    direction: row.direction,
    currentTile: { regionId: row.region_id, tileX: row.tile_x, tileY: row.tile_y },
    hp: 100,
    maxHp: 100,
  } as PlayerPublicState;
}

export async function upsertLocalPresence(client: SupabaseClient, payload: LocalPresencePayload) {
  await client.from("world_players").upsert({
    player_id: payload.playerId,
    nickname: payload.nickname,
    x: payload.position.x,
    y: payload.position.y,
    direction: payload.direction,
    region_id: payload.currentTile.regionId,
    tile_x: payload.currentTile.tileX,
    tile_y: payload.currentTile.tileY,
    updated_at: new Date().toISOString(),
  });
}

export async function fetchOnlinePlayers(client: SupabaseClient, localPlayerId: string) {
  const since = new Date(Date.now() - 15_000).toISOString();
  const { data, error } = await client
    .from("world_players")
    .select("player_id,nickname,x,y,direction,region_id,tile_x,tile_y,updated_at")
    .neq("player_id", localPlayerId)
    .gt("updated_at", since);

  if (error || !data) return [];
  return (data as WorldPlayerPresenceRow[]).map(rowToPlayer);
}

export function subscribeOnlinePlayers(
  client: SupabaseClient,
  onChange: () => void,
): RealtimeChannel {
  const channel = client
    .channel("world_players_presence_changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "world_players" }, onChange)
    .subscribe();
  return channel;
}
