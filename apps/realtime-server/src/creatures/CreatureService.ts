import { CREATURE_CATALOG, STARTER_CREATURE_SPAWNS, type CreaturePublicState } from "@palpalworld/shared";
import { TraitService } from "../traits/TraitService";
import type { WorldState } from "../world/WorldState";

export class CreatureService {
  constructor(
    private readonly world: WorldState,
    private readonly traits = new TraitService(),
  ) {}

  getSpecies(creature: CreaturePublicState) {
    return CREATURE_CATALOG[creature.speciesId as keyof typeof CREATURE_CATALOG] ?? null;
  }

  calculateMaxHp(creature: CreaturePublicState) {
    const species = this.getSpecies(creature);
    if (!species) return creature.maxHp;

    const baseMaxHp = species.baseHp + creature.level * 8;
    const hpMultiplier = this.traits.getMultiplier(creature.traitIds, "max_hp_multiplier");
    return Math.max(1, Math.floor(baseMaxHp * hpMultiplier));
  }

  calculateDefense(creature: CreaturePublicState) {
    const species = this.getSpecies(creature);
    if (!species) return 1;

    const defenseMultiplier = this.traits.getMultiplier(creature.traitIds, "defense_multiplier");
    return Math.max(1, Math.floor(species.baseDefense * defenseMultiplier));
  }

  markDefeated(creature: CreaturePublicState) {
    const spawn = STARTER_CREATURE_SPAWNS.find((entry) => entry.id === creature.id);
    creature.hp = 0;
    creature.respawnAt = Date.now() + (spawn?.respawnMs ?? 30_000);
  }

  tickRespawns(now: number) {
    for (const creature of this.world.creatures.values()) {
      if (creature.hp > 0 || !creature.respawnAt) continue;
      if (creature.respawnAt > now) continue;

      creature.maxHp = this.calculateMaxHp(creature);
      creature.hp = creature.maxHp;
      delete creature.respawnAt;
    }
  }
}
