import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentMultiplayerPlayerId, getSupabaseClient } from "./supabaseMultiplayer";

export type GameRoom = {
  room_id: string;
  room_name: string;
  host_player_id: string;
  status: "open" | "closed";
  max_players?: number;
  player_count?: number;
  created_at: string;
  updated_at?: string;
};

export const activeRoomStorageKey = "palpalworld.multiplayer.activeRoomId";
export const roomEventName = "palpalworld:room-session-changed";

export function getActiveRoomId() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(activeRoomStorageKey);
}

export function setActiveRoomId(roomId: string | null) {
  if (typeof window === "undefined") return;
  if (roomId) window.localStorage.setItem(activeRoomStorageKey, roomId);
  else window.localStorage.removeItem(activeRoomStorageKey);
  window.dispatchEvent(new CustomEvent(roomEventName, { detail: { roomId } }));
}

function getClient(client?: SupabaseClient | null) {
  return client ?? getSupabaseClient();
}

export async function listGameRooms(client?: SupabaseClient | null): Promise<GameRoom[]> {
  const supabase = getClient(client);
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("game_rooms")
    .select("room_id,room_name,host_player_id,status,max_players,created_at,updated_at,game_room_players(player_id)")
    .eq("status", "open")
    .order("updated_at", { ascending: false })
    .limit(20);
  if (error || !data) return [];
  return data.map((row: any) => ({
    room_id: row.room_id,
    room_name: row.room_name,
    host_player_id: row.host_player_id,
    status: row.status,
    max_players: row.max_players,
    created_at: row.created_at,
    updated_at: row.updated_at,
    player_count: Array.isArray(row.game_room_players) ? row.game_room_players.length : 0,
  }));
}

export async function createGameRoom(roomName: string, nickname: string, client?: SupabaseClient | null) {
  const supabase = getClient(client);
  if (!supabase) return null;
  const playerId = getCurrentMultiplayerPlayerId();
  const { data, error } = await supabase.rpc("create_game_room", {
    p_room_name: roomName,
    p_player_id: playerId,
    p_nickname: nickname,
  });
  if (error || !data || data.length <= 0) return null;
  const room = data[0] as GameRoom;
  setActiveRoomId(room.room_id);
  return room;
}

export async function joinGameRoom(roomId: string, nickname: string, client?: SupabaseClient | null) {
  const supabase = getClient(client);
  if (!supabase) return null;
  const playerId = getCurrentMultiplayerPlayerId();
  const { data, error } = await supabase.rpc("join_game_room", {
    p_room_id: roomId,
    p_player_id: playerId,
    p_nickname: nickname,
  });
  if (error || !data || data.length <= 0) return null;
  const room = data[0] as GameRoom;
  setActiveRoomId(room.room_id);
  return room;
}

export async function leaveGameRoom(roomId: string | null, client?: SupabaseClient | null) {
  const supabase = getClient(client);
  const playerId = getCurrentMultiplayerPlayerId();
  if (supabase && roomId) {
    await supabase.rpc("leave_game_room", { p_room_id: roomId, p_player_id: playerId });
  }
  setActiveRoomId(null);
}

export async function claimRoomTileHost(client: SupabaseClient, roomId: string, tile: { regionId: string; tileX: number; tileY: number }, playerId = getCurrentMultiplayerPlayerId()) {
  const { data, error } = await client.rpc("claim_room_tile_host", {
    p_room_id: roomId,
    p_region_id: tile.regionId,
    p_tile_x: tile.tileX,
    p_tile_y: tile.tileY,
    p_player_id: playerId,
    p_timeout_seconds: 5,
  });
  if (error || !data || data.length <= 0) return { isHost: false, hostPlayerId: null };
  const row = data[0] as { is_host?: boolean; host_player_id?: string };
  return { isHost: Boolean(row.is_host), hostPlayerId: row.host_player_id ?? null };
}
