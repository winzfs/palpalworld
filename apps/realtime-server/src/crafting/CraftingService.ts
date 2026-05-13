import { BUILDING_CATALOG, CRAFTING_RECIPES, type BuildingType, type InventoryState, type ItemStack } from "@palpalworld/shared";
import type { InventoryStore } from "../inventory/InventoryStore";

const buildingItemPrefix = "building_";

function getBuildingItemId(buildingType: BuildingType) {
  return `${buildingItemPrefix}${buildingType}`;
}

function getBuildingTypeFromItemId(itemId: string): BuildingType | null {
  if (!itemId.startsWith(buildingItemPrefix)) return null;
  const buildingType = itemId.slice(buildingItemPrefix.length) as BuildingType;
  return BUILDING_CATALOG[buildingType] ? buildingType : null;
}

export type CraftResult =
  | {
      ok: true;
      recipeId: string;
      inventory: InventoryState;
      message: string;
    }
  | {
      ok: false;
      reason: "missing_recipe" | "missing_materials";
    };

export class CraftingService {
  constructor(private readonly inventories: InventoryStore) {}

  craft(playerId: string, recipeId: string): CraftResult {
    const buildingType = getBuildingTypeFromItemId(recipeId);
    if (buildingType) {
      return this.craftBuildingItem(playerId, buildingType, recipeId);
    }

    const recipe = CRAFTING_RECIPES[recipeId as keyof typeof CRAFTING_RECIPES];
    if (!recipe) return { ok: false, reason: "missing_recipe" };

    const consumed = this.inventories.consumeItems(playerId, recipe.inputs);
    if (!consumed) return { ok: false, reason: "missing_materials" };

    const inventory = this.inventories.addItems(playerId, recipe.outputs);
    return {
      ok: true,
      recipeId,
      inventory,
      message: `${recipe.name} 제작 완료`,
    };
  }

  private craftBuildingItem(playerId: string, buildingType: BuildingType, recipeId: string): CraftResult {
    const definition = BUILDING_CATALOG[buildingType];
    if (!definition) return { ok: false, reason: "missing_recipe" };

    const consumed = this.inventories.consumeItems(playerId, definition.requires);
    if (!consumed) return { ok: false, reason: "missing_materials" };

    const output: ItemStack = { itemId: getBuildingItemId(buildingType), amount: 1 };
    const inventory = this.inventories.addItem(playerId, output.itemId, output.amount);
    return {
      ok: true,
      recipeId,
      inventory,
      message: `${definition.name} 설치 아이템 제작 완료`,
    };
  }
}
