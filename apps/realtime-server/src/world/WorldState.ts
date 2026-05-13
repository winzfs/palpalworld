import type { BuildingState, CreaturePublicState, PlayerPublicState, ResourceNodeState, WorldSnapshot } from "@palpalworld/shared";
import { CREATURE_CATALOG, STARTER_CREATURE_SPAWNS, STARTER_RESOURCE_NODES, WORLD } from "@palpalworld/shared";
import { getEntityTileById } from "../../../../packages/shared/src/worldTiles";

export class WorldState {
  readonly players = new Map<string, PlayerPublicState>();
  readonly creatures = new Map<string, CreaturePublicState>();
  readonly resources = new Map<string, ResourceNodeState>();
  readonly buildings = new Map<string, BuildingState>();

  constructor() {
    this.seedStarterIsland();
  }

  createSnapshot(): WorldSnapshot {
    return {
      worldId: WORLD.defaultWorldId,
      serverTime: Date.now(),
      players: [...this.players.values()],
      creatures: [...this.creatures.values()].filter((creature) => creature.hp > 0),
      resources: [...this.resources.values()].filter((resource) => resource.remainingAmount > 0),
      buildings: [...this.buildings.values()],
    };
  }

  private seedStarterIsland() {
    for (const resource of STARTER_RESOURCE_NODES) {
      this.resources.set(resource.id, {
        ...resource,
        position: { ...resource.position },
        currentTile: getEntityTileById(resource.id),
      } as ResourceNodeState);
    }

    for (const spawn of STARTER_CREATURE_SPAWNS) {
      const species = CREATURE_CATALOG[spawn.speciesId as keyof typeof CREATURE_CATALOG];
      if (!species) continue;

      const traitIds = [...(spawn.traitIds ?? [])];
      const maxHp = species.baseHp + spawn.level * 8;

      this.creatures.set(spawn.id, {
        id: spawn.id,
        speciesId: spawn.speciesId,
        regionId: spawn.regionId,
        position: { ...spawn.position },
        currentTile: getEntityTileById(spawn.id),
        level: spawn.level,
        hp: maxHp,
        maxHp,
        traitIds,
      } as CreaturePublicState);
    }
  }
}
