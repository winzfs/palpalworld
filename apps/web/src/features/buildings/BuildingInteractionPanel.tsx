import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { BuildingState, InventoryState, ItemStack } from "@palpalworld/shared";
import { getCraftingStationByBuildingType, getProgressionBuilding, type CraftingStationId } from "../crafting/progressionCatalog";
import { addInventoryStack, createFallbackInventory, getInventoryAmount, readStoredInventory, removeInventoryStack, writeStoredInventory } from "../inventory/inventoryStore";
import { StorageBoxPanel } from "../storage/StorageBoxPanel";
import { addStorageStack, readStorageBoxItems, removeStorageStack, writeStorageBoxItems } from "../storage/storageStore";
import { BuildingPanelHeader } from "./BuildingPanelHeader";
import { canDismantleBuilding } from "./buildingPanelRules";
import { BuildingSpecificPanel } from "./BuildingSpecificPanel";

function isStorageBuilding(buildingType: string) {
  return buildingType === "storage_box" || buildingType === "cold_storage";
}

function cloneInventoryForView(inventory: InventoryState): InventoryState {
  return {
    ownerPlayerId: inventory.ownerPlayerId,
    items: inventory.items.map((item) => ({ itemId: item.itemId, amount: item.amount })).filter((item) => item.amount > 0),
    itemInstances: inventory.itemInstances.map((item) => ({ ...item, traitIds: [...item.traitIds] })),
  };
}

export function BuildingInteractionPanel({
  building,
  inventory,
  onInventoryChange,
  onClose,
  onOpenCrafting,
  onDismantle,
}: {
  building: BuildingState | null;
  inventory?: InventoryState | null;
  onInventoryChange?: (inventory: InventoryState) => void;
  onClose: () => void;
  onOpenCrafting?: (stationId: CraftingStationId) => void;
  onDismantle?: (building: BuildingState, refunds: ItemStack[]) => void;
}) {
  const [activeInventory, setActiveInventory] = useState<InventoryState>(() => readStoredInventory(inventory ?? createFallbackInventory()));
  const [storageItems, setStorageItems] = useState<ItemStack[]>(() => readStorageBoxItems(building));
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalHost(document.body);
  }, []);

  useEffect(() => {
    if (inventory) setActiveInventory(cloneInventoryForView(inventory));
  }, [inventory]);

  useEffect(() => {
    const handleInventoryChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{ inventory?: InventoryState }>;
      if (customEvent.detail?.inventory) setActiveInventory(customEvent.detail.inventory);
      else if (!inventory) setActiveInventory(readStoredInventory(createFallbackInventory()));
    };
    window.addEventListener("palpalworld:inventory-changed", handleInventoryChanged);
    return () => window.removeEventListener("palpalworld:inventory-changed", handleInventoryChanged);
  }, [inventory]);

  useEffect(() => {
    setStorageItems(readStorageBoxItems(building));
  }, [building?.id, building?.type]);

  if (!building) return null;

  const definition = getProgressionBuilding(building.type);
  const station = getCraftingStationByBuildingType(String(building.type));
  const hpPercent = Math.max(0, Math.min(100, Math.round((building.hp / building.maxHp) * 100)));
  const title = definition?.name ?? building.type;

  const updateInventory = (nextInventory: InventoryState) => {
    const storedInventory = writeStoredInventory(nextInventory);
    setActiveInventory(storedInventory);
    onInventoryChange?.(storedInventory);
  };

  const handleFallbackDismantle = (targetBuilding: BuildingState, refunds: ItemStack[]) => {
    if (!canDismantleBuilding(targetBuilding)) return;
    const refundedInventory = refunds.reduce((next, refund) => addInventoryStack(next, refund.itemId, refund.amount), activeInventory);
    updateInventory(refundedInventory);
    window.dispatchEvent(new CustomEvent("palpalworld:building-dismantled", { detail: { buildingId: targetBuilding.id, building: targetBuilding } }));
    onDismantle?.(targetBuilding, refunds);
    onClose();
  };

  const handleDeposit = (itemId: string, amount: number) => {
    const owned = getInventoryAmount(activeInventory, itemId);
    const nextAmount = Math.min(amount, owned);
    if (nextAmount <= 0) return;
    updateInventory(removeInventoryStack(activeInventory, itemId, nextAmount));
    setStorageItems((current) => {
      const next = addStorageStack(current, itemId, nextAmount);
      writeStorageBoxItems(building, next);
      return next;
    });
  };

  const handleWithdraw = (itemId: string, amount: number) => {
    const stored = storageItems.find((item) => item.itemId === itemId)?.amount ?? 0;
    const nextAmount = Math.min(amount, stored);
    if (nextAmount <= 0) return;
    setStorageItems((current) => {
      const next = removeStorageStack(current, itemId, nextAmount);
      writeStorageBoxItems(building, next);
      return next;
    });
    updateInventory(addInventoryStack(activeInventory, itemId, nextAmount));
  };

  if (isStorageBuilding(building.type)) {
    const storageWindow = (
      <div className="storage-overlay-panel storage-overlay-panel--with-real-header" aria-label="보관함">
        <BuildingPanelHeader
          title={title}
          building={building}
          onDismantle={handleFallbackDismantle}
          onClose={onClose}
          closeLabel="보관함 닫기"
          className="building-interaction__header storage-overlay-panel__header"
        />
        <StorageBoxPanel
          inventory={activeInventory}
          storageItems={storageItems}
          onDeposit={handleDeposit}
          onWithdraw={handleWithdraw}
        />
      </div>
    );

    return (
      <>
        <span className="storage-menu-empty-marker" aria-hidden="true" />
        {portalHost ? createPortal(storageWindow, portalHost) : null}
      </>
    );
  }

  return (
    <div className="feature-panel feature-panel--building-interaction">
      <div className="feature-panel__section-title">건설물 상호작용</div>
      <BuildingPanelHeader
        title={title}
        building={building}
        onDismantle={handleFallbackDismantle}
        onClose={onClose}
        closeLabel="건설물 창 닫기"
      />
      <p className="feature-panel__hint">{definition?.description ?? "설치된 건설물입니다."}</p>
      <div className="building-interaction__stats">
        <span>내구도</span>
        <b>{building.hp} / {building.maxHp} ({hpPercent}%)</b>
      </div>

      {station ? (
        <>
          <button className="building-interaction__action" onClick={() => onOpenCrafting?.(station.id)}>
            {station.name} 열기
          </button>
          <p className="feature-panel__hint">{station.description}</p>
        </>
      ) : (
        <BuildingSpecificPanel
          building={building}
          inventory={activeInventory}
          onInventoryChange={updateInventory}
        />
      )}
    </div>
  );
}
