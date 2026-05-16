import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import type { CreaturePublicState } from "@palpalworld/shared";
import type { MapTileRef } from "../../../../../packages/shared/src/worldTiles";

export type CreaturePositionPacket = {
  id: string;
  speciesId: string;
  level: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  traitIds: string[];
};

export type CreaturePositionsBroadcastPayload = {
  hostId: string;
  sentAt: number;
  tile: MapTileRef;
  creatures: CreaturePositionPacket[];
};

export type CreaturePositionsHandler = (payload: CreaturePositionsBroadcastPayload) => void;

function getCreatureTile(creature: CreaturePublicState, fallbackTile: MapTileRef): MapTileRef {
  return (creature as { currentTile?: MapTileRef }).currentTile ?? fallbackTile;
}

export function getCreatureBroadcastTopic(tile: MapTileRef) {
  return `creatures:${tile.regionId}:${tile.tileX}:${tile.tileY}`;
}

export function createCreatureBroadcastChannel(
  client: SupabaseClient,
  tile: MapTileRef,
  onPositions: CreaturePositionsHandler,
): RealtimeChannel {
  const channel = client.channel(getCreatureBroadcastTopic(tile), {
    config: {
      broadcast: { self: false, ack: false },
    },
  });

  channel.on("broadcast", { event: "monster_positions" }, (message) => {
    const payload = message.payload as CreaturePositionsBroadcastPayload | undefined;
    if (!payload?.tile || !Array.isArray(payload.creatures)) return;
    if (
      payload.tile.regionId !== tile.regionId
      || payload.tile.tileX !== tile.tileX
      || payload.tile.tileY !== tile.tileY
    ) return;
    onPositions(payload);
  });

  channel.subscribe();
  return channel;
}

export async function broadcastCreaturePositions({
  channel,
  hostId,
  tile,
  creatures,
}: {
  channel: RealtimeChannel;
  hostId: string;
  tile: MapTileRef;
  creatures: CreaturePublicState[];
}) {
  const packets = creatures
    .filter((creature) => creature.hp > 0)
    .filter((creature) => {
      const creatureTile = getCreatureTile(creature, tile);
      return creatureTile.regionId === tile.regionId && creatureTile.tileX === tile.tileX && creatureTile.tileY === tile.tileY;
    })
    .map((creature) => ({
      id: creature.id,
      speciesId: creature.speciesId,
      level: creature.level,
      x: creature.position.x,
      y: creature.position.y,
      hp: creature.hp,
      maxHp: creature.maxHp,
      traitIds: creature.traitIds ?? [],
    }));

  if (packets.length <= 0) return;
  await channel.send({
    type: "broadcast",
    event: "monster_positions",
    payload: {
      hostId,
      sentAt: Date.now(),
      tile,
      creatures: packets,
    } satisfies CreaturePositionsBroadcastPayload,
  });
}
