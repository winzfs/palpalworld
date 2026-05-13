import type { InventoryState } from "@palpalworld/shared";
import { getIconAsset } from "../assets/assetCatalog";
import { getItemLabel } from "../items/itemLabels";
import { ItemSlot } from "../ui/ItemSlot";

export function InventoryPanel({ inventory }: { inventory: InventoryState | null }) {
  const stackItems = inventory?.items ?? [];
  const instances = inventory?.itemInstances ?? [];

  return (
    <div className="feature-panel feature-panel--inventory">
      <div className="feature-panel__section-title">스택 아이템</div>
      <div className="inventory-grid">
        {stackItems.length > 0 ? (
          stackItems.map((item) => {
            const icon = getIconAsset(item.itemId);
            return <ItemSlot key={item.itemId} label={getItemLabel(item.itemId)} amount={item.amount} iconSrc={icon?.src} />;
          })
        ) : (
          <div className="feature-panel__empty">아이템 없음</div>
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
