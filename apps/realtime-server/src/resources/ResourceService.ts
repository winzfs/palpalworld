import { distance } from "@palpalworld/game-core";
import type { EntityId, ItemId, PlayerPublicState, ResourceNodeState } from "@palpalworld/shared";
import { WORLD } from "@palpalworld/shared";
import type { WorldState } from "../world/WorldState";

export type HarvestResult =
  | {
      ok: true;
      resource: ResourceNodeState;
      itemId: ItemId;
      amount: number;
      depleted: boolean;
    }
  | {
      ok: false;
      reason: "missing_player" | "missing_resource" | "out_of_range" | "depleted";
    };

const harvestAmountByResource: Record<ResourceNodeState["resourceType"], number> = {
  wood: 12,
  stone: 10,
  fiber: 8,
  ore: 6,
  berry: 5,
};

export class ResourceService {
  constructor(private readonly world: WorldState) {}

  harvest(playerId: string, resourceId: EntityId): HarvestResult {
    const player = this.world.players.get(playerId);
    if (!player) return { ok: false, reason: "missing_player" };

    const resource = this.world.resources.get(resourceId);
    if (!resource) return { ok: false, reason: "missing_resource" };
    if (resource.remainingAmount <= 0) return { ok: false, reason: "depleted" };
    if (!this.isInRange(player, resource)) return { ok: false, reason: "out_of_range" };

    const amount = Math.min(resource.remainingAmount, harvestAmountByResource[resource.resourceType]);
    resource.remainingAmount -= amount;
    const depleted = resource.remainingAmount <= 0;

    if (depleted) {
      resource.respawnAt = Date.now() + WORLD.resourceRespawnMs;
    }

    return {
      ok: true,
      resource,
      itemId: resource.resourceType,
      amount,
      depleted,
    };
  }

  tickRespawns(now: number) {
    for (const resource of this.world.resources.values()) {
      if (resource.remainingAmount > 0 || !resource.respawnAt) continue;
      if (resource.respawnAt > now) continue;

      resource.remainingAmount = resource.maxAmount;
      resource.respawnAt = undefined;
    }
  }

  private isInRange(player: PlayerPublicState, resource: ResourceNodeState) {
    return distance(player.position, resource.position) <= WORLD.interactRange;
  }
}
