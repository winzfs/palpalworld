import type { InventoryState } from "@palpalworld/shared";
import { getIconAsset } from "../assets/assetCatalog";
import { getProgressionBuildingByItemId, isBuildingItemId } from "../crafting/progressionCatalog";
import { getItemLabel } from "../items/itemLabels";
import { ItemSlot } from "../ui/ItemSlot";

export function InventoryPanel({
  inventory,
  onPlaceBuildingItem,
}: {
  inventory: InventoryState | null;
  onPlaceBuildingItem?: (itemId: string) => void;
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
      <div className="inventory-grid">
        {buildingItems.length > 0 ? (
          buildingItems.map((item) => {
            const building = getProgressionBuildingByItemId(item.itemId);
            const icon = getIconAsset(item.itemId);
            return (
              <ItemSlot
                key={item.itemId}
                label={building ? `${building.name} 설치` : getItemLabel(item.itemId)}
                amount={item.amount}
                detail="눌러서 필드에 설치"
                iconSrc={icon?.src}
                onClick={onPlaceBuildingItem ? () => onPlaceBuildingItem(item.itemId) : undefined}
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
