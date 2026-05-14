import type { BuildingState, BuildingType, CreaturePublicState, ResourceNodeState } from "@palpalworld/shared";
import { STARTER_CREATURE_SPAWNS, STARTER_RESOURCE_NODES } from "@palpalworld/shared";
import { DEFAULT_PLAYER_TILE, getEntityTileById } from "../../../../../packages/shared/src/worldTiles";

const demoPlayerId = "demo-player";

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

export function createTileBasedDemoResources(): ResourceNodeState[] {
  return STARTER_RESOURCE_NODES.map(cloneResourceNode);
}

export function createTileBasedDemoCreatures(): CreaturePublicState[] {
  return STARTER_CREATURE_SPAWNS.map(cloneCreatureSpawn);
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
