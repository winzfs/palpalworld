import type { BuildingType } from "@palpalworld/shared";
import { getItemLabel } from "../items/itemLabels";
import { PROGRESSION_BUILDINGS, PROGRESSION_RECIPES, type ProgressionTier } from "./progressionCatalog";

const tiers: ProgressionTier[] = ["초반", "초중반", "중반", "중후반"];

function formatStacks(stacks: { itemId: string; amount: number }[]) {
  return stacks.map((stack) => `${getItemLabel(stack.itemId)} ${stack.amount}`).join(" · ");
}

export function CraftingPanel({
  onCraft,
  onPlaceBuilding,
}: {
  onCraft: (recipeId: string) => void;
  onPlaceBuilding: (buildingType: BuildingType | string) => void;
}) {
  return (
    <div className="feature-panel feature-panel--crafting">
      {tiers.map((tier) => {
        const recipes = PROGRESSION_RECIPES.filter((recipe) => recipe.tier === tier);
        const buildings = PROGRESSION_BUILDINGS.filter((building) => building.tier === tier);

        return (
          <section key={tier} className="crafting-tier">
            <div className="feature-panel__section-title">{tier} 제작</div>
            <div className="control-grid control-grid--wide">
              {recipes.map((recipe) => (
                <button key={recipe.id} className="crafting-card" onClick={() => onCraft(recipe.id)}>
                  <b>{recipe.name}</b>
                  <span>{recipe.description}</span>
                  <small>시설: {recipe.station} · 재료: {formatStacks(recipe.inputs)}</small>
                </button>
              ))}
            </div>

            <div className="feature-panel__section-title">{tier} 건설</div>
            <div className="control-grid control-grid--wide">
              {buildings.map((building) => (
                <button key={building.type} className="crafting-card" onClick={() => onPlaceBuilding(building.type)}>
                  <b>{building.name}</b>
                  <span>{building.description}</span>
                  <small>Lv.{building.unlockLevel} · {building.category} · 재료: {formatStacks(building.requires)}</small>
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
