import { CRAFTING_RECIPES, type InventoryState } from "@palpalworld/shared";
import type { InventoryStore } from "../inventory/InventoryStore";

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
}
