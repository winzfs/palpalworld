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
  mounted_pet_item_id?: string | null;
  equipped_weapon_item_id?: string | null;
};

export type LocalPresencePayload = {
  playerId: string;
  nickname: string;
  position: { x: number; y: number };
  direction: Direction;
  currentTile: MapTileRef;
  mountedPetItemId?: string | null;
  equippedWeaponItemId?: string | null;
};

export type WorldHostClaimResult = {
  isHost: boolean;
  hostPlayerId: string | null;
  lastHeartbeatAt: string | null;
};

const defaultSupabaseUrl = "https://bbpqhwexbdozkxsfoyrn.supabase.co";
const defaultSupabasePublishableKey = "sb_publishable_gZu3HGdokX2wQsvnaS6SaA__xjvRrn4";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? defaultSupabaseUrl;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? defaultSupabasePublishableKey;
const sessionPlayerIdKey = "palpalworld.multiplayer.sessionPlayerId";
const legacyPlayerIdKey = "palpalworld.multiplayer.playerId";

let cachedClient: SupabaseClient | null = null;

export function isSupabaseMultiplayerEnabled() {
  return Boolean(supabaseUrl && supabaseKey);
}

export function getSupabaseClient() {
  if (!supabaseUrl || !supabaseKey) return null;
  if (!cachedClient) cachedClient = createClient(supabaseUrl, supabaseKey);
  return cachedClient;
}

function createPlayerId() {
  return crypto.randomUUID ? crypto.randomUUID() : `player-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

export function getOrCreateMultiplayerPlayerId() {
  if (typeof window === "undefined") return "server-player";

  const existingSessionId = window.sessionStorage.getItem(sessionPlayerIdKey);
  if (existingSessionId) return existingSessionId;

  const next = createPlayerId();
  window.sessionStorage.setItem(sessionPlayerIdKey, next);
  window.localStorage.setItem(legacyPlayerIdKey, next);
  return next;
}

export function getCurrentMultiplayerPlayerId() {
  if (typeof window === "undefined") return "unknown";
  return window.sessionStorage.getItem(sessionPlayerIdKey)
    ?? window.localStorage.getItem(legacyPlayerIdKey)
    ?? "unknown";
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
    mountedPetItemId: row.mounted_pet_item_id ?? null,
    equippedWeaponItemId: row.equipped_weapon_item_id ?? null,
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
    mounted_pet_item_id: payload.mountedPetItemId ?? null,
    equipped_weapon_item_id: payload.equippedWeaponItemId ?? null,
    updated_at: new Date().toISOString(),
  });
}

export async function fetchOnlinePlayers(client: SupabaseClient, localPlayerId: string) {
  const since = new Date(Date.now() - 60_000).toISOString();
  const { data, error } = await client
    .from("world_players")
    .select("player_id,nickname,x,y,direction,region_id,tile_x,tile_y,mounted_pet_item_id,equipped_weapon_item_id,updated_at")
    .neq("player_id", localPlayerId)
    .gt("updated_at", since);

  if (error || !data) return [];
  return (data as WorldPlayerPresenceRow[]).map(rowToPlayer);
}

export async function claimWorldHost(client: SupabaseClient, localPlayerId: string, tile: MapTileRef | null, timeoutSeconds = 5): Promise<WorldHostClaimResult> {
  if (!tile || !localPlayerId || localPlayerId === "unknown") {
    return { isHost: false, hostPlayerId: null, lastHeartbeatAt: null };
  }

  const { data, error } = await client.rpc("claim_world_host", {
    p_region_id: tile.regionId,
    p_tile_x: tile.tileX,
    p_tile_y: tile.tileY,
    p_player_id: localPlayerId,
    p_timeout_seconds: timeoutSeconds,
  });

  if (error || !data || data.length <= 0) {
    return { isHost: false, hostPlayerId: null, lastHeartbeatAt: null };
  }

  const row = data[0] as { is_host?: boolean; host_player_id?: string; last_heartbeat_at?: string };
  return {
    isHost: Boolean(row.is_host),
    hostPlayerId: row.host_player_id ?? null,
    lastHeartbeatAt: row.last_heartbeat_at ?? null,
  };
}

export async function isCurrentPlayerWorldHost(client: SupabaseClient, localPlayerId: string, tile: MapTileRef | null) {
  const result = await claimWorldHost(client, localPlayerId, tile);
  return result.isHost;
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