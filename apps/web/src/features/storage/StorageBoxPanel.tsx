import type { InventoryState, ItemStack } from "@palpalworld/shared";
import { getIconAsset } from "../assets/assetCatalog";
import { getItemLabel } from "../items/itemLabels";

const storageSlotCount = 10;
const bagSlotCount = 20;

function StorageItemSlot({
  item,
  onClick,
  emptyLabel,
}: {
  item: ItemStack | null;
  onClick?: (item: ItemStack) => void;
  emptyLabel: string;
}) {
  const icon = item ? getIconAsset(item.itemId) : null;
  return (
    <button
      className={item ? "storage-slot storage-slot--filled" : "storage-slot storage-slot--empty"}
      onClick={item && onClick ? () => onClick(item) : undefined}
      disabled={!item}
      title={item ? `${getItemLabel(item.itemId)} 전체 이동` : emptyLabel}
    >
      {item ? (
        <>
          {icon ? <img src={icon.src} alt="" /> : <span className="storage-slot__fallback">?</span>}
          <b>{item.amount}</b>
          <small>{getItemLabel(item.itemId)}</small>
        </>
      ) : (
        <span className="storage-slot__empty-mark">＋</span>
      )}
    </button>
  );
}

function makeFixedSlots(items: ItemStack[], slotCount: number) {
  return Array.from({ length: slotCount }, (_, index) => items[index] ?? null);
}

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
  const bagItems = inventory?.items ?? [];
  const bagSlots = makeFixedSlots(bagItems, Math.max(bagSlotCount, Math.ceil(bagItems.length / 5) * 5));
  const storageSlots = makeFixedSlots(storageItems, storageSlotCount);

  return (
    <div className="storage-box-panel storage-box-panel--inventory-like">
      <section className="storage-box-panel__section storage-box-panel__section--bag">
        <div className="storage-box-panel__section-header">
          <strong>내 가방</strong>
          <span>{bagItems.length}종</span>
        </div>
        <div className="storage-grid storage-grid--bag" aria-label="내 가방 아이템 칸">
          {bagSlots.map((item, index) => (
            <StorageItemSlot
              key={item?.itemId ?? `bag-empty-${index}`}
              item={item}
              emptyLabel={`가방 빈칸 ${index + 1}`}
              onClick={(clickedItem) => onDeposit(clickedItem.itemId, clickedItem.amount)}
            />
          ))}
        </div>
        <p className="storage-box-panel__hint">가방 아이템을 누르면 해당 아이템 전체 수량을 보관함으로 이동합니다.</p>
      </section>

      <section className="storage-box-panel__section storage-box-panel__section--storage">
        <div className="storage-box-panel__section-header">
          <strong>보관함</strong>
          <span>{storageItems.length}/{storageSlotCount}칸</span>
        </div>
        <div className="storage-grid storage-grid--storage" aria-label="보관함 10칸">
          {storageSlots.map((item, index) => (
            <StorageItemSlot
              key={item?.itemId ?? `storage-empty-${index}`}
              item={item}
              emptyLabel={`보관함 빈칸 ${index + 1}`}
              onClick={(clickedItem) => onWithdraw(clickedItem.itemId, clickedItem.amount)}
            />
          ))}
        </div>
        <p className="storage-box-panel__hint">보관함 아이템을 누르면 해당 아이템 전체 수량을 가방으로 꺼냅니다.</p>
      </section>
    </div>
  );
}
