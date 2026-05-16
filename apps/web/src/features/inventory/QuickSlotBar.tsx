import type { EquipmentState, InventoryState } from "@palpalworld/shared";
import { useCallback, useEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import { createEmptyEquipment, equipItemInstance, findItemInstance, getEquipmentSlotForItemId, isEquippableItemId } from "../equipment/equipmentRules";
import { getPetItemLabel, isPetItemId } from "../pets/petInventory";
import { findInventoryEntryByKey } from "./inventoryUiModel";

const equipmentStorageKey = "palpalworld.demo.equipment";
const equippedWeaponStorageKey = "palpalworld.demo.equippedWeaponItemId";
const mountedPetStorageKey = "palpalworld.demo.mountedPetItemId";

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
  if (weaponItemId) window.localStorage.setItem(equippedWeaponStorageKey, weaponItemId);
  else window.localStorage.removeItem(equippedWeaponStorageKey);
  window.dispatchEvent(new CustomEvent("palpalworld:equipment-changed", { detail: { equipment, weaponItemId } }));
}

function persistMountedPet(itemId: string | null) {
  if (typeof window === "undefined") return;
  if (itemId) window.localStorage.setItem(mountedPetStorageKey, itemId);
  else window.localStorage.removeItem(mountedPetStorageKey);
  window.dispatchEvent(new CustomEvent("palpalworld:mounted-pet-changed", { detail: { itemId } }));
}

function readMountedPetItemId() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(mountedPetStorageKey);
}

function equipQuickSlotItem(inventory: InventoryState | null, entryKey: string | null | undefined) {
  const entry = findInventoryEntryByKey(inventory, entryKey);
  if (!entry) return false;

  if (isPetItemId(entry.itemId)) {
    persistMountedPet(entry.itemId);
    return true;
  }

  if (!isEquippableItemId(entry.itemId)) return false;

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

function useMountedPet() {
  const [mountedPetItemId, setMountedPetItemId] = useState<string | null>(() => readMountedPetItemId());

  useEffect(() => {
    const handleMountedPetChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{ itemId?: string | null }>;
      setMountedPetItemId(customEvent.detail?.itemId ?? readMountedPetItemId());
    };
    window.addEventListener("palpalworld:mounted-pet-changed", handleMountedPetChanged);
    return () => window.removeEventListener("palpalworld:mounted-pet-changed", handleMountedPetChanged);
  }, []);

  return mountedPetItemId;
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
  const mountedPetItemId = useMountedPet();
  const lastPointerUseAtRef = useRef(0);

  const useSlot = useCallback((slotIndex: number, entryKey: string | null) => {
    const entry = findInventoryEntryByKey(inventory, entryKey);
    if (!entry) return;
    const equipped = equipQuickSlotItem(inventory, entryKey);
    if (!equipped) onUseQuickSlot(slotIndex);
  }, [inventory, onUseQuickSlot]);

  const handleQuickSlotPointerDown = useCallback((event: PointerEvent<HTMLButtonElement>, slotIndex: number, entryKey: string | null) => {
    event.preventDefault();
    event.stopPropagation();
    if (!entryKey) return;
    lastPointerUseAtRef.current = performance.now();
    useSlot(slotIndex, entryKey);
  }, [useSlot]);

  const handleQuickSlotClick = useCallback((event: MouseEvent<HTMLButtonElement>, slotIndex: number, entryKey: string | null) => {
    event.preventDefault();
    event.stopPropagation();
    if (performance.now() - lastPointerUseAtRef.current < 350) return;
    useSlot(slotIndex, entryKey);
  }, [useSlot]);

  const handleDismount = useCallback((event?: PointerEvent<HTMLButtonElement> | MouseEvent<HTMLButtonElement>) => {
    event?.preventDefault();
    event?.stopPropagation();
    persistMountedPet(null);
  }, []);

  return (
    <>
      {mountedPetItemId ? (
        <button
          type="button"
          className="pet-dismount-button"
          onPointerDown={handleDismount}
          onClick={(event) => handleDismount(event)}
        >
          내리기 · {getPetItemLabel(mountedPetItemId)}
        </button>
      ) : null}
      <div
        className="quick-slot-bar"
        aria-label="퀵슬롯"
        onPointerDown={(event) => event.stopPropagation()}
        onPointerMove={(event) => event.stopPropagation()}
        onPointerUp={(event) => event.stopPropagation()}
        onTouchStart={(event) => event.stopPropagation()}
        onTouchMove={(event) => event.stopPropagation()}
        onTouchEnd={(event) => event.stopPropagation()}
      >
        {quickSlots.map((entryKey, index) => {
          const entry = findInventoryEntryByKey(inventory, entryKey);
          return (
            <button
              key={index}
              type="button"
              className={entry ? "quick-slot" : "quick-slot quick-slot--empty"}
              onPointerDown={(event) => handleQuickSlotPointerDown(event, index, entryKey)}
              onClick={(event) => handleQuickSlotClick(event, index, entryKey)}
              onContextMenu={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onClearQuickSlot(index);
              }}
              title={entry ? entry.label : `퀵슬롯 ${index + 1}`}
            >
              <em>{index + 1}</em>
              {entry?.iconSrc ? <img src={entry.iconSrc} alt="" /> : entry?.iconText ? <span className="quick-slot__emoji">{entry.iconText}</span> : <span />}
              {entry?.amount ? <b>{entry.amount}</b> : null}
            </button>
          );
        })}
      </div>
    </>
  );
}
