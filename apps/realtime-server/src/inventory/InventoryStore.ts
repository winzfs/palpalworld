import type { InventoryState, ItemId, ItemStack, PlayerId } from "@palpalworld/shared";

export class InventoryStore {
  private inventories = new Map<PlayerId, ItemStack[]>();

  createStarterInventory(playerId: PlayerId): InventoryState {
    const items: ItemStack[] = [
      { itemId: "basic_axe", amount: 1 },
      { itemId: "basic_pickaxe", amount: 1 },
      { itemId: "basic_sickle", amount: 1 },
      { itemId: "capture_orb", amount: 5 },
      { itemId: "wood", amount: 30 },
      { itemId: "stone", amount: 20 },
      { itemId: "fiber", amount: 10 },
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
      items: [...(this.inventories.get(playerId) ?? [])].filter((item) => item.amount > 0),
    };
  }

  hasItems(playerId: PlayerId, requirements: readonly ItemStack[]): boolean {
    const items = this.inventories.get(playerId) ?? [];
    return requirements.every((requirement) => {
      const owned = items.find((item) => item.itemId === requirement.itemId)?.amount ?? 0;
      return owned >= requirement.amount;
    });
  }

  addItem(playerId: PlayerId, itemId: ItemId, amount: number): InventoryState {
    const items = this.inventories.get(playerId) ?? [];
    const existing = items.find((item) => item.itemId === itemId);

    if (existing) {
      existing.amount += amount;
    } else {
      items.push({ itemId, amount });
    }

    this.inventories.set(playerId, this.compact(items));
    return this.getInventory(playerId);
  }

  addItems(playerId: PlayerId, stacks: readonly ItemStack[]): InventoryState {
    let next = this.getInventory(playerId);
    for (const stack of stacks) {
      next = this.addItem(playerId, stack.itemId, stack.amount);
    }
    return next;
  }

  consumeItems(playerId: PlayerId, requirements: readonly ItemStack[]): InventoryState | null {
    if (!this.hasItems(playerId, requirements)) return null;

    const items = this.inventories.get(playerId) ?? [];
    for (const requirement of requirements) {
      const existing = items.find((item) => item.itemId === requirement.itemId);
      if (existing) {
        existing.amount -= requirement.amount;
      }
    }

    this.inventories.set(playerId, this.compact(items));
    return this.getInventory(playerId);
  }

  private compact(items: ItemStack[]) {
    return items.filter((item) => item.amount > 0);
  }
}
