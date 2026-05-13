import { TRAIT_CATALOG, type TraitEffectType } from "@palpalworld/shared";

export class TraitService {
  getMultiplier(traitIds: readonly string[], effectType: TraitEffectType, fallback = 1): number {
    let multiplier = fallback;

    for (const traitId of traitIds) {
      const trait = TRAIT_CATALOG[traitId as keyof typeof TRAIT_CATALOG];
      if (!trait) continue;

      for (const effect of trait.effects) {
        if (effect.type !== effectType) continue;
        multiplier *= effect.value;
      }
    }

    return multiplier;
  }

  pickTraitsFromPool(pool: readonly string[], count = 1): string[] {
    if (pool.length === 0 || count <= 0) return [];
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }
}
