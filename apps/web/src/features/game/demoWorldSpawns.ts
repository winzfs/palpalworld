import type { BuildingState, BuildingType, CreaturePublicState, ResourceNodeState } from "@palpalworld/shared";
import { STARTER_CREATURE_SPAWNS, STARTER_RESOURCE_NODES } from "@palpalworld/shared";
import { DEFAULT_PLAYER_TILE, getEntityTileById, type MapTileRef } from "../../../../../packages/shared/src/worldTiles";

const demoPlayerId = "demo-player";
const regionIds = ["starter_meadow", "stone_hills"] as const;
const tileSize = 3;
const resourcesPerTile = 54;
const creaturesPerTile = 18;
const mapMin = 150;
const mapMax = 2850;
const mapUsableSize = mapMax - mapMin;
const goldenRatio = 0.6180339887498949;
const combatEffectTestHpMultiplier = 3;

const resourceTypesByRegion: Record<string, string[]> = {
  starter_meadow: ["wood", "wood", "wood", "fiber", "fiber", "stone", "berry", "berry", "herb", "wood", "fiber", "stone"],
  stone_hills: ["stone", "stone", "stone", "ore", "ore", "ore", "coal", "coal", "stone", "ore", "stone", "coal"],
};

const creatureTypesByRegion: Record<string, string[]> = {
  starter_meadow: ["leafbun", "leafbun", "droplet", "sparkit", "breezewing", "leafbun", "droplet", "sparkit", "mossboar"],
  stone_hills: ["rockturtle", "rockturtle", "moleminer", "sparkit", "breezewing", "rockturtle", "moleminer", "moleminer", "sparkit"],
};

