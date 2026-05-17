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

export type CreatureSnapshotRequestPayload = {
  requesterId: string;
  sentAt: number;
  tile: MapTileRef;
};

export type CreaturePositionsHandler = (payload: CreaturePositionsBroadcastPayload) => void;
export type CreatureSnapshotRequestHandler = (payload: CreatureSnapshotRequestPayload) => void;

function getCreatureTile(creature: CreaturePublicState, fallbackTile: MapTileRef): MapTileRef {
  return (creature as { currentTile?: MapTileRef }).currentTile ?? fallbackTile;
}

function isSameTile(a: MapTileRef, b: MapTileRef) {
  return a.regionId === b.regionId && a.tileX === b.tileX && a.tileY === b.tileY;
}

export function getCreatureBroadcastTopic(tile: MapTileRef) {
  return `creatures:${tile.regionId}:${tile.tileX}:${tile.tileY}`;
}

export function createCreatureBroadcastChannel(
  client: SupabaseClient,
  tile: MapTileRef,
  onPositions: CreaturePositionsHandler,
  onSnapshotRequest?: CreatureSnapshotRequestHandler,
): RealtimeChannel {
  const channel = client.channel(getCreatureBroadcastTopic(tile), {
    config: {
      broadcast: { self: false, ack: false },
    },
  });

  channel.on("broadcast", { event: "monster_positions" }, (message) => {
    const payload = message.payload as CreaturePositionsBroadcastPayload | undefined;
    if (!payload?.tile || !Array.isArray(payload.creatures)) return;
    if (!isSameTile(payload.tile, tile)) return;
    onPositions(payload);
  });

  channel.on("broadcast", { event: "monster_snapshot_request" }, (message) => {
    const payload = message.payload as CreatureSnapshotRequestPayload | undefined;
    if (!payload?.tile || !payload.requesterId) return;
    if (!isSameTile(payload.tile, tile)) return;
    onSnapshotRequest?.(payload);
  });

  channel.subscribe();
  return channel;
}

function toCreaturePackets(creatures: CreaturePublicState[], tile: MapTileRef): CreaturePositionPacket[] {
  return creatures
    .filter((creature) => creature.hp > 0)
    .filter((creature) => isSameTile(getCreatureTile(creature, tile), tile))
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
  const packets = toCreaturePackets(creatures, tile);
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

export async function requestCreatureSnapshot({
  channel,
  requesterId,
  tile,
}: {
  channel: RealtimeChannel;
  requesterId: string;
  tile: MapTileRef;
}) {
  await channel.send({
    type: "broadcast",
    event: "monster_snapshot_request",
    payload: {
      requesterId,
      sentAt: Date.now(),
      tile,
    } satisfies CreatureSnapshotRequestPayload,
  });
}
