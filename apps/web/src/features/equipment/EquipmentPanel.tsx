import type { EquipmentSlot, EquipmentState, InventoryState, ItemInstanceId } from "@palpalworld/shared";
import { getIconAsset } from "../assets/assetCatalog";
import { getItemLabel } from "../items/itemLabels";
import { ItemSlot } from "../ui/ItemSlot";

const equipmentSlots: { id: EquipmentSlot; label: string }[] = [
  { id: "weapon", label: "무기" },
  { id: "head", label: "머리" },
  { id: "body", label: "몸" },
  { id: "hands", label: "손" },
  { id: "feet", label: "발" },
  { id: "accessory1", label: "장신구 1" },
  { id: "accessory2", label: "장신구 2" },
  { id: "mountGear", label: "탈것 장비" },
];

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
  const instances = inventory?.itemInstances ?? [];
  const equippedInstanceIds = new Set(Object.values(equipment?.slots ?? {}).filter(Boolean));
  const availableInstances = instances.filter((item) => !equippedInstanceIds.has(item.instanceId));

  return (
    <div className="feature-panel feature-panel--equipment">
      <div className="feature-panel__section-title">장비 슬롯</div>
      <div className="equipment-grid">
        {equipmentSlots.map((slot) => {
          const equippedId = equipment?.slots[slot.id];
          const equippedItem = equippedId ? instances.find((item) => item.instanceId === equippedId) : null;
          const icon = equippedItem ? getIconAsset(equippedItem.itemId) : null;
          return (
            <ItemSlot
              key={slot.id}
              label={slot.label}
              detail={equippedItem ? `${getItemLabel(equippedItem.itemId)} Lv.${equippedItem.level}` : "비어 있음"}
              iconSrc={icon?.src}
              selected={Boolean(equippedItem)}
              onClick={equippedItem && onUnequip ? () => onUnequip(slot.id) : undefined}
            />
          );
        })}
      </div>

      <div className="feature-panel__section-title">착용 가능 장비</div>
      <div className="inventory-grid">
        {availableInstances.length > 0 ? (
          availableInstances.map((item) => {
            const icon = getIconAsset(item.itemId);
            return (
              <ItemSlot
                key={item.instanceId}
                label={getItemLabel(item.itemId)}
                detail={`Lv.${item.level}${item.traitIds.length > 0 ? ` · ${item.traitIds.join(", ")}` : ""}`}
                iconSrc={icon?.src}
                onClick={onEquip ? () => onEquip(item.instanceId) : undefined}
              />
            );
          })
        ) : (
          <div className="feature-panel__empty">착용 가능한 장비가 없습니다.</div>
        )}
      </div>

      <div className="feature-panel__hint">장비를 누르면 착용하고, 장착 슬롯을 누르면 해제합니다.</div>
    </div>
  );
}
