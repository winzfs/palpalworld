import type { EquipmentState, InventoryState } from "@palpalworld/shared";
import { createEmptyEquipment, equipItemInstance, findItemInstance, getEquipmentSlotForItemId, isEquippableItemId } from "../equipment/equipmentRules";
import { findInventoryEntryByKey } from "./inventoryUiModel";

const equipmentStorageKey = "palpalworld.demo.equipment";

function readStoredEquipment(ownerPlayerId: string): EquipmentState {
  if (typeof window === "undefined") return createEmptyEquipment(ownerPlayerId);
  try {
    const raw = window.localStorage.getItem(equipmentStorageKey);
    if (!raw) return createEmptyEquipment(ownerPlayerId);
    const parsed = JSON.parse(raw) as EquipmentState;
    return { ownerPlayerId, slots: parsed.slots ?? {} };
  } catch {
    return createEmptyEquipment(ownerPlayerId);
  }
}

function persistEquipment(equipment: EquipmentState, weaponItemId: string | null) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(equipmentStorageKey, JSON.stringify(equipment));
  window.dispatchEvent(new CustomEvent("palpalworld:equipment-changed", { detail: { equipment, weaponItemId } }));
}

function equipQuickSlotItem(inventory: InventoryState | null, entryKey: string | null | undefined) {
  const entry = findInventoryEntryByKey(inventory, entryKey);
  if (!entry || !isEquippableItemId(entry.itemId)) return false;

  const ownerPlayerId = inventory?.ownerPlayerId ?? "demo-player";
  const current = readStoredEquipment(ownerPlayerId);
  const targetSlot = getEquipmentSlotForItemId(entry.itemId);
  if (!targetSlot) return false;

  if (entry.instanceId) {
    const item = findItemInstance(inventory, entry.instanceId);
    if (!item) return false;
    const next = equipItemInstance(current, item);
    persistEquipment(next, targetSlot === "weapon" ? item.itemId : null);
    return true;
  }

  const pseudoInstanceId = `quick-${entry.itemId}`;
  const next: EquipmentState = {
    ...current,
    slots: {
      ...current.slots,
      [targetSlot]: pseudoInstanceId,
    },
  };
  persistEquipment(next, targetSlot === "weapon" ? entry.itemId : null);
  return true;
}

export function QuickSlotBar({
  inventory,
  quickSlots,
  onUseQuickSlot,
  onClearQuickSlot,
}: {
  inventory: InventoryState | null;
  quickSlots: (string | null)[];
  onUseQuickSlot: (slotIndex: number) => void;
  onClearQuickSlot: (slotIndex: number) => void;
}) {
  return (
    <div className="quick-slot-bar" aria-label="퀵슬롯">
      {quickSlots.map((entryKey, index) => {
        const entry = findInventoryEntryByKey(inventory, entryKey);
        return (
          <button
            key={index}
            className={entry ? "quick-slot" : "quick-slot quick-slot--empty"}
            onClick={() => {
              if (!entry) return;
              const equipped = equipQuickSlotItem(inventory, entryKey);
              if (!equipped) onUseQuickSlot(index);
            }}
            onContextMenu={(event) => {
              event.preventDefault();
              onClearQuickSlot(index);
            }}
            title={entry ? entry.label : `퀵슬롯 ${index + 1}`}
          >
            <em>{index + 1}</em>
            {entry?.iconSrc ? <img src={entry.iconSrc} alt="" /> : <span />}
            {entry?.amount ? <b>{entry.amount}</b> : null}
          </button>
        );
      })}
    </div>
  );
}
