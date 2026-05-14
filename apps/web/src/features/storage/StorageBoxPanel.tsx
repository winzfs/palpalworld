import type { InventoryState, ItemStack } from "@palpalworld/shared";
import { getIconAsset } from "../assets/assetCatalog";
import { getItemLabel } from "../items/itemLabels";

export function StorageBoxPanel({
  inventory,
  storageItems,
  onDeposit,
  onWithdraw,
}: {
  inventory: InventoryState | null;
  storageItems: ItemStack[];
  onDeposit: (itemId: string, amount: number) => void;
  onWithdraw: (itemId: string, amount: number) => void;
}) {
  return (
    <div className="storage-box-panel">
      <section className="storage-box-panel__section">
        <div className="feature-panel__section-title">내 가방</div>
        <div className="storage-grid">
          {(inventory?.items ?? []).length > 0 ? (
            inventory?.items.map((item) => {
              const icon = getIconAsset(item.itemId);
              const amount = Math.min(10, item.amount);
              return (
                <button key={item.itemId} className="storage-slot" onClick={() => onDeposit(item.itemId, amount)}>
                  {icon ? <img src={icon.src} alt="" /> : <span>?</span>}
                  <b>{item.amount}</b>
                  <small>{getItemLabel(item.itemId)}</small>
                </button>
              );
            })
          ) : (
            <div className="feature-panel__empty">가방에 넣을 아이템이 없습니다.</div>
          )}
        </div>
        <p className="storage-box-panel__hint">아이템을 누르면 최대 10개씩 보관합니다.</p>
      </section>

      <section className="storage-box-panel__section">
        <div className="feature-panel__section-title">보관함</div>
        <div className="storage-grid">
          {storageItems.length > 0 ? (
            storageItems.map((item) => {
              const icon = getIconAsset(item.itemId);
              const amount = Math.min(10, item.amount);
              return (
                <button key={item.itemId} className="storage-slot" onClick={() => onWithdraw(item.itemId, amount)}>
                  {icon ? <img src={icon.src} alt="" /> : <span>?</span>}
                  <b>{item.amount}</b>
                  <small>{getItemLabel(item.itemId)}</small>
                </button>
              );
            })
          ) : (
            <div className="feature-panel__empty">보관함이 비어 있습니다.</div>
          )}
        </div>
        <p className="storage-box-panel__hint">아이템을 누르면 최대 10개씩 꺼냅니다.</p>
      </section>
    </div>
  );
}
