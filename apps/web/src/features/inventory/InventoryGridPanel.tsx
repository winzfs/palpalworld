import type { InventoryState } from "@palpalworld/shared";
import { useMemo, useState } from "react";
import {
  buildInventoryEntries,
  inventoryCategoryLabels,
  type InventoryCategory,
  type InventoryEntry,
} from "./inventoryUiModel";

const categories: InventoryCategory[] = ["general", "usable", "material", "equipment", "building"];
const gridSlotCount = 36;

export function InventoryGridPanel({
  inventory,
  quickSlots,
  selectedBuildingItemId,
  onSelectBuildingItem,
  onAssignQuickSlot,
}: {
  inventory: InventoryState | null;
  quickSlots: (string | null)[];
  selectedBuildingItemId?: string | null;
  onSelectBuildingItem?: (itemId: string) => void;
  onAssignQuickSlot: (slotIndex: number, entryKey: string | null) => void;
}) {
  const [category, setCategory] = useState<InventoryCategory>("general");
  const entries = useMemo(() => buildInventoryEntries(inventory), [inventory]);
  const filteredEntries = entries.filter((entry) => entry.category === category);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const selectedEntry = entries.find((entry) => entry.key === selectedKey) ?? filteredEntries[0] ?? null;
  const visibleSlots = Array.from({ length: Math.max(gridSlotCount, Math.ceil(filteredEntries.length / 6) * 6 || gridSlotCount) }, (_, index) => filteredEntries[index] ?? null);

  const handleUseOrBuild = (entry: InventoryEntry) => {
    if (entry.category === "building" && onSelectBuildingItem) {
      onSelectBuildingItem(entry.itemId);
    }
  };

  return (
    <div className="inventory-grid-panel">
      <div className="inventory-grid-panel__tabs">
        {categories.map((nextCategory) => (
          <button
            key={nextCategory}
            className={category === nextCategory ? "inventory-grid-panel__tab inventory-grid-panel__tab--active" : "inventory-grid-panel__tab"}
            onClick={() => {
              setCategory(nextCategory);
              setSelectedKey(null);
            }}
          >
            {inventoryCategoryLabels[nextCategory]}
          </button>
        ))}
      </div>

      <div className="inventory-grid-panel__content">
        <div className="inventory-grid-panel__slots" aria-label="인벤토리 칸">
          {visibleSlots.map((entry, index) => {
            const selected = Boolean(entry && selectedEntry?.key === entry.key);
            const buildingSelected = Boolean(entry && selectedBuildingItemId === entry.itemId);
            return (
              <button
                key={entry?.key ?? `empty-${index}`}
                className={selected || buildingSelected ? "inventory-grid-slot inventory-grid-slot--selected" : "inventory-grid-slot"}
                onClick={() => entry ? setSelectedKey(entry.key) : undefined}
                disabled={!entry}
              >
                {entry ? (
                  <>
                    {entry.iconSrc ? <img src={entry.iconSrc} alt="" /> : <span className="inventory-grid-slot__fallback">?</span>}
                    {entry.amount ? <b>{entry.amount}</b> : null}
                    {entry.detail ? <small>{entry.detail}</small> : null}
                  </>
                ) : null}
              </button>
            );
          })}
        </div>

        <aside className="inventory-detail-card">
          {selectedEntry ? (
            <>
              <div className="inventory-detail-card__icon">
                {selectedEntry.iconSrc ? <img src={selectedEntry.iconSrc} alt="" /> : <span>?</span>}
              </div>
              <strong>{selectedEntry.label}</strong>
              <small>{inventoryCategoryLabels[selectedEntry.category]} {selectedEntry.amount ? `· ${selectedEntry.amount}개` : selectedEntry.detail ? `· ${selectedEntry.detail}` : ""}</small>
              <p>{selectedEntry.description}</p>
              <div className="inventory-detail-card__actions">
                {selectedEntry.category === "building" ? (
                  <button onClick={() => handleUseOrBuild(selectedEntry)}>{selectedBuildingItemId === selectedEntry.itemId ? "배치 취소/전환" : "배치하기"}</button>
                ) : null}
                {selectedEntry.quickSlotEligible ? (
                  <div className="inventory-quick-assign">
                    <span>퀵슬롯 등록</span>
                    <div>
                      {quickSlots.map((slotKey, index) => (
                        <button
                          key={index}
                          className={slotKey === selectedEntry.key ? "inventory-quick-assign__slot inventory-quick-assign__slot--active" : "inventory-quick-assign__slot"}
                          onClick={() => onAssignQuickSlot(index, slotKey === selectedEntry.key ? null : selectedEntry.key)}
                        >
                          {index + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <span className="inventory-detail-card__hint">퀵슬롯에 등록할 수 없는 아이템입니다.</span>
                )}
              </div>
            </>
          ) : (
            <div className="inventory-detail-card__empty">아이템을 선택하면 설명이 표시됩니다.</div>
          )}
        </aside>
      </div>
    </div>
  );
}
