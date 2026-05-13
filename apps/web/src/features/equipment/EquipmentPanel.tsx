import type { InventoryState } from "@palpalworld/shared";
import { getItemLabel } from "../items/itemLabels";
import { ItemSlot } from "../ui/ItemSlot";

const equipmentSlots = [
  { id: "weapon", label: "무기" },
  { id: "head", label: "머리" },
  { id: "body", label: "몸" },
  { id: "hands", label: "손" },
  { id: "feet", label: "발" },
  { id: "accessory1", label: "장신구 1" },
  { id: "accessory2", label: "장신구 2" },
  { id: "mountGear", label: "탈것 장비" },
] as const;

export function EquipmentPanel({ inventory }: { inventory: InventoryState | null }) {
  const instances = inventory?.itemInstances ?? [];

  return (
    <div className="feature-panel feature-panel--equipment">
      <div className="feature-panel__section-title">장비 슬롯</div>
      <div className="equipment-grid">
        {equipmentSlots.map((slot) => (
          <ItemSlot key={slot.id} label={slot.label} detail="비어 있음" />
        ))}
      </div>

      <div className="feature-panel__section-title">착용 가능 장비</div>
      <div className="inventory-grid">
        {instances.length > 0 ? (
          instances.map((item) => <ItemSlot key={item.instanceId} label={getItemLabel(item.itemId)} detail={`Lv.${item.level}`} />)
        ) : (
          <div className="feature-panel__empty">착용 가능한 장비가 없습니다.</div>
        )}
      </div>
    </div>
  );
}
