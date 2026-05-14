import type { BuildingState, BuildingType, CreaturePublicState, ResourceNodeState } from "@palpalworld/shared";
import { STARTER_CREATURE_SPAWNS, STARTER_RESOURCE_NODES } from "@palpalworld/shared";
import { DEFAULT_PLAYER_TILE, getEntityTileById, type MapTileRef } from "../../../../../packages/shared/src/worldTiles";

const demoPlayerId = "demo-player";
const regionIds = ["starter_meadow", "stone_hills"] as const;
const tileSize = 3;

const resourceTypesByRegion: Record<string, string[]> = {
  starter_meadow: ["wood", "wood", "fiber", "stone", "berry", "herb", "wood", "fiber", "stone", "berry"],
  stone_hills: ["stone", "ore", "coal", "stone", "ore", "stone", "coal", "ore", "stone", "ore"],
};

const creatureTypesByRegion: Record<string, string[]> = {
  starter_meadow: ["leafbun", "droplet", "sparkit", "leafbun", "droplet"],
  stone_hills: ["rockturtle", "moleminer", "sparkit", "rockturtle", "moleminer"],
};

const resourcePositions = [
  { x: 260, y: 300 },
  { x: 720, y: 520 },
  { x: 1250, y: 360 },
  { x: 1780, y: 620 },
  { x: 2380, y: 410 },
  { x: 2720, y: 880 },
  { x: 430, y: 1260 },
  { x: 1040, y: 1100 },
  { x: 1540, y: 1420 },
  { x: 2180, y: 1220 },
  { x: 2660, y: 1660 },
  { x: 560, y: 2040 },
  { x: 1120, y: 2320 },
  { x: 1760, y: 2100 },
  { x: 2380, y: 2460 },
] as const;

const creaturePositions = [
  { x: 520, y: 760 },
  { x: 1460, y: 820 },
  { x: 2320, y: 780 },
  { x: 920, y: 1780 },
  { x: 2020, y: 1880 },
  { x: 1520, y: 2540 },
] as const;

function cloneResourceNode(node: ResourceNodeState): ResourceNodeState {
  const currentTile = getEntityTileById(node.id);
  return {
    ...node,
    position: { ...node.position },
    currentTile,
  } as ResourceNodeState;
}

function cloneCreatureSpawn(spawn: (typeof STARTER_CREATURE_SPAWNS)[number]): CreaturePublicState {
  const currentTile = getEntityTileById(spawn.id);
  const maxHp = 60 + spawn.level * 10;
  return {
    id: spawn.id,
    speciesId: spawn.speciesId,
    regionId: spawn.regionId,
    position: { ...spawn.position },
    currentTile,
    level: spawn.level,
    hp: maxHp,
    maxHp,
    traitIds: [...(spawn.traitIds ?? [])],
  } as CreaturePublicState;
}

function makeResource(regionId: string, tileX: number, tileY: number, index: number): ResourceNodeState {
  const resourceTypes = resourceTypesByRegion[regionId] ?? resourceTypesByRegion.starter_meadow;
  const resourceType = resourceTypes[index % resourceTypes.length];
  const base = resourcePositions[(index + tileX * 4 + tileY * 7) % resourcePositions.length];
  const currentTile: MapTileRef = { regionId, tileX, tileY } as MapTileRef;
  const amount = resourceType === "fiber" || resourceType === "berry" || resourceType === "herb" ? 55 : resourceType === "ore" ? 130 : resourceType === "coal" ? 115 : 105;

  return {
    id: `res-${regionId}-${tileX}-${tileY}-${resourceType}-dense-${index}`,
    regionId,
    resourceType,
    position: { x: base.x, y: base.y },
    currentTile,
    remainingAmount: amount,
    maxAmount: amount,
  } as ResourceNodeState;
}

function makeCreature(regionId: string, tileX: number, tileY: number, index: number): CreaturePublicState {
  const creatureTypes = creatureTypesByRegion[regionId] ?? creatureTypesByRegion.starter_meadow;
  const speciesId = creatureTypes[index % creatureTypes.length];
  const base = creaturePositions[(index + tileX * 2 + tileY * 3) % creaturePositions.length];
  const currentTile: MapTileRef = { regionId, tileX, tileY } as MapTileRef;
  const levelBase = regionId === "stone_hills" ? 9 : 2;
  const level = levelBase + tileX + tileY + Math.floor(index / 2);
  const maxHp = regionId === "stone_hills" ? 105 + level * 9 : 58 + level * 8;

  return {
    id: `mob-${regionId}-${tileX}-${tileY}-${speciesId}-dense-${index}`,
    speciesId,
    regionId,
    position: { x: base.x, y: base.y },
    currentTile,
    level,
    hp: maxHp,
    maxHp,
    traitIds: index % 3 === 0 ? ["sturdy"] : index % 3 === 1 ? ["nimble"] : ["brave"],
  } as CreaturePublicState;
}

export function createTileBasedDemoResources(): ResourceNodeState[] {
  const resources = STARTER_RESOURCE_NODES.map(cloneResourceNode);
  for (const regionId of regionIds) {
    for (let tileY = 0; tileY < tileSize; tileY += 1) {
      for (let tileX = 0; tileX < tileSize; tileX += 1) {
        for (let index = 0; index < 15; index += 1) {
          resources.push(makeResource(regionId, tileX, tileY, index));
        }
      }
    }
  }
  return resources;
}

export function createTileBasedDemoCreatures(): CreaturePublicState[] {
  const creatures = STARTER_CREATURE_SPAWNS.map(cloneCreatureSpawn);
  for (const regionId of regionIds) {
    for (let tileY = 0; tileY < tileSize; tileY += 1) {
      for (let tileX = 0; tileX < tileSize; tileX += 1) {
        for (let index = 0; index < 6; index += 1) {
          creatures.push(makeCreature(regionId, tileX, tileY, index));
        }
      }
    }
  }
  return creatures;
}

export function createTileBasedDemoBuildings(): BuildingState[] {
  return [
    {
      id: "demo-building-starter_meadow-1-1-workbench",
      type: "workbench" as BuildingType,
      ownerPlayerId: demoPlayerId,
      position: { x: 1500, y: 1660 },
      currentTile: { ...DEFAULT_PLAYER_TILE },
      hp: 300,
      maxHp: 300,
    } as BuildingState,
  ];
}
