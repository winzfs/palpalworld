import type { BuildingState, InventoryState, ItemStack } from "@palpalworld/shared";
import { CraftingPanel } from "../crafting/CraftingPanel";
import type { CraftingStationId } from "../crafting/progressionCatalog";
import { BuildingPanelHeader } from "./BuildingPanelHeader";

export function StationBuildingPanel({
  building,
  station,
  inventory,
  onCraft,
  onCraftBuildingItem,
  onDismantle,
  onClose,
}: {
  building: BuildingState;
  station: { id: CraftingStationId; name: string };
  inventory: InventoryState | null;
  onCraft: (recipeId: string) => void;
  onCraftBuildingItem: (buildingType: string) => void;
  onDismantle?: (building: BuildingState, refunds: ItemStack[]) => void;
  onClose: () => void;
}) {
  return (
    <section className="station-overlay-panel" aria-label={`${station.name} 제작소`}>
      <BuildingPanelHeader
        title={station.name}
        building={building}
        onDismantle={onDismantle}
        onClose={onClose}
        closeLabel="제작소 닫기"
        className="building-interaction__header station-overlay-panel__header"
      />
      <div className="station-overlay-panel__body">
        <CraftingPanel
          inventory={inventory}
          stationId={station.id}
          compact
          onCraft={onCraft}
          onCraftBuildingItem={onCraftBuildingItem}
        />
      </div>
    </section>
  );
}
