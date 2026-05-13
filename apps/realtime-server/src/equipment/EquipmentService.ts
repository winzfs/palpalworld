import { ITEM_CATALOG, type EquipmentSlot, type EquipmentState, type ItemInstanceId, type PlayerId } from "@palpalworld/shared";
import type { InventoryStore } from "../inventory/InventoryStore";

export type EquipResult =
  | { ok: true; equipment: EquipmentState; message: string }
  | { ok: false; reason: "missing_item" | "not_equippable" };

export type UnequipResult =
  | { ok: true; equipment: EquipmentState; message: string }
  | { ok: false; reason: "empty_slot" };

export class EquipmentService {
  private equipmentByPlayer = new Map<PlayerId, EquipmentState>();

  constructor(private readonly inventories: InventoryStore) {}

  createStarterEquipment(playerId: PlayerId): EquipmentState {
    const equipment: EquipmentState = {
      ownerPlayerId: playerId,
      slots: {},
    };
    this.equipmentByPlayer.set(playerId, equipment);
    return equipment;
  }

  deleteEquipment(playerId: PlayerId) {
    this.equipmentByPlayer.delete(playerId);
  }

  getEquipment(playerId: PlayerId): EquipmentState {
    const existing = this.equipmentByPlayer.get(playerId);
    if (existing) return existing;
    return this.createStarterEquipment(playerId);
  }

  equip(playerId: PlayerId, itemInstanceId: ItemInstanceId): EquipResult {
    const instance = this.inventories.getItemInstance(playerId, itemInstanceId);
    if (!instance) return { ok: false, reason: "missing_item" };

    const definition = ITEM_CATALOG[instance.itemId as keyof typeof ITEM_CATALOG];
    if (!definition || !("slot" in definition)) return { ok: false, reason: "not_equippable" };

    const equipment = this.getEquipment(playerId);
    equipment.slots[definition.slot] = itemInstanceId;

    return {
      ok: true,
      equipment,
      message: `${definition.name} 장착 완료`,
    };
  }

  unequip(playerId: PlayerId, slot: EquipmentSlot): UnequipResult {
    const equipment = this.getEquipment(playerId);
    if (!equipment.slots[slot]) return { ok: false, reason: "empty_slot" };

    delete equipment.slots[slot];
    return {
      ok: true,
      equipment,
      message: `${slot} 슬롯 장비 해제`,
    };
  }
}
