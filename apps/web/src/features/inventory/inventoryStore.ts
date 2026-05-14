import type { InventoryState, ItemStack } from "@palpalworld/shared";

const inventoryStorageKey = "palpalworld.demo.inventory";

function cloneInventory(inventory: InventoryState): InventoryState {
  return {
    ownerPlayerId: inventory.ownerPlayerId,
    items: inventory.items
      .map((item) => ({ itemId: item.itemId, amount: item.amount }))
      .filter((item) => item.amount > 0),
    itemInstances: inventory.itemInstances.map((item) => ({
      ...item,
      traitIds: [...item.traitIds],
    })),
  };
}

export function createFallbackInventory(): InventoryState {
  return {
    ownerPlayerId: "demo-player",
    items: [
      { itemId: "wood", amount: 30 },
      { itemId: "stone", amount: 24 },
      { itemId: "fiber", amount: 18 },
      { itemId: "berry", amount: 10 },
    ],
    itemInstances: [],
  };
}

export function readStoredInventory(fallback?: InventoryState | null): InventoryState {
  if (typeof window === "undefined") return cloneInventory(fallback ?? createFallbackInventory());

  try {
    const raw = window.localStorage.getItem(inventoryStorageKey);
    if (!raw) return cloneInventory(fallback ?? createFallbackInventory());

    const parsed = JSON.parse(raw) as Partial<InventoryState>;
    return cloneInventory({
      ownerPlayerId: parsed.ownerPlayerId ?? fallback?.ownerPlayerId ?? "demo-player",
      items: parsed.items ?? fallback?.items ?? [],
      itemInstances: parsed.itemInstances ?? fallback?.itemInstances ?? [],
    });
  } catch {
    return cloneInventory(fallback ?? createFallbackInventory());
  }
}

export function writeStoredInventory(inventory: InventoryState): InventoryState {
  const next = cloneInventory(inventory);

  if (typeof window !== "undefined") {
    window.localStorage.setItem(inventoryStorageKey, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("palpalworld:inventory-changed", { detail: { inventory: next } }));
  }

  return next;
}

export function syncInventoryFromProps(inventory: InventoryState | null) {
  if (!inventory || typeof window === "undefined") return null;
  return writeStoredInventory(inventory);
}

export function addInventoryStack(inventory: InventoryState, itemId: string, amount: number): InventoryState {
  if (amount <= 0) return cloneInventory(inventory);

  const items: ItemStack[] = inventory.items.map((item) => ({ ...item }));
  const existing = items.find((item) => item.itemId === itemId);

  if (existing) existing.amount += amount;
  else items.push({ itemId, amount });

  return cloneInventory({ ...inventory, items });
}

export function removeInventoryStack(inventory: InventoryState, itemId: string, amount: number): InventoryState {
  if (amount <= 0) return cloneInventory(inventory);

  const items = inventory.items
    .map((item) => item.itemId === itemId ? { ...item, amount: Math.max(0, item.amount - amount) } : { ...item })
    .filter((item) => item.amount > 0);

  return cloneInventory({ ...inventory, items });
}

export function getInventoryAmount(inventory: InventoryState, itemId: string) {
  return inventory.items.find((item) => item.itemId === itemId)?.amount ?? 0;
}
