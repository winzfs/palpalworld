import type { InventoryState } from "@palpalworld/shared";
import { useMemo, useState } from "react";
import {
  buildInventoryEntries,
  findInventoryEntryByKey,
  inventoryCategoryLabels,
  type InventoryCategory,
  type InventoryEntry,
} from "./inventoryUiModel";

const categories: InventoryCategory[] = ["general", "usable", "material", "equipment", "building", "pet"];
const gridSlotCount = 36;

function EntryIcon({ entry }: { entry: InventoryEntry }) {
  if (entry.iconSrc) return <img src={entry.iconSrc} alt="" />;
  if (entry.iconText) return <span className="inventory-grid-slot__emoji">{entry.iconText}</span>;
  return <span className="inventory-grid-slot__fallback">?</span>;
}

export function InventoryGridPanel({
  inventory,
  quickSlots,
  selectedBuildingItemId,
  mountedPetItemId,
  onSelectBuildingItem,
  onAssignQuickSlot,
  onMountPet,
  onReleasePet,
}: {
  inventory: InventoryState | null;
  quickSlots: (string | null)[];
  selectedBuildingItemId?: string | null;
  mountedPetItemId?: string | null;
  onSelectBuildingItem?: (itemId: string) => void;
  onAssignQuickSlot: (slotIndex: number, entryKey: string | null) => void;
  onMountPet?: (itemId: string) => void;
  onReleasePet?: (itemId: string) => void;
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

  const getQuickSlotIndex = (entryKey: string) => quickSlots.findIndex((slotKey) => slotKey === entryKey);

  return (
    <div className="inventory-grid-panel">
      <div className="inventory-grid-panel__tabs inventory-grid-panel__tabs--six">
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
            const mountedSelected = Boolean(entry && mountedPetItemId === entry.itemId);
            const quickSlotIndex = entry ? getQuickSlotIndex(entry.key) : -1;
            return (
              <button
                key={entry?.key ?? `empty-${index}`}
                className={selected || buildingSelected || mountedSelected ? "inventory-grid-slot inventory-grid-slot--selected" : "inventory-grid-slot"}
                onClick={() => entry ? setSelectedKey(entry.key) : undefined}
                disabled={!entry}
              >
                {entry ? (
                  <>
                    <EntryIcon entry={entry} />
                    {entry.amount ? <b>{entry.amount}</b> : null}
                    {entry.detail ? <small>{entry.detail}</small> : null}
                    {mountedSelected ? <i className="inventory-grid-slot__quick-badge">탑승</i> : quickSlotIndex >= 0 ? <i className="inventory-grid-slot__quick-badge">Q{quickSlotIndex + 1}</i> : null}
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
                {selectedEntry.iconSrc ? <img src={selectedEntry.iconSrc} alt="" /> : selectedEntry.iconText ? <span>{selectedEntry.iconText}</span> : <span>?</span>}
              </div>
              <strong>{selectedEntry.label}</strong>
              <small>{inventoryCategoryLabels[selectedEntry.category]} {selectedEntry.amount ? `· ${selectedEntry.amount}개` : selectedEntry.detail ? `· ${selectedEntry.detail}` : ""}</small>
              <p>{selectedEntry.description}</p>
              <div className="inventory-detail-card__actions">
                {selectedEntry.category === "building" ? (
                  <button onClick={() => handleUseOrBuild(selectedEntry)}>{selectedBuildingItemId === selectedEntry.itemId ? "배치 취소/전환" : "배치하기"}</button>
                ) : null}
                {selectedEntry.category === "pet" ? (
                  <>
                    <button onClick={() => onMountPet?.(selectedEntry.itemId)}>{mountedPetItemId === selectedEntry.itemId ? "타는 중" : "타기"}</button>
                    <button onClick={() => onReleasePet?.(selectedEntry.itemId)}>방생</button>
                  </>
                ) : null}
                {selectedEntry.quickSlotEligible ? (
                  <div className="inventory-quick-assign inventory-quick-assign--icons">
                    <span>퀵슬롯 등록</span>
                    <div>
                      {quickSlots.map((slotKey, index) => {
                        const assignedEntry = findInventoryEntryByKey(inventory, slotKey);
                        const isCurrent = slotKey === selectedEntry.key;
                        return (
                          <button
                            key={index}
                            className={isCurrent ? "inventory-quick-assign__slot inventory-quick-assign__slot--active" : "inventory-quick-assign__slot"}
                            onClick={() => onAssignQuickSlot(index, isCurrent ? null : selectedEntry.key)}
                            title={isCurrent ? `${index + 1}번 퀵슬롯 해제` : `${index + 1}번 퀵슬롯에 등록`}
                          >
                            <em>{index + 1}</em>
                            {isCurrent && selectedEntry.iconSrc ? (
                              <img src={selectedEntry.iconSrc} alt="" />
                            ) : isCurrent && selectedEntry.iconText ? (
                              <span>{selectedEntry.iconText}</span>
                            ) : assignedEntry?.iconSrc ? (
                              <img src={assignedEntry.iconSrc} alt="" />
                            ) : assignedEntry?.iconText ? (
                              <span>{assignedEntry.iconText}</span>
                            ) : (
                              <span>{isCurrent ? "✓" : "+"}</span>
                            )}
                          </button>
                        );
                      })}
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
