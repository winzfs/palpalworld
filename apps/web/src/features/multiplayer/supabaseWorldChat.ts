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

export async function sendWorldChatMessage(client: SupabaseClient, input: SendWorldChatMessageInput) {
  const message = input.message.trim().slice(0, 80);
  if (!message) return;
  await client.from("world_chat_messages").insert({
    player_id: input.playerId,
    nickname: input.nickname,
    message,
    message_type: input.messageType ?? "chat",
    x: input.position.x,
    y: input.position.y,
    region_id: input.currentTile.regionId,
    tile_x: input.currentTile.tileX,
    tile_y: input.currentTile.tileY,
  });
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

export function subscribeWorldChatMessages(client: SupabaseClient, onChange: () => void): RealtimeChannel {
  return client
    .channel("world_chat_messages_changes")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "world_chat_messages" }, onChange)
    .subscribe();
}
