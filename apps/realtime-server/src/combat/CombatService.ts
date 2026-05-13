import { calculateDamage, distance } from "@palpalworld/game-core";
import { CREATURE_CATALOG, WORLD, type CreaturePublicState, type ItemStack } from "@palpalworld/shared";
import type { CreatureService } from "../creatures/CreatureService";
import type { WorldState } from "../world/WorldState";

export type AttackResult =
  | {
      ok: true;
      creature: CreaturePublicState;
      damage: number;
      defeated: boolean;
      drops: ItemStack[];
    }
  | {
      ok: false;
      reason: "missing_player" | "no_target" | "out_of_range" | "already_defeated";
    };

export class CombatService {
  private readonly lastAttackAt = new Map<string, number>();

  constructor(
    private readonly world: WorldState,
    private readonly creatures: CreatureService,
  ) {}

  attackNearestCreature(playerId: string): AttackResult {
    const player = this.world.players.get(playerId);
    if (!player) return { ok: false, reason: "missing_player" };

    const now = Date.now();
    const lastAttackAt = this.lastAttackAt.get(playerId) ?? 0;
    if (now - lastAttackAt < WORLD.playerAttackCooldownMs) {
      return { ok: false, reason: "no_target" };
    }

    const target = this.findNearestCreature(player.position.x, player.position.y);
    if (!target) return { ok: false, reason: "no_target" };
    if (target.hp <= 0) return { ok: false, reason: "already_defeated" };

    const targetDistance = distance(player.position, target.position);
    if (targetDistance > WORLD.attackRange) return { ok: false, reason: "out_of_range" };

    const species = this.creatures.getSpecies(target);
    const defenderDefense = this.creatures.calculateDefense(target);
    const damage = calculateDamage({
      attackerLevel: 1,
      attack: WORLD.playerAttackPower,
      defenderDefense,
      skillPower: 1,
    });

    target.hp = Math.max(0, target.hp - damage);
    this.lastAttackAt.set(playerId, now);

    const defeated = target.hp <= 0;
    const drops = defeated && species ? this.rollDrops(species.drops) : [];

    if (defeated) {
      this.creatures.markDefeated(target);
    }

    return {
      ok: true,
      creature: target,
      damage,
      defeated,
      drops,
    };
  }

  private findNearestCreature(x: number, y: number) {
    let nearest: CreaturePublicState | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const creature of this.world.creatures.values()) {
      if (creature.hp <= 0) continue;
      const nextDistance = Math.hypot(creature.position.x - x, creature.position.y - y);
      if (nextDistance >= nearestDistance) continue;
      nearest = creature;
      nearestDistance = nextDistance;
    }

    return nearest;
  }

  private rollDrops(drops: typeof CREATURE_CATALOG[keyof typeof CREATURE_CATALOG]["drops"]): ItemStack[] {
    const results: ItemStack[] = [];
    for (const drop of drops) {
      if (Math.random() > drop.chance) continue;
      results.push({ itemId: drop.itemId, amount: randomInt(drop.min, drop.max) });
    }
    return results;
  }
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
