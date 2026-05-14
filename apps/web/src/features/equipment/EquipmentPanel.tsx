import { useMemo, useState } from "react";
import type { EquipmentSlot, EquipmentState, InventoryState, ItemInstanceId } from "@palpalworld/shared";
import { getIconAsset } from "../assets/assetCatalog";
import { getItemLabel } from "../items/itemLabels";
import {
  EQUIPMENT_SLOTS,
  createEmptyEquipment,
  equipItemInstance,
  findItemInstance,
  getEquipmentSlotForItemId,
  getEquippableInstances,
  getEquippedWeaponItemId,
  unequipSlot,
} from "./equipmentRules";

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

function persistEquipment(equipment: EquipmentState, inventory: InventoryState | null) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(equipmentStorageKey, JSON.stringify(equipment));
  const weaponItemId = getEquippedWeaponItemId(inventory, equipment);
  window.dispatchEvent(new CustomEvent("palpalworld:equipment-changed", { detail: { equipment, weaponItemId } }));
}

export function EquipmentPanel({
  inventory,
  equipment,
  onEquip,
  onUnequip,
}: {
  inventory: InventoryState | null;
  equipment?: EquipmentState | null;
  onEquip?: (itemInstanceId: ItemInstanceId) => void;
  onUnequip?: (slot: EquipmentSlot) => void;
}) {
  const ownerPlayerId = inventory?.ownerPlayerId ?? "demo-player";
  const [localEquipment, setLocalEquipment] = useState<EquipmentState>(() => readStoredEquipment(ownerPlayerId));
  const effectiveEquipment = equipment ?? localEquipment;
  const equippedInstanceIds = useMemo(
    () => new Set(Object.values(effectiveEquipment.slots ?? {}).filter(Boolean)),
    [effectiveEquipment],
  );
  const availableInstances = getEquippableInstances(inventory).filter((item) => !equippedInstanceIds.has(item.instanceId));

  const equipLocal = (itemInstanceId: ItemInstanceId) => {
    const item = findItemInstance(inventory, itemInstanceId);
    if (!item) return;
    if (onEquip) {
      onEquip(itemInstanceId);
      return;
    }
    setLocalEquipment((current) => {
      const next = equipItemInstance(current, item);
      persistEquipment(next, inventory);
      return next;
    });
  };

  const unequipLocal = (slot: EquipmentSlot) => {
    if (onUnequip) {
      onUnequip(slot);
      return;
    }
    setLocalEquipment((current) => {
      const next = unequipSlot(current, slot);
      persistEquipment(next, inventory);
      return next;
    });
  };

  return (
    <div className="feature-panel feature-panel--equipment equipment-panel-diablo">
      <div className="equipment-paperdoll">
        {EQUIPMENT_SLOTS.map((slot) => {
          const equippedId = effectiveEquipment.slots[slot.id];
          const equippedItem = findItemInstance(inventory, equippedId);
          const icon = equippedItem ? getIconAsset(equippedItem.itemId) : null;
          return (
            <button
              key={slot.id}
              className={equippedItem ? `equipment-slot equipment-slot--${slot.id} equipment-slot--filled` : `equipment-slot equipment-slot--${slot.id}`}
              onClick={equippedItem ? () => unequipLocal(slot.id) : undefined}
              disabled={!equippedItem}
              title={equippedItem ? `${slot.label}: ${getItemLabel(equippedItem.itemId)}` : slot.label}
            >
              <small>{slot.shortLabel}</small>
              {icon ? <img src={icon.src} alt="" /> : <span className="equipment-slot__empty">＋</span>}
              {equippedItem ? <b>Lv.{equippedItem.level}</b> : null}
            </button>
          );
        })}
        <div className="equipment-paperdoll__avatar">
          <span>🧍</span>
          <b>장비</b>
          <small>슬롯 클릭 시 해제</small>
        </div>
      </div>

      <div className="feature-panel__section-title">착용 가능 장비</div>
      <div className="equipment-inventory-list">
        {availableInstances.length > 0 ? (
          availableInstances.map((item) => {
            const icon = getIconAsset(item.itemId);
            const targetSlot = getEquipmentSlotForItemId(item.itemId);
            return (
              <button key={item.instanceId} className="equipment-inventory-item" onClick={() => equipLocal(item.instanceId)}>
                <span className="equipment-inventory-item__icon">
                  {icon ? <img src={icon.src} alt="" /> : <span>?</span>}
                </span>
                <span className="equipment-inventory-item__text">
                  <b>{getItemLabel(item.itemId)}</b>
                  <small>
                    {targetSlot ? EQUIPMENT_SLOTS.find((slot) => slot.id === targetSlot)?.label : "장비"} · Lv.{item.level}
                    {item.traitIds.length > 0 ? ` · ${item.traitIds.join(", ")}` : ""}
                  </small>
                </span>
                <em>착용</em>
              </button>
            );
          })
        ) : (
          <div className="feature-panel__empty">착용 가능한 장비가 없습니다.</div>
        )}
      </div>

      <div className="feature-panel__hint">장비를 누르면 알맞은 슬롯에 착용됩니다. 무기는 퀵슬롯에도 등록할 수 있습니다.</div>
    </div>
  );
}
