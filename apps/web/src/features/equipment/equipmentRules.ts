import type { EquipmentSlot, EquipmentState, InventoryState, ItemInstance, ItemInstanceId } from "@palpalworld/shared";

export type EquipmentSlotDefinition = {
  id: EquipmentSlot;
  label: string;
  shortLabel: string;
};

export const EQUIPMENT_SLOTS: EquipmentSlotDefinition[] = [
  { id: "head", label: "머리", shortLabel: "투구" },
  { id: "accessory1", label: "장신구 1", shortLabel: "장신구" },
  { id: "weapon", label: "무기", shortLabel: "무기" },
  { id: "body", label: "몸", shortLabel: "갑옷" },
  { id: "hands", label: "손", shortLabel: "장갑" },
  { id: "accessory2", label: "장신구 2", shortLabel: "장신구" },
  { id: "feet", label: "발", shortLabel: "신발" },
  { id: "mountGear", label: "탈것 장비", shortLabel: "안장" },
];

const explicitSlotByItemId: Record<string, EquipmentSlot> = {
  training_sword: "weapon",
  iron_sword: "weapon",
  basic_axe: "weapon",
  basic_pickaxe: "weapon",
  basic_sickle: "weapon",
  torch: "weapon",
  explorer_jacket: "body",
  thermal_jacket: "body",
  leather_boots: "feet",
  cooling_charm: "accessory1",
  leafbun_saddle: "mountGear",
  mossboar_saddle: "mountGear",
  frosthorn_saddle: "mountGear",
};

export function getEquipmentSlotForItemId(itemId: string): EquipmentSlot | null {
  if (explicitSlotByItemId[itemId]) return explicitSlotByItemId[itemId];
  if (itemId.includes("sword") || itemId.includes("axe") || itemId.includes("pickaxe") || itemId.includes("sickle")) return "weapon";
  if (itemId.includes("jacket") || itemId.includes("armor")) return "body";
  if (itemId.includes("boots")) return "feet";
  if (itemId.includes("charm") || itemId.includes("ring")) return "accessory1";
  if (itemId.includes("saddle")) return "mountGear";
  return null;
}

export function isEquippableItemId(itemId: string) {
  return Boolean(getEquipmentSlotForItemId(itemId));
}

export function findItemInstance(inventory: InventoryState | null, itemInstanceId: ItemInstanceId | null | undefined) {
  if (!inventory || !itemInstanceId) return null;
  return inventory.itemInstances.find((item) => item.instanceId === itemInstanceId) ?? null;
}

export function getEquippableInstances(inventory: InventoryState | null) {
  return (inventory?.itemInstances ?? []).filter((item) => isEquippableItemId(item.itemId));
}

export function equipItemInstance(equipment: EquipmentState, item: ItemInstance): EquipmentState {
  const slot = getEquipmentSlotForItemId(item.itemId);
  if (!slot) return equipment;
  return { ...equipment, slots: { ...equipment.slots, [slot]: item.instanceId } };
}

export function unequipSlot(equipment: EquipmentState, slot: EquipmentSlot): EquipmentState {
  const nextSlots = { ...equipment.slots };
  delete nextSlots[slot];
  return { ...equipment, slots: nextSlots };
}

export function createEmptyEquipment(ownerPlayerId: string): EquipmentState {
  return { ownerPlayerId, slots: {} };
}

export function getEquippedWeaponItemId(inventory: InventoryState | null, equipment: EquipmentState | null) {
  const weaponInstanceId = equipment?.slots.weapon;
  return findItemInstance(inventory, weaponInstanceId)?.itemId ?? null;
}
