import type { CreatureRarity, ElementType, Vector2 } from "@palpalworld/shared";

export type DamageInput = {
  attackerLevel: number;
  attack: number;
  defenderDefense: number;
  skillPower: number;
  elementMultiplier?: number;
  critical?: boolean;
};

export function calculateDamage(input: DamageInput): number {
  const levelFactor = 1 + input.attackerLevel * 0.035;
  const raw = (input.attack * input.skillPower * levelFactor) / Math.max(1, input.defenderDefense * 0.55);
  const elemental = raw * (input.elementMultiplier ?? 1);
  const critical = elemental * (input.critical ? 1.5 : 1);
  return Math.max(1, Math.floor(critical));
}

export type CaptureInput = {
  currentHp: number;
  maxHp: number;
  rarity: CreatureRarity;
  ballPower: number;
  statusBonus?: number;
  playerCaptureBonus?: number;
};

const rarityPenalty: Record<CreatureRarity, number> = {
  common: 1,
  uncommon: 0.78,
  rare: 0.52,
  epic: 0.28,
  legendary: 0.08,
};

export function calculateCaptureChance(input: CaptureInput): number {
  const hpRatio = Math.max(0.01, Math.min(1, input.currentHp / input.maxHp));
  const weakenedBonus = 1 + (1 - hpRatio) * 2.2;
  const chance =
    0.18 *
    weakenedBonus *
    rarityPenalty[input.rarity] *
    input.ballPower *
    (input.statusBonus ?? 1) *
    (input.playerCaptureBonus ?? 1);

  return Math.max(0.01, Math.min(0.95, chance));
}

export function getElementMultiplier(attacker: ElementType, defender: ElementType): number {
  if (attacker === "fire" && defender === "grass") return 1.35;
  if (attacker === "grass" && defender === "water") return 1.35;
  if (attacker === "water" && defender === "fire") return 1.35;
  if (attacker === "electric" && defender === "water") return 1.35;
  if (attacker === "ice" && defender === "grass") return 1.35;
  if (attacker === "dark" && defender === "neutral") return 1.25;

  if (attacker === "grass" && defender === "fire") return 0.75;
  if (attacker === "water" && defender === "grass") return 0.75;
  if (attacker === "fire" && defender === "water") return 0.75;

  return 1;
}

export function distance(a: Vector2, b: Vector2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function normalizeVector(vector: Vector2): Vector2 {
  const length = Math.hypot(vector.x, vector.y);
  if (length <= 0.0001) return { x: 0, y: 0 };
  return { x: vector.x / length, y: vector.y / length };
}

export function moveTowards(current: Vector2, target: Vector2, maxDistance: number): Vector2 {
  const delta = { x: target.x - current.x, y: target.y - current.y };
  const length = Math.hypot(delta.x, delta.y);
  if (length <= maxDistance || length <= 0.0001) return target;
  const dir = normalizeVector(delta);
  return {
    x: current.x + dir.x * maxDistance,
    y: current.y + dir.y * maxDistance,
  };
}

export function calculateWorkOutput(baseAmount: number, workLevel: number, loyalty: number, fatigue: number): number {
  const loyaltyMultiplier = 0.75 + Math.max(0, Math.min(100, loyalty)) / 100;
  const fatiguePenalty = 1 - Math.max(0, Math.min(100, fatigue)) / 150;
  const levelMultiplier = 1 + workLevel * 0.3;
  return Math.max(1, Math.floor(baseAmount * levelMultiplier * loyaltyMultiplier * fatiguePenalty));
}
