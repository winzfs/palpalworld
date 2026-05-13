import type { CreaturePublicState, PlayerPublicState, ResourceNodeState, WorldSnapshot } from "@palpalworld/shared";
import { WORLD } from "@palpalworld/shared";

export class WorldState {
  readonly players = new Map<string, PlayerPublicState>();
  readonly creatures = new Map<string, CreaturePublicState>();
  readonly resources = new Map<string, ResourceNodeState>();

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
    };
  }

  private seedStarterIsland() {
    const starterResources: ResourceNodeState[] = [
      { id: "tree-1", resourceType: "wood", position: { x: 320, y: 240 }, remainingAmount: 100, maxAmount: 100 },
      { id: "tree-2", resourceType: "wood", position: { x: 240, y: 420 }, remainingAmount: 100, maxAmount: 100 },
      { id: "stone-1", resourceType: "stone", position: { x: 520, y: 360 }, remainingAmount: 100, maxAmount: 100 },
      { id: "fiber-1", resourceType: "fiber", position: { x: 430, y: 250 }, remainingAmount: 60, maxAmount: 60 },
      { id: "berry-1", resourceType: "berry", position: { x: 680, y: 300 }, remainingAmount: 40, maxAmount: 40 },
    ];

    for (const resource of starterResources) {
      this.resources.set(resource.id, resource);
    }
  }
}