function hashParts(...parts: Array<string | number>) {
  let hash = 2166136261;
  const input = parts.join(":");
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function random01(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function clampMapPosition(value: number) {
  return Math.max(mapMin, Math.min(mapMax, value));
}

function distributedPosition(regionId: string, tileX: number, tileY: number, index: number, total: number, kind: "resource" | "creature") {
  const gridColumns = kind === "resource" ? 9 : 6;
  const gridRows = Math.ceil(total / gridColumns);
  const seed = hashParts(regionId, tileX, tileY, kind, index);
  const shuffledIndex = (index * 17 + seed) % total;
  const column = shuffledIndex % gridColumns;
  const row = Math.floor(shuffledIndex / gridColumns) % gridRows;
  const cellWidth = mapUsableSize / gridColumns;
  const cellHeight = mapUsableSize / gridRows;
  const jitterScale = kind === "resource" ? 0.58 : 0.7;
  const jitterX = (random01(seed + 11) - 0.5) * cellWidth * jitterScale;
  const jitterY = (random01(seed + 29) - 0.5) * cellHeight * jitterScale;
  const sweepX = ((index * goldenRatio + random01(seed + 47) * 0.22) % 1 - 0.5) * cellWidth * 0.38;
  const sweepY = ((index * 0.754877666 + random01(seed + 71) * 0.22) % 1 - 0.5) * cellHeight * 0.38;
  return {
    x: clampMapPosition(mapMin + column * cellWidth + cellWidth / 2 + jitterX + sweepX),
    y: clampMapPosition(mapMin + row * cellHeight + cellHeight / 2 + jitterY + sweepY),
  };
}

function cloneResourceNode(node: ResourceNodeState): ResourceNodeState {
  const currentTile = getEntityTileById(node.id);
  return { ...node, position: { ...node.position }, currentTile } as ResourceNodeState;
}

function cloneCreatureSpawn(spawn: (typeof STARTER_CREATURE_SPAWNS)[number]): CreaturePublicState {
  const currentTile = getEntityTileById(spawn.id);
  const baseMaxHp = 60 + spawn.level * 10;
  const maxHp = Math.round(baseMaxHp * combatEffectTestHpMultiplier);
  return { id: spawn.id, speciesId: spawn.speciesId, regionId: spawn.regionId, position: { ...spawn.position }, currentTile, level: spawn.level, hp: maxHp, maxHp, traitIds: [...(spawn.traitIds ?? [])] } as CreaturePublicState;
}

function makeResource(regionId: string, tileX: number, tileY: number, index: number): ResourceNodeState {
  const resourceTypes = resourceTypesByRegion[regionId] ?? resourceTypesByRegion.starter_meadow;
  const resourceType = resourceTypes[(index + tileX + tileY * 2) % resourceTypes.length];
  const currentTile: MapTileRef = { regionId, tileX, tileY } as MapTileRef;
  const amount = resourceType === "fiber" || resourceType === "berry" || resourceType === "herb" ? 55 : resourceType === "ore" ? 130 : resourceType === "coal" ? 115 : 105;
  return { id: `res-${regionId}-${tileX}-${tileY}-${resourceType}-ultra-${index}`, regionId, resourceType, position: distributedPosition(regionId, tileX, tileY, index, resourcesPerTile, "resource"), currentTile, remainingAmount: amount, maxAmount: amount } as ResourceNodeState;
}

function makeCreature(regionId: string, tileX: number, tileY: number, index: number): CreaturePublicState {
  const creatureTypes = creatureTypesByRegion[regionId] ?? creatureTypesByRegion.starter_meadow;
  const speciesId = creatureTypes[(index + tileX + tileY) % creatureTypes.length];
  const currentTile: MapTileRef = { regionId, tileX, tileY } as MapTileRef;
  const levelBase = regionId === "stone_hills" ? 9 : 2;
  const level = levelBase + tileX + tileY + Math.floor(index / 4);
  const baseMaxHp = speciesId === "breezewing" ? 52 + level * 7 : regionId === "stone_hills" ? 105 + level * 9 : 58 + level * 8;
  const maxHp = Math.round(baseMaxHp * combatEffectTestHpMultiplier);
  return {
    id: `mob-${regionId}-${tileX}-${tileY}-${speciesId}-ultra-${index}`,
    speciesId,
    regionId,
    position: distributedPosition(regionId, tileX, tileY, index, creaturesPerTile, "creature"),
    currentTile,
    level,
    hp: maxHp,
    maxHp,
    traitIds: speciesId === "breezewing" ? ["flying", "swift"] : index % 4 === 0 ? ["sturdy"] : index % 4 === 1 ? ["nimble"] : index % 4 === 2 ? ["brave"] : ["hard_worker"],
  } as CreaturePublicState;
}

export function createTileBasedDemoResources(): ResourceNodeState[] {
  const resources = STARTER_RESOURCE_NODES.map(cloneResourceNode);
  for (const regionId of regionIds) for (let tileY = 0; tileY < tileSize; tileY += 1) for (let tileX = 0; tileX < tileSize; tileX += 1) for (let index = 0; index < resourcesPerTile; index += 1) resources.push(makeResource(regionId, tileX, tileY, index));
  return resources;
}

export function createTileBasedDemoCreatures(): CreaturePublicState[] {
  const creatures = STARTER_CREATURE_SPAWNS.map(cloneCreatureSpawn);
  for (const regionId of regionIds) for (let tileY = 0; tileY < tileSize; tileY += 1) for (let tileX = 0; tileX < tileSize; tileX += 1) for (let index = 0; index < creaturesPerTile; index += 1) creatures.push(makeCreature(regionId, tileX, tileY, index));
  return creatures;
}

export function createTileBasedDemoBuildings(): BuildingState[] {
  return [{ id: "demo-building-starter_meadow-1-1-workbench", type: "workbench" as BuildingType, ownerPlayerId: demoPlayerId, position: { x: 1500, y: 1660 }, currentTile: { ...DEFAULT_PLAYER_TILE }, hp: 300, maxHp: 300 } as BuildingState];
}
