import type { CreaturePublicState } from "@palpalworld/shared";
import { getPetSpeciesDefinition } from "./petCatalog";

export type CaptureOrbItemId = "capture_orb" | "improved_capture_orb";

export type CaptureMinigameConfig = {
  cursorSpeed: number;
  successStart: number;
  successEnd: number;
  durationMs: number;
};

const captureHpThreshold = 0.3;
const orbBonus: Record<CaptureOrbItemId, number> = {
  capture_orb: 0,
  improved_capture_orb: 0.12,
};

export function isCaptureOrbItemId(itemId: string): itemId is CaptureOrbItemId {
  return itemId === "capture_orb" || itemId === "improved_capture_orb";
}

export function getCreatureHpRatio(creature: CreaturePublicState) {
  const maxHp = Math.max(1, creature.maxHp ?? 1);
  return Math.max(0, Math.min(1, creature.hp / maxHp));
}

export function canStartCapture(creature: CreaturePublicState) {
  return creature.hp > 0 && getCreatureHpRatio(creature) <= captureHpThreshold;
}

export function createCaptureMinigameConfig(creature: CreaturePublicState, orbItemId: CaptureOrbItemId): CaptureMinigameConfig {
  const species = getPetSpeciesDefinition(creature.speciesId);
  const hpRatio = getCreatureHpRatio(creature);
  const lowHpBonus = Math.max(0, captureHpThreshold - hpRatio) * 0.45;
  const difficultyScore = Math.max(0.25, Math.min(0.95, species.baseCaptureDifficulty + orbBonus[orbItemId] + lowHpBonus));
  const zoneWidth = 0.14 + difficultyScore * 0.18;
  const center = 0.5 + Math.sin(creature.id.length * 12.9898) * 0.22;
  const successStart = Math.max(0.08, Math.min(0.82, center - zoneWidth / 2));
  const successEnd = Math.max(successStart + 0.08, Math.min(0.92, successStart + zoneWidth));

  return {
    cursorSpeed: 1.35 + (1 - difficultyScore) * 0.9,
    successStart,
    successEnd,
    durationMs: 5000,
  };
}

export function isCaptureTimingSuccess(cursorPosition: number, config: CaptureMinigameConfig) {
  return cursorPosition >= config.successStart && cursorPosition <= config.successEnd;
}
