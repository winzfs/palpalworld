import type { EquipmentSlot, EquipmentState, InventoryState, ItemInstanceId } from "@palpalworld/shared";
import { getIconAsset } from "../assets/assetCatalog";
import { getItemLabel } from "../items/itemLabels";
import { EQUIPMENT_SLOTS, findItemInstance, getEquipmentSlotForItemId, getEquippableInstances } from "./equipmentRules";

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
  const equippedInstanceIds = new Set(Object.values(equipment?.slots ?? {}).filter(Boolean));
  const availableInstances = getEquippableInstances(inventory).filter((item) => !equippedInstanceIds.has(item.instanceId));

  return (
    <div className="feature-panel feature-panel--equipment equipment-panel-diablo">
      <div className="equipment-paperdoll">
        {EQUIPMENT_SLOTS.map((slot) => {
          const equippedId = equipment?.slots[slot.id];
          const equippedItem = findItemInstance(inventory, equippedId);
          const icon = equippedItem ? getIconAsset(equippedItem.itemId) : null;
          return (
            <button
              key={slot.id}
              className={equippedItem ? `equipment-slot equipment-slot--${slot.id} equipment-slot--filled` : `equipment-slot equipment-slot--${slot.id}`}
              onClick={equippedItem && onUnequip ? () => onUnequip(slot.id) : undefined}
              disabled={!equippedItem || !onUnequip}
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
              <button
                key={item.instanceId}
                className="equipment-inventory-item"
                onClick={onEquip ? () => onEquip(item.instanceId) : undefined}
                disabled={!onEquip}
              >
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
