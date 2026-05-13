import { CREATURE_CATALOG, STARTER_CREATURE_SPAWNS, type CreaturePublicState } from "@palpalworld/shared";
import type { WorldState } from "../world/WorldState";

export class CreatureService {
  constructor(private readonly world: WorldState) {}

  getSpecies(creature: CreaturePublicState) {
    return CREATURE_CATALOG[creature.speciesId as keyof typeof CREATURE_CATALOG] ?? null;
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

      const species = this.getSpecies(creature);
      if (!species) continue;

      creature.maxHp = species.baseHp + creature.level * 8;
      creature.hp = creature.maxHp;
      delete creature.respawnAt;
    }
  }
}
