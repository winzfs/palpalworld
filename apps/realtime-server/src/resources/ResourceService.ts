import { distance } from "@palpalworld/game-core";
import type { EntityId, ItemStack, PlayerPublicState, ResourceNodeState } from "@palpalworld/shared";
import { RESOURCE_CATALOG, WORLD } from "@palpalworld/shared";
import type { WorldState } from "../world/WorldState";

export type HarvestResult =
  | {
      ok: true;
      resource: ResourceNodeState;
      drops: ItemStack[];
      depleted: boolean;
    }
  | {
      ok: false;
      reason: "missing_player" | "missing_resource" | "out_of_range" | "depleted";
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

    const definition = RESOURCE_CATALOG[resource.resourceType];
    const drops = this.rollDrops(definition.drops);
    const amountConsumed = drops.reduce((sum, drop) => sum + drop.amount, 0);
    resource.remainingAmount = Math.max(0, resource.remainingAmount - Math.max(1, amountConsumed));
    const depleted = resource.remainingAmount <= 0;

    if (depleted) {
      resource.respawnAt = Date.now() + definition.respawnMs;
    }

    return {
      ok: true,
      resource,
      drops,
      depleted,
    };
  }

  tickRespawns(now: number) {
    for (const resource of this.world.resources.values()) {
      if (resource.remainingAmount > 0 || !resource.respawnAt) continue;
      if (resource.respawnAt > now) continue;

      resource.remainingAmount = resource.maxAmount;
      delete resource.respawnAt;
    }
  }

  private rollDrops(drops: typeof RESOURCE_CATALOG[keyof typeof RESOURCE_CATALOG]["drops"]): ItemStack[] {
    const results: ItemStack[] = [];
    for (const drop of drops) {
      if (Math.random() > drop.chance) continue;
      const amount = randomInt(drop.min, drop.max);
      results.push({ itemId: drop.itemId, amount });
    }
    return results;
  }

  private isInRange(player: PlayerPublicState, resource: ResourceNodeState) {
    return distance(player.position, resource.position) <= WORLD.interactRange;
  }
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
