import { ITEM_CATALOG, PLAYER_BASE_STATS, type EquipmentState, type PlayerProgressState, type PlayerStats } from "@palpalworld/shared";
import type { InventoryStore } from "../inventory/InventoryStore";
import { TraitService } from "../traits/TraitService";

export class StatService {
  constructor(
    private readonly inventories: InventoryStore,
    private readonly traits = new TraitService(),
  ) {}

  calculatePlayerStats(progress: PlayerProgressState, equipment: EquipmentState): PlayerStats {
    const stats: PlayerStats = {
      ...PLAYER_BASE_STATS,
      maxHp: PLAYER_BASE_STATS.maxHp + (progress.level - 1) * 8,
      attack: PLAYER_BASE_STATS.attack + (progress.level - 1) * 2,
      defense: PLAYER_BASE_STATS.defense + Math.floor((progress.level - 1) * 0.8),
    };

    for (const itemInstanceId of Object.values(equipment.slots)) {
      if (!itemInstanceId) continue;
      const instance = this.inventories.getItemInstance(equipment.ownerPlayerId, itemInstanceId);
      if (!instance) continue;

      const definition = ITEM_CATALOG[instance.itemId as keyof typeof ITEM_CATALOG];
      if (!definition || !("statBonuses" in definition)) continue;

      for (const [statId, bonus] of Object.entries(definition.statBonuses)) {
        stats[statId as keyof PlayerStats] += bonus ?? 0;
      }

      stats.attack = Math.floor(stats.attack * this.traits.getMultiplier(instance.traitIds, "attack_multiplier"));
      stats.moveSpeed = Math.floor(stats.moveSpeed * this.traits.getMultiplier(instance.traitIds, "move_speed_multiplier"));
    }

    return stats;
  }
}
