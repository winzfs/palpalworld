import type { InventoryState, ItemId, ItemStack, PlayerId } from "@palpalworld/shared";

export class InventoryStore {
  private inventories = new Map<PlayerId, ItemStack[]>();

  createStarterInventory(playerId: PlayerId): InventoryState {
    const items: ItemStack[] = [
      { itemId: "basic_axe", amount: 1 },
      { itemId: "basic_pickaxe", amount: 1 },
      { itemId: "capture_orb", amount: 5 },
    ];
    this.inventories.set(playerId, items);
    return this.getInventory(playerId);
  }

  deleteInventory(playerId: PlayerId) {
    this.inventories.delete(playerId);
  }

  getInventory(playerId: PlayerId): InventoryState {
    return {
      ownerPlayerId: playerId,
      items: [...(this.inventories.get(playerId) ?? [])],
    };
  }

  addItem(playerId: PlayerId, itemId: ItemId, amount: number): InventoryState {
    const items = this.inventories.get(playerId) ?? [];
    const existing = items.find((item) => item.itemId === itemId);

    if (existing) {
      existing.amount += amount;
    } else {
      items.push({ itemId, amount });
    }

    this.inventories.set(playerId, items);
    return this.getInventory(playerId);
  }
}
