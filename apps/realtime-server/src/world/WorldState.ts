import type { BuildingState, CreaturePublicState, PlayerPublicState, ResourceNodeState, WorldSnapshot } from "@palpalworld/shared";
import { STARTER_RESOURCE_NODES, WORLD } from "@palpalworld/shared";

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
      creatures: [...this.creatures.values()],
      resources: [...this.resources.values()].filter((resource) => resource.remainingAmount > 0),
      buildings: [...this.buildings.values()],
    };
  }

  private seedStarterIsland() {
    for (const resource of STARTER_RESOURCE_NODES) {
      this.resources.set(resource.id, { ...resource, position: { ...resource.position } });
    }
  }
}
