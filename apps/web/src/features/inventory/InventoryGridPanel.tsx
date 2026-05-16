import type { InventoryState, ItemStack } from "@palpalworld/shared";
import { useEffect, useMemo, useState } from "react";
import { getBuildPart } from "../buildings/buildPartCatalog";
import { getProgressionBuildingByItemId, getProgressionRecipe } from "../crafting/progressionCatalog";
import { getItemLabel } from "../items/itemLabels";
import { getPetItemLabel } from "../pets/petInventory";
import { addInventoryStack, readStoredInventory, removeInventoryStack, writeStoredInventory } from "./inventoryStore";
import {
  buildInventoryEntries,
  findInventoryEntryByKey,
  inventoryCategoryLabels,
  type InventoryCategory,
  type InventoryEntry,
} from "./inventoryUiModel";

const categories: InventoryCategory[] = ["general", "usable", "material", "equipment", "building", "pet"];
const gridSlotCount = 36;
const mountedPetStorageKey = "palpalworld.demo.mountedPetItemId";

function readMountedPetItemId() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(mountedPetStorageKey);
}

function persistMountedPet(itemId: string | null) {
  if (typeof window === "undefined") return;
  if (itemId) window.localStorage.setItem(mountedPetStorageKey, itemId);
  else window.localStorage.removeItem(mountedPetStorageKey);
  window.dispatchEvent(new CustomEvent("palpalworld:mounted-pet-changed", { detail: { itemId } }));
}

function EntryIcon({ entry }: { entry: InventoryEntry }) {
  if (entry.iconSrc) return <img src={entry.iconSrc} alt="" />;
  if (entry.iconText) return <span className="inventory-grid-slot__emoji">{entry.iconText}</span>;
  return <span className="inventory-grid-slot__fallback">?</span>;
}

function compactRefunds(refunds: ItemStack[]) {
  const merged = new Map<string, number>();
  for (const refund of refunds) {
    if (refund.amount <= 0) continue;
    merged.set(refund.itemId, (merged.get(refund.itemId) ?? 0) + refund.amount);
  }
  return [...merged.entries()].map(([itemId, amount]) => ({ itemId, amount }));
}

function halfRefund(costs: ItemStack[], outputAmount = 1) {
  const divisor = Math.max(1, outputAmount);
  return compactRefunds(costs.map((cost) => ({
    itemId: cost.itemId,
    amount: Math.max(1, Math.floor((cost.amount / divisor) * 0.5)),
  })));
}

function getDismantleRefunds(entry: InventoryEntry): ItemStack[] {
  if (entry.category === "pet") return [];

  const buildPart = getBuildPart(entry.itemId);
  if (buildPart) return halfRefund(buildPart.cost);

  const building = getProgressionBuildingByItemId(entry.itemId);
  if (building) return halfRefund(building.requires);

  const recipe = getProgressionRecipe(entry.itemId);
  if (!recipe) return [];
  const output = recipe.outputs.find((nextOutput) => nextOutput.itemId === entry.itemId);
  return halfRefund(recipe.inputs, output?.amount ?? 1);
}

function getRefundSummary(refunds: ItemStack[]) {
  return refunds.map((refund) => `${getItemLabel(refund.itemId)} ${refund.amount}`).join(" · ");
}

export function InventoryGridPanel({
  inventory,
  quickSlots,
  selectedBuildingItemId,
  mountedPetItemId: mountedPetItemIdProp,
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
  const [internalMountedPetItemId, setInternalMountedPetItemId] = useState<string | null>(() => readMountedPetItemId());
  const mountedPetItemId = mountedPetItemIdProp ?? internalMountedPetItemId;
  const entries = useMemo(() => buildInventoryEntries(inventory), [inventory]);
  const filteredEntries = entries.filter((entry) => entry.category === category);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const selectedEntry = entries.find((entry) => entry.key === selectedKey) ?? filteredEntries[0] ?? null;
  const selectedRefunds = selectedEntry ? getDismantleRefunds(selectedEntry) : [];
  const visibleSlots = Array.from({ length: Math.max(gridSlotCount, Math.ceil(filteredEntries.length / 6) * 6 || gridSlotCount) }, (_, index) => filteredEntries[index] ?? null);

  useEffect(() => {
    const handleMountedPetChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{ itemId?: string | null }>;
      setInternalMountedPetItemId(customEvent.detail?.itemId ?? readMountedPetItemId());
    };
    window.addEventListener("palpalworld:mounted-pet-changed", handleMountedPetChanged);
    return () => window.removeEventListener("palpalworld:mounted-pet-changed", handleMountedPetChanged);
  }, []);

  const handleUseOrBuild = (entry: InventoryEntry) => {
    if (entry.category === "building" && onSelectBuildingItem) onSelectBuildingItem(entry.itemId);
  };

  const handleMountPet = (itemId: string) => {
    if (onMountPet) onMountPet(itemId);
    else persistMountedPet(itemId);
    setInternalMountedPetItemId(itemId);
  };

  const handleReleasePet = (itemId: string) => {
    if (mountedPetItemId === itemId) persistMountedPet(null);
    if (onReleasePet) {
      onReleasePet(itemId);
      return;
    }
    const base = readStoredInventory(inventory ?? undefined);
    writeStoredInventory(removeInventoryStack(base, itemId, 1));
    setSelectedKey(null);
  };

  const handleDismantle = (entry: InventoryEntry) => {
    const refunds = getDismantleRefunds(entry);
    if (refunds.length <= 0) return;

    const base = readStoredInventory(inventory ?? undefined);
    const withoutItem = entry.kind === "instance" && entry.instanceId
      ? { ...base, itemInstances: base.itemInstances.filter((item) => item.instanceId !== entry.instanceId) }
      : removeInventoryStack(base, entry.itemId, 1);
    const nextInventory = refunds.reduce((next, refund) => addInventoryStack(next, refund.itemId, refund.amount), withoutItem);

    writeStoredInventory(nextInventory);
    setSelectedKey(null);
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
                    <button onClick={() => handleMountPet(selectedEntry.itemId)}>{mountedPetItemId === selectedEntry.itemId ? `${getPetItemLabel(selectedEntry.itemId)} 타는 중` : "타기"}</button>
                    <button onClick={() => handleReleasePet(selectedEntry.itemId)}>방생</button>
                  </>
                ) : null}
                {selectedRefunds.length > 0 ? (
                  <button className="inventory-detail-card__dismantle" onClick={() => handleDismantle(selectedEntry)} title={`환급: ${getRefundSummary(selectedRefunds)}`}>분해</button>
                ) : null}
                {selectedRefunds.length > 0 ? <span className="inventory-detail-card__hint">분해 환급: {getRefundSummary(selectedRefunds)}</span> : null}
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
