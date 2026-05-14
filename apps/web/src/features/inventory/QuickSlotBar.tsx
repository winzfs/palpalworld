import type { InventoryState } from "@palpalworld/shared";
import { findInventoryEntryByKey } from "./inventoryUiModel";

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
  return (
    <div className="quick-slot-bar" aria-label="퀵슬롯">
      {quickSlots.map((entryKey, index) => {
        const entry = findInventoryEntryByKey(inventory, entryKey);
        return (
          <button
            key={index}
            className={entry ? "quick-slot" : "quick-slot quick-slot--empty"}
            onClick={() => entry ? onUseQuickSlot(index) : undefined}
            onContextMenu={(event) => {
              event.preventDefault();
              onClearQuickSlot(index);
            }}
            title={entry ? entry.label : `퀵슬롯 ${index + 1}`}
          >
            <em>{index + 1}</em>
            {entry?.iconSrc ? <img src={entry.iconSrc} alt="" /> : <span />}
            {entry?.amount ? <b>{entry.amount}</b> : null}
          </button>
        );
      })}
    </div>
  );
}
