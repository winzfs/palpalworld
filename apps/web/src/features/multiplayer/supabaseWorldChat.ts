import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import type { Direction } from "@palpalworld/shared";
import type { MapTileRef } from "../../../../../packages/shared/src/worldTiles";

export type WorldChatMessageType = "chat" | "emote" | "ping";

export type WorldChatMessageRow = {
  message_id: string;
  player_id: string;
  nickname: string;
  message: string;
  message_type: WorldChatMessageType;
  x: number;
  y: number;
  region_id: MapTileRef["regionId"];
  tile_x: number;
  tile_y: number;
  created_at: string;
};

export type SendWorldChatMessageInput = {
  playerId: string;
  nickname: string;
  message: string;
  messageType?: WorldChatMessageType;
  position: { x: number; y: number };
  direction?: Direction;
  currentTile: MapTileRef;
};

export function isSameChatTile(message: WorldChatMessageRow, tile: MapTileRef | null) {
  if (!tile) return true;
  return message.region_id === tile.regionId && message.tile_x === tile.tileX && message.tile_y === tile.tileY;
}

export function createOptimisticChatMessage(input: SendWorldChatMessageInput): WorldChatMessageRow {
  return {
    message_id: `local-${input.playerId}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`,
    player_id: input.playerId,
    nickname: input.nickname,
    message: input.message.trim().slice(0, 80),
    message_type: input.messageType ?? "chat",
    x: input.position.x,
    y: input.position.y,
    region_id: input.currentTile.regionId,
    tile_x: input.currentTile.tileX,
    tile_y: input.currentTile.tileY,
    created_at: new Date().toISOString(),
  };
}

export async function sendWorldChatMessage(client: SupabaseClient, input: SendWorldChatMessageInput) {
  const message = input.message.trim().slice(0, 80);
  if (!message) return null;
  const { data, error } = await client
    .from("world_chat_messages")
    .insert({
      player_id: input.playerId,
      nickname: input.nickname,
      message,
      message_type: input.messageType ?? "chat",
      x: input.position.x,
      y: input.position.y,
      region_id: input.currentTile.regionId,
      tile_x: input.currentTile.tileX,
      tile_y: input.currentTile.tileY,
    })
    .select("message_id,player_id,nickname,message,message_type,x,y,region_id,tile_x,tile_y,created_at")
    .single();

  if (error || !data) return null;
  return data as WorldChatMessageRow;
}

export async function fetchWorldChatMessages(client: SupabaseClient, tile: MapTileRef | null) {
  let query = client
    .from("world_chat_messages")
    .select("message_id,player_id,nickname,message,message_type,x,y,region_id,tile_x,tile_y,created_at")
    .order("created_at", { ascending: false })
    .limit(30);

  if (tile) {
    query = query.eq("region_id", tile.regionId).eq("tile_x", tile.tileX).eq("tile_y", tile.tileY);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return (data as WorldChatMessageRow[]).reverse();
}

export function subscribeWorldChatMessages(
  client: SupabaseClient,
  onInsert: (message: WorldChatMessageRow) => void,
): RealtimeChannel {
  return client
    .channel("world_chat_messages_changes")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "world_chat_messages" },
      (payload) => onInsert(payload.new as WorldChatMessageRow),
    )
    .subscribe();
}
