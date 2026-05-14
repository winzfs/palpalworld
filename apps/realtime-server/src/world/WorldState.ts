import type { BuildingState, CreaturePublicState, PlayerPublicState, ResourceNodeState, WorldSnapshot } from "@palpalworld/shared";
import { CREATURE_CATALOG, STARTER_CREATURE_SPAWNS, STARTER_RESOURCE_NODES, WORLD } from "@palpalworld/shared";
import { clampPositionToTile, getEntityTileById } from "../../../../packages/shared/src/worldTiles";

export class WorldState {
  readonly players = new Map<string, PlayerPublicState>();
  readonly creatures = new Map<string, CreaturePublicState>();
  readonly resources = new Map<string, ResourceNodeState>();
  readonly buildings = new Map<string, BuildingState>();

  constructor() {
    this.seedStarterIsland();
  }

  createSnapshot(): WorldSnapshot {
    this.clampWorldPositions();

    return {
      worldId: WORLD.defaultWorldId,
      serverTime: Date.now(),
      players: [...this.players.values()],
      creatures: [...this.creatures.values()].filter((creature) => creature.hp > 0),
      resources: [...this.resources.values()].filter((resource) => resource.remainingAmount > 0),
      buildings: [...this.buildings.values()],
    };
  }

  private clampWorldPositions() {
    for (const player of this.players.values()) player.position = clampPositionToTile(player.position);
    for (const creature of this.creatures.values()) creature.position = clampPositionToTile(creature.position);
    for (const resource of this.resources.values()) resource.position = clampPositionToTile(resource.position);
    for (const building of this.buildings.values()) building.position = clampPositionToTile(building.position);
  }

  private seedStarterIsland() {
    for (const resource of STARTER_RESOURCE_NODES) {
      this.resources.set(resource.id, {
        ...resource,
        position: clampPositionToTile(resource.position),
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
        position: clampPositionToTile(spawn.position),
        currentTile: getEntityTileById(spawn.id),
        level: spawn.level,
        hp: maxHp,
        maxHp,
        traitIds,
      } as CreaturePublicState);
    }
  }
}
