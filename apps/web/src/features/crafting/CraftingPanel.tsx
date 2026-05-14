import type { InventoryState } from "@palpalworld/shared";
import { getItemLabel } from "../items/itemLabels";
import {
  CRAFTING_STATIONS,
  getBuildableBuildingsByStation,
  getCraftingStation,
  getRecipesByStation,
  type CraftingStationDefinition,
  type CraftingStationId,
  type ProgressionTier,
  type RecipeCategory,
} from "./progressionCatalog";

const tiers: ProgressionTier[] = ["초반", "초중반", "중반", "중후반"];
const categoryLabels: Record<RecipeCategory, string> = {
  material: "재료",
  tool: "도구",
  weapon: "무기",
  armor: "방어구",
  food: "음식",
  building: "건설",
  pal: "펄",
  quest: "진행",
};

function getOwnedAmount(inventory: InventoryState | null, itemId: string) {
  return inventory?.items.find((item) => item.itemId === itemId)?.amount ?? 0;
}

function canAfford(inventory: InventoryState | null, stacks: { itemId: string; amount: number }[]) {
  return stacks.every((stack) => getOwnedAmount(inventory, stack.itemId) >= stack.amount);
}

function formatCraftTime(ms: number) {
  if (ms <= 0) return "즉시";
  if (ms < 1000) return `${ms}ms`;
  return `${Math.ceil(ms / 1000)}초`;
}

function RequirementList({ inventory, stacks }: { inventory: InventoryState | null; stacks: { itemId: string; amount: number }[] }) {
  return (
    <span className="crafting-card__requirements">
      {stacks.map((stack) => {
        const owned = getOwnedAmount(inventory, stack.itemId);
        const enough = owned >= stack.amount;
        return (
          <span key={stack.itemId} className={enough ? "crafting-card__requirement crafting-card__requirement--enough" : "crafting-card__requirement crafting-card__requirement--missing"}>
            {getItemLabel(stack.itemId)} {owned}/{stack.amount}
          </span>
        );
      })}
    </span>
  );
}

function StationCraftingSection({
  station,
  inventory,
  onCraft,
  onCraftBuildingItem,
}: {
  station: CraftingStationDefinition;
  inventory: InventoryState | null;
  onCraft: (recipeId: string) => void;
  onCraftBuildingItem: (buildingType: string) => void;
}) {
  const recipes = getRecipesByStation(station.id);
  const buildableBuildings = getBuildableBuildingsByStation(station.id);
  const hasRecipes = recipes.length > 0;
  const hasBuildings = buildableBuildings.length > 0;

  return (
    <section className="crafting-station-section">
      <div className="feature-panel__section-title">{station.name}</div>
      <div className="feature-panel__hint">
        {station.description} · 제작 큐 {station.queueSize}칸
      </div>

      {!hasRecipes && !hasBuildings ? (
        <div className="feature-panel__hint">이 제작소에는 아직 등록된 레시피가 없습니다.</div>
      ) : null}

      {tiers.map((tier) => {
        const tierRecipes = recipes.filter((recipe) => recipe.tier === tier);
        const tierBuildings = buildableBuildings.filter((building) => building.tier === tier);
        if (tierRecipes.length === 0 && tierBuildings.length === 0) return null;

        return (
          <section key={`${station.id}-${tier}`} className="crafting-tier">
            {tierRecipes.length > 0 ? (
              <>
                <div className="feature-panel__section-title">{tier} 제작</div>
                <div className="control-grid control-grid--wide">
                  {tierRecipes.map((recipe) => {
                    const affordable = canAfford(inventory, recipe.inputs);
                    return (
                      <button key={recipe.id} className="crafting-card" onClick={() => onCraft(recipe.id)} disabled={!affordable}>
                        <b>{recipe.name}</b>
                        <span>{recipe.description}</span>
                        <small>{categoryLabels[recipe.category]} · 시간 {formatCraftTime(recipe.craftTimeMs)}</small>
                        <RequirementList inventory={inventory} stacks={recipe.inputs} />
                      </button>
                    );
                  })}
                </div>
              </>
            ) : null}

            {tierBuildings.length > 0 ? (
              <>
                <div className="feature-panel__section-title">{tier} 건설 아이템 제작</div>
                <div className="control-grid control-grid--wide">
                  {tierBuildings.map((building) => {
                    const affordable = canAfford(inventory, building.requires);
                    return (
                      <button key={building.type} className="crafting-card" onClick={() => onCraftBuildingItem(building.type)} disabled={!affordable}>
                        <b>{building.name} 설치 아이템</b>
                        <span>{building.description}</span>
                        <small>Lv.{building.unlockLevel} · {building.category}</small>
                        <RequirementList inventory={inventory} stacks={building.requires} />
                      </button>
                    );
                  })}
                </div>
              </>
            ) : null}
          </section>
        );
      })}
    </section>
  );
}

export function CraftingPanel({
  inventory = null,
  stationId,
  onCraft,
  onCraftBuildingItem,
}: {
  inventory?: InventoryState | null;
  stationId?: CraftingStationId;
  onCraft: (recipeId: string) => void;
  onCraftBuildingItem: (buildingType: string) => void;
}) {
  const stations = stationId ? [getCraftingStation(stationId)].filter(Boolean) as CraftingStationDefinition[] : CRAFTING_STATIONS;

  return (
    <div className="feature-panel feature-panel--crafting">
      <div className="feature-panel__hint">
        제작은 제작소 데이터 기준으로 자동 분류됩니다. 새 레시피나 건물을 추가할 때는 카탈로그 데이터만 확장하면 됩니다.
      </div>
      {stations.map((station) => (
        <StationCraftingSection
          key={station.id}
          station={station}
          inventory={inventory}
          onCraft={onCraft}
          onCraftBuildingItem={onCraftBuildingItem}
        />
      ))}
    </div>
  );
}
