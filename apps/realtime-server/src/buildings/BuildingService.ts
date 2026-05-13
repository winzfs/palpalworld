import { distance } from "@palpalworld/game-core";
import { BUILDING_CATALOG, WORLD, type BuildingState, type BuildingType, type ItemId, type Vector2 } from "@palpalworld/shared";
import type { InventoryStore } from "../inventory/InventoryStore";
import type { WorldState } from "../world/WorldState";

const buildingItemPrefix = "building_";

function getBuildingItemId(buildingType: BuildingType) {
  return `${buildingItemPrefix}${buildingType}`;
}

function isAllowedPlacementItem(buildingType: BuildingType, itemId: ItemId) {
  const definition = BUILDING_CATALOG[buildingType];
  if (!definition) return false;
  if (itemId === getBuildingItemId(buildingType)) return true;
  return definition.requires.length === 1 && definition.requires[0]?.itemId === itemId && definition.requires[0]?.amount === 1;
}

export type PlaceBuildingResult =
  | {
      ok: true;
      building: BuildingState;
      message: string;
    }
  | {
      ok: false;
      reason: "missing_player" | "missing_building" | "out_of_range" | "missing_materials" | "blocked";
    };

export class BuildingService {
  constructor(
    private readonly world: WorldState,
    private readonly inventories: InventoryStore,
  ) {}

  place(playerId: string, buildingType: BuildingType, position: Vector2, itemId = getBuildingItemId(buildingType)): PlaceBuildingResult {
    const player = this.world.players.get(playerId);
    if (!player) return { ok: false, reason: "missing_player" };

    const definition = BUILDING_CATALOG[buildingType];
    if (!definition || !isAllowedPlacementItem(buildingType, itemId)) return { ok: false, reason: "missing_building" };

    if (distance(player.position, position) > WORLD.buildRange) {
      return { ok: false, reason: "out_of_range" };
    }

    if (this.isBlocked(position)) {
      return { ok: false, reason: "blocked" };
    }

    const consumed = this.inventories.consumeItems(playerId, [{ itemId, amount: 1 }]);
    if (!consumed) return { ok: false, reason: "missing_materials" };

    const building: BuildingState = {
      id: `${buildingType}-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
      type: buildingType,
      ownerPlayerId: playerId,
      position,
      hp: definition.maxHp,
      maxHp: definition.maxHp,
    };

    this.world.buildings.set(building.id, building);

    return {
      ok: true,
      building,
      message: `${definition.name} 설치 완료`,
    };
  }

  private isBlocked(position: Vector2) {
    for (const building of this.world.buildings.values()) {
      if (distance(building.position, position) < WORLD.tileSize) return true;
    }
    return false;
  }
}
