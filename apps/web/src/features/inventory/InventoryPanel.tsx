import type { InventoryState } from "@palpalworld/shared";
import { getIconAsset } from "../assets/assetCatalog";
import { getProgressionBuildingByItemId, isBuildingItemId } from "../crafting/progressionCatalog";
import { getItemLabel } from "../items/itemLabels";
import { ItemSlot } from "../ui/ItemSlot";

function getBuildingInventoryLabel(itemId: string) {
  const label = getItemLabel(itemId);
  if (label !== itemId) return label;

  const building = getProgressionBuildingByItemId(itemId);
  return building ? `${building.name} 설치 아이템` : itemId;
}

export function InventoryPanel({
  inventory,
  selectedBuildingItemId,
  onSelectBuildingItem,
}: {
  inventory: InventoryState | null;
  selectedBuildingItemId?: string | null;
  onSelectBuildingItem?: (itemId: string) => void;
}) {
  const stackItems = inventory?.items ?? [];
  const buildingItems = stackItems.filter((item) => isBuildingItemId(item.itemId));
  const normalStackItems = stackItems.filter((item) => !isBuildingItemId(item.itemId));
  const instances = inventory?.itemInstances ?? [];

  return (
    <div className="feature-panel feature-panel--inventory">
      <div className="feature-panel__section-title">일반 아이템</div>
      <div className="inventory-grid">
        {normalStackItems.length > 0 ? (
          normalStackItems.map((item) => {
            const icon = getIconAsset(item.itemId);
            return <ItemSlot key={item.itemId} label={getItemLabel(item.itemId)} amount={item.amount} iconSrc={icon?.src} />;
          })
        ) : (
          <div className="feature-panel__empty">아이템 없음</div>
        )}
      </div>

      <div className="feature-panel__section-title">건설</div>
      <div className="feature-panel__hint">건설 아이템을 선택한 뒤, 원하는 필드 위치를 클릭하면 설치됩니다.</div>
      <div className="inventory-grid">
        {buildingItems.length > 0 ? (
          buildingItems.map((item) => {
            const icon = getIconAsset(item.itemId);
            const selected = selectedBuildingItemId === item.itemId;
            return (
              <ItemSlot
                key={item.itemId}
                label={getBuildingInventoryLabel(item.itemId)}
                amount={item.amount}
                detail={selected ? "선택됨 · 필드 클릭" : "선택 후 필드 클릭"}
                iconSrc={icon?.src}
                selected={selected}
                onClick={onSelectBuildingItem ? () => onSelectBuildingItem(item.itemId) : undefined}
              />
            );
          })
        ) : (
          <div className="feature-panel__empty">건설 아이템 없음</div>
        )}
      </div>

      <div className="feature-panel__section-title">장비 인스턴스</div>
      <div className="inventory-grid">
        {instances.length > 0 ? (
          instances.map((item) => {
            const icon = getIconAsset(item.itemId);
            return <ItemSlot key={item.instanceId} label={getItemLabel(item.itemId)} detail={`Lv.${item.level}`} iconSrc={icon?.src} />;
          })
        ) : (
          <div className="feature-panel__empty">장비 없음</div>
        )}
      </div>
    </div>
  );
}
