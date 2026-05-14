import { useEffect, useState } from "react";
import type { BuildingState, InventoryState, ItemStack } from "@palpalworld/shared";
import { addInventoryStack, createFallbackInventory, getInventoryAmount, readStoredInventory, removeInventoryStack, writeStoredInventory } from "../inventory/inventoryStore";
import { addStorageStack, readStorageBoxItems, removeStorageStack, writeStorageBoxItems } from "./storageStore";
import { StorageBoxPanel } from "./StorageBoxPanel";

export function StorageBoxWindow({
  building,
  inventory,
  onInventoryChange,
  onClose,
}: {
  building: BuildingState | null;
  inventory?: InventoryState | null;
  onInventoryChange?: (inventory: InventoryState) => void;
  onClose: () => void;
}) {
  const [activeInventory, setActiveInventory] = useState<InventoryState>(() => readStoredInventory(inventory ?? createFallbackInventory()));
  const [storageItems, setStorageItems] = useState<ItemStack[]>(() => readStorageBoxItems(building));

  useEffect(() => {
    if (inventory) setActiveInventory(writeStoredInventory(inventory));
  }, [inventory]);

  useEffect(() => {
    const handleInventoryChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{ inventory?: InventoryState }>;
      if (customEvent.detail?.inventory) setActiveInventory(customEvent.detail.inventory);
      else setActiveInventory(readStoredInventory(inventory ?? createFallbackInventory()));
    };
    window.addEventListener("palpalworld:inventory-changed", handleInventoryChanged);
    return () => window.removeEventListener("palpalworld:inventory-changed", handleInventoryChanged);
  }, [inventory]);

  useEffect(() => {
    setStorageItems(readStorageBoxItems(building));
  }, [building?.id, building?.type]);

  if (!building) return null;

  const updateInventory = (nextInventory: InventoryState) => {
    const storedInventory = writeStoredInventory(nextInventory);
    setActiveInventory(storedInventory);
    onInventoryChange?.(storedInventory);
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

  return (
    <section className="storage-overlay-panel" aria-label="보관함">
      <button className="storage-overlay-panel__close" onClick={onClose} aria-label="보관함 닫기">×</button>
      <StorageBoxPanel
        inventory={activeInventory}
        storageItems={storageItems}
        onDeposit={handleDeposit}
        onWithdraw={handleWithdraw}
      />
    </section>
  );
}
