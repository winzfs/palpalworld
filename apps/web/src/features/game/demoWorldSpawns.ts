import type { BuildingState, BuildingType, CreaturePublicState, ResourceNodeState } from "@palpalworld/shared";
import { STARTER_CREATURE_SPAWNS, STARTER_RESOURCE_NODES } from "@palpalworld/shared";
import { DEFAULT_PLAYER_TILE, getEntityTileById, type MapTileRef } from "../../../../../packages/shared/src/worldTiles";

const demoPlayerId = "demo-player";
const regionIds = ["starter_meadow", "stone_hills"] as const;
const tileSize = 3;
const resourcesPerTile = 42;
const creaturesPerTile = 16;

const resourceTypesByRegion: Record<string, string[]> = {
  starter_meadow: [
    "wood", "wood", "wood", "fiber", "fiber", "stone", "berry", "berry", "herb", "wood", "fiber", "stone",
  ],
  stone_hills: [
    "stone", "stone", "stone", "ore", "ore", "ore", "coal", "coal", "stone", "ore", "stone", "coal",
  ],
};

const creatureTypesByRegion: Record<string, string[]> = {
  starter_meadow: ["leafbun", "leafbun", "droplet", "sparkit", "leafbun", "droplet", "sparkit", "mossboar"],
  stone_hills: ["rockturtle", "rockturtle", "moleminer", "sparkit", "rockturtle", "moleminer", "moleminer", "sparkit"],
};

const resourcePositions = [
  { x: 210, y: 250 },
  { x: 470, y: 390 },
  { x: 760, y: 230 },
  { x: 1050, y: 460 },
  { x: 1320, y: 280 },
  { x: 1630, y: 520 },
  { x: 1940, y: 300 },
  { x: 2260, y: 500 },
  { x: 2580, y: 270 },
  { x: 2820, y: 660 },
  { x: 270, y: 820 },
  { x: 620, y: 740 },
  { x: 940, y: 900 },
  { x: 1240, y: 760 },
  { x: 1520, y: 980 },
  { x: 1840, y: 820 },
  { x: 2160, y: 1040 },
  { x: 2480, y: 900 },
  { x: 2780, y: 1160 },
  { x: 350, y: 1320 },
  { x: 720, y: 1480 },
  { x: 1080, y: 1280 },
  { x: 1420, y: 1550 },
  { x: 1760, y: 1350 },
  { x: 2100, y: 1580 },
  { x: 2460, y: 1420 },
  { x: 2800, y: 1740 },
  { x: 260, y: 1960 },
  { x: 570, y: 2140 },
  { x: 910, y: 1900 },
  { x: 1260, y: 2220 },
  { x: 1600, y: 2020 },
  { x: 1940, y: 2300 },
  { x: 2280, y: 2100 },
  { x: 2620, y: 2380 },
  { x: 360, y: 2660 },
  { x: 740, y: 2520 },
  { x: 1110, y: 2760 },
  { x: 1480, y: 2580 },
  { x: 1860, y: 2760 },
  { x: 2240, y: 2580 },
  { x: 2680, y: 2740 },
] as const;

const creaturePositions = [
  { x: 430, y: 610 },
  { x: 1040, y: 620 },
  { x: 1680, y: 600 },
  { x: 2320, y: 620 },
  { x: 720, y: 1080 },
  { x: 1360, y: 1140 },
  { x: 2060, y: 1120 },
  { x: 2680, y: 1240 },
  { x: 470, y: 1660 },
  { x: 1110, y: 1740 },
  { x: 1760, y: 1680 },
  { x: 2440, y: 1780 },
  { x: 720, y: 2320 },
  { x: 1360, y: 2460 },
  { x: 2040, y: 2320 },
  { x: 2660, y: 2520 },
] as const;

function offsetPosition(position: { x: number; y: number }, tileX: number, tileY: number, index: number) {
  const jitterX = ((tileX * 97 + tileY * 53 + index * 37) % 121) - 60;
  const jitterY = ((tileX * 43 + tileY * 89 + index * 29) % 121) - 60;
  return {
    x: Math.max(160, Math.min(2840, position.x + jitterX)),
    y: Math.max(160, Math.min(2840, position.y + jitterY)),
  };
}

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
  const resourceType = resourceTypes[(index + tileX + tileY * 2) % resourceTypes.length];
  const base = resourcePositions[index % resourcePositions.length];
  const currentTile: MapTileRef = { regionId, tileX, tileY } as MapTileRef;
  const amount = resourceType === "fiber" || resourceType === "berry" || resourceType === "herb" ? 55 : resourceType === "ore" ? 130 : resourceType === "coal" ? 115 : 105;

  return {
    id: `res-${regionId}-${tileX}-${tileY}-${resourceType}-ultra-${index}`,
    regionId,
    resourceType,
    position: offsetPosition(base, tileX, tileY, index),
    currentTile,
    remainingAmount: amount,
    maxAmount: amount,
  } as ResourceNodeState;
}

function makeCreature(regionId: string, tileX: number, tileY: number, index: number): CreaturePublicState {
  const creatureTypes = creatureTypesByRegion[regionId] ?? creatureTypesByRegion.starter_meadow;
  const speciesId = creatureTypes[(index + tileX + tileY) % creatureTypes.length];
  const base = creaturePositions[index % creaturePositions.length];
  const currentTile: MapTileRef = { regionId, tileX, tileY } as MapTileRef;
  const levelBase = regionId === "stone_hills" ? 9 : 2;
  const level = levelBase + tileX + tileY + Math.floor(index / 4);
  const maxHp = regionId === "stone_hills" ? 105 + level * 9 : 58 + level * 8;

  return {
    id: `mob-${regionId}-${tileX}-${tileY}-${speciesId}-ultra-${index}`,
    speciesId,
    regionId,
    position: offsetPosition(base, tileX, tileY, index + 11),
    currentTile,
    level,
    hp: maxHp,
    maxHp,
    traitIds: index % 4 === 0 ? ["sturdy"] : index % 4 === 1 ? ["nimble"] : index % 4 === 2 ? ["brave"] : ["hard_worker"],
  } as CreaturePublicState;
}

export function createTileBasedDemoResources(): ResourceNodeState[] {
  const resources = STARTER_RESOURCE_NODES.map(cloneResourceNode);
  for (const regionId of regionIds) {
    for (let tileY = 0; tileY < tileSize; tileY += 1) {
      for (let tileX = 0; tileX < tileSize; tileX += 1) {
        for (let index = 0; index < resourcesPerTile; index += 1) {
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
        for (let index = 0; index < creaturesPerTile; index += 1) {
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
