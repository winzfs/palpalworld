import type { InventoryState, ItemId, ItemInstance, ItemInstanceId, ItemStack, PlayerId } from "@palpalworld/shared";
import { ITEM_CATALOG } from "@palpalworld/shared";

export class InventoryStore {
  private inventories = new Map<PlayerId, ItemStack[]>();
  private itemInstances = new Map<PlayerId, ItemInstance[]>();

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

    const instances: ItemInstance[] = [
      this.createItemInstance(playerId, "training_sword", ["sharp"]),
      this.createItemInstance(playerId, "explorer_jacket"),
      this.createItemInstance(playerId, "leather_boots"),
    ];

    this.inventories.set(playerId, items);
    this.itemInstances.set(playerId, instances);
    return this.getInventory(playerId);
  }

  deleteInventory(playerId: PlayerId) {
    this.inventories.delete(playerId);
    this.itemInstances.delete(playerId);
  }

  getInventory(playerId: PlayerId): InventoryState {
    return {
      ownerPlayerId: playerId,
      items: [...(this.inventories.get(playerId) ?? [])].filter((item) => item.amount > 0),
      itemInstances: [...(this.itemInstances.get(playerId) ?? [])],
    };
  }

  getItemInstance(playerId: PlayerId, instanceId: ItemInstanceId): ItemInstance | null {
    return this.itemInstances.get(playerId)?.find((item) => item.instanceId === instanceId) ?? null;
  }

  hasItems(playerId: PlayerId, requirements: readonly ItemStack[]): boolean {
    const items = this.inventories.get(playerId) ?? [];
    return requirements.every((requirement) => {
      const owned = items.find((item) => item.itemId === requirement.itemId)?.amount ?? 0;
      return owned >= requirement.amount;
    });
  }

  addItem(playerId: PlayerId, itemId: ItemId, amount: number): InventoryState {
    const definition = ITEM_CATALOG[itemId as keyof typeof ITEM_CATALOG];
    if (definition && (definition.category === "equipment" || definition.category === "weapon" || definition.category === "mount_gear")) {
      const instances = this.itemInstances.get(playerId) ?? [];
      for (let index = 0; index < amount; index += 1) {
        instances.push(this.createItemInstance(playerId, itemId));
      }
      this.itemInstances.set(playerId, instances);
      return this.getInventory(playerId);
    }

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

  private createItemInstance(playerId: PlayerId, itemId: ItemId, traitIds: string[] = []): ItemInstance {
    return {
      instanceId: `${itemId}-${Date.now()}-${Math.floor(Math.random() * 999_999)}`,
      itemId,
      ownerPlayerId: playerId,
      level: 1,
      durability: 100,
      traitIds,
      locked: false,
    };
  }

  private compact(items: ItemStack[]) {
    return items.filter((item) => item.amount > 0);
  }
}
