import { type EquipmentState, type PlayerId, type PlayerProfileState, type PlayerProgressState, type PlayerStats } from "@palpalworld/shared";
import type { EquipmentService } from "../equipment/EquipmentService";
import type { StatService } from "../stats/StatService";

export class PlayerService {
  private progressByPlayer = new Map<PlayerId, PlayerProgressState>();

  constructor(
    private readonly equipment: EquipmentService,
    private readonly stats: StatService,
  ) {}

  createPlayerProfile(playerId: PlayerId): PlayerProfileState {
    const progress: PlayerProgressState = {
      playerId,
      level: 1,
      exp: 0,
      nextExp: 100,
      statPoints: 0,
    };
    this.progressByPlayer.set(playerId, progress);
    const equipment = this.equipment.createStarterEquipment(playerId);
    return this.getPlayerProfile(playerId, equipment);
  }

  deletePlayerProfile(playerId: PlayerId) {
    this.progressByPlayer.delete(playerId);
    this.equipment.deleteEquipment(playerId);
  }

  getProgress(playerId: PlayerId): PlayerProgressState {
    const existing = this.progressByPlayer.get(playerId);
    if (existing) return existing;

    const progress: PlayerProgressState = {
      playerId,
      level: 1,
      exp: 0,
      nextExp: 100,
      statPoints: 0,
    };
    this.progressByPlayer.set(playerId, progress);
    return progress;
  }

  getPlayerProfile(playerId: PlayerId, equipmentState?: EquipmentState): PlayerProfileState {
    const progress = this.getProgress(playerId);
    const equipment = equipmentState ?? this.equipment.getEquipment(playerId);
    const stats: PlayerStats = this.stats.calculatePlayerStats(progress, equipment);

    return {
      playerId,
      progress,
      stats,
      equipment,
    };
  }

  addExp(playerId: PlayerId, amount: number): PlayerProfileState {
    const progress = this.getProgress(playerId);
    progress.exp += amount;

    while (progress.exp >= progress.nextExp) {
      progress.exp -= progress.nextExp;
      progress.level += 1;
      progress.statPoints += 3;
      progress.nextExp = Math.floor(progress.nextExp * 1.18 + 35);
    }

    return this.getPlayerProfile(playerId);
  }
}
