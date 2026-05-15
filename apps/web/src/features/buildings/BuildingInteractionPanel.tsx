import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { BuildingState, InventoryState, ItemStack } from "@palpalworld/shared";
import { getCraftingStationByBuildingType, getProgressionBuilding, type CraftingStationId } from "../crafting/progressionCatalog";
import { addInventoryStack, createFallbackInventory, getInventoryAmount, readStoredInventory, removeInventoryStack, writeStoredInventory } from "../inventory/inventoryStore";
import { getItemLabel } from "../items/itemLabels";
import { StorageBoxPanel } from "../storage/StorageBoxPanel";
import { addStorageStack, readStorageBoxItems, removeStorageStack, writeStorageBoxItems } from "../storage/storageStore";

function getBuildingAction(buildingType: string) {
  const station = getCraftingStationByBuildingType(buildingType);
  if (station) {
    return {
      title: `${station.name} 열기`,
      description: station.description,
      stationId: station.id,
    };
  }

  switch (buildingType) {
    case "base_core":
      return {
        title: "거점 관리",
        description: "거점 이름, 작업 배치, 몬스터 관리 UI로 연결할 예정입니다.",
        stationId: null,
      };
    case "farm_plot":
      return {
        title: "밭 관리",
        description: "씨앗 심기, 수확, 작업 펄 배치 UI로 연결할 예정입니다.",
        stationId: null,
      };
    default:
      return {
        title: "건설물 정보",
        description: "아직 전용 상호작용이 없는 건설물입니다.",
        stationId: null,
      };
  }
}

function isStorageBuilding(buildingType: string) {
  return buildingType === "storage_box" || buildingType === "cold_storage";
}

function cloneInventoryForView(inventory: InventoryState): InventoryState {
  return {
    ownerPlayerId: inventory.ownerPlayerId,
    items: inventory.items.map((item) => ({ itemId: item.itemId, amount: item.amount })).filter((item) => item.amount > 0),
    itemInstances: inventory.itemInstances.map((item) => ({ ...item, traitIds: [...item.traitIds] })),
  };
}

function getDismantleRefunds(buildingType: string): ItemStack[] {
  const definition = getProgressionBuilding(buildingType);
  if (!definition) return [];
  return definition.requires
    .map((item) => ({ itemId: item.itemId, amount: Math.max(1, Math.floor(item.amount / 2)) }))
    .filter((item) => item.amount > 0);
}

function DismantleAction({ building, onDismantle }: { building: BuildingState; onDismantle: (building: BuildingState, refunds: ItemStack[]) => void }) {
  const [confirming, setConfirming] = useState(false);
  const refunds = useMemo(() => getDismantleRefunds(building.type), [building.type]);
  const refundText = refunds.length > 0 ? refunds.map((item) => `${getItemLabel(item.itemId)} ${item.amount}`).join(" · ") : "회수 재료 없음";

  return (
    <div className="building-interaction__dismantle">
      <p className="feature-panel__hint">분해 시 제작 재료의 절반을 회수합니다: {refundText}</p>
      {confirming ? (
        <div className="building-interaction__dismantle-confirm">
          <button className="building-interaction__action building-interaction__action--danger" onClick={() => onDismantle(building, refunds)}>분해 확정</button>
          <button className="draggable-panel__toggle" onClick={() => setConfirming(false)}>취소</button>
        </div>
      ) : (
        <button className="building-interaction__action building-interaction__action--danger" onClick={() => setConfirming(true)}>건설물 분해</button>
      )}
    </div>
  );
}

export function BuildingInteractionPanel({
  building,
  inventory,
  onInventoryChange,
  onClose,
  onOpenCrafting,
  onDismantle,
}: {
  building: BuildingState | null;
  inventory?: InventoryState | null;
  onInventoryChange?: (inventory: InventoryState) => void;
  onClose: () => void;
  onOpenCrafting?: (stationId: CraftingStationId) => void;
  onDismantle?: (building: BuildingState, refunds: ItemStack[]) => void;
}) {
  const [activeInventory, setActiveInventory] = useState<InventoryState>(() => readStoredInventory(inventory ?? createFallbackInventory()));
  const [storageItems, setStorageItems] = useState<ItemStack[]>(() => readStorageBoxItems(building));
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalHost(document.body);
  }, []);

  useEffect(() => {
    if (inventory) setActiveInventory(cloneInventoryForView(inventory));
  }, [inventory]);

  useEffect(() => {
    const handleInventoryChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{ inventory?: InventoryState }>;
      if (customEvent.detail?.inventory) setActiveInventory(customEvent.detail.inventory);
      else if (!inventory) setActiveInventory(readStoredInventory(createFallbackInventory()));
    };
    window.addEventListener("palpalworld:inventory-changed", handleInventoryChanged);
    return () => window.removeEventListener("palpalworld:inventory-changed", handleInventoryChanged);
  }, [inventory]);

  useEffect(() => {
    setStorageItems(readStorageBoxItems(building));
  }, [building?.id, building?.type]);

  if (!building) return null;

  const definition = getProgressionBuilding(building.type);
  const action = getBuildingAction(building.type);
  const hpPercent = Math.max(0, Math.min(100, Math.round((building.hp / building.maxHp) * 100)));
  const canOpenCrafting = Boolean(action.stationId);

  const updateInventory = (nextInventory: InventoryState) => {
    const storedInventory = writeStoredInventory(nextInventory);
    setActiveInventory(storedInventory);
    onInventoryChange?.(storedInventory);
  };

  const handleFallbackDismantle = (targetBuilding: BuildingState, refunds: ItemStack[]) => {
    const refundedInventory = refunds.reduce((next, refund) => addInventoryStack(next, refund.itemId, refund.amount), activeInventory);
    updateInventory(refundedInventory);
    window.dispatchEvent(new CustomEvent("palpalworld:building-dismantled", { detail: { buildingId: targetBuilding.id, building: targetBuilding } }));
    onDismantle?.(targetBuilding, refunds);
    onClose();
  };

  const handleDeposit = (itemId: string, amount: number) => {
    const owned = getInventoryAmount(activeInventory, itemId);
    const nextAmount = Math.min(amount, owned);
    if (nextAmount <= 0) return;
    updateInventory(removeInventoryStack(activeInventory, itemId, nextAmount));
    setStorageItems((current) => {
      const next = addStorageStack(current, itemId, nextAmount);
      writeStorageBoxItems(building, next);
      return next;
    });
  };

  const handleWithdraw = (itemId: string, amount: number) => {
    const stored = storageItems.find((item) => item.itemId === itemId)?.amount ?? 0;
    const nextAmount = Math.min(amount, stored);
    if (nextAmount <= 0) return;
    setStorageItems((current) => {
      const next = removeStorageStack(current, itemId, nextAmount);
      writeStorageBoxItems(building, next);
      return next;
    });
    updateInventory(addInventoryStack(activeInventory, itemId, nextAmount));
  };

  if (isStorageBuilding(building.type)) {
    const storageWindow = (
      <div className="storage-overlay-panel" aria-label="보관함">
        <button className="storage-overlay-panel__close" onClick={onClose} aria-label="보관함 닫기">×</button>
        <StorageBoxPanel
          inventory={activeInventory}
          storageItems={storageItems}
          onDeposit={handleDeposit}
          onWithdraw={handleWithdraw}
        />
        <DismantleAction building={building} onDismantle={handleFallbackDismantle} />
      </div>
    );

    return (
      <>
        <span className="storage-menu-empty-marker" aria-hidden="true" />
        {portalHost ? createPortal(storageWindow, portalHost) : null}
      </>
    );
  }

  return (
    <div className="feature-panel feature-panel--building-interaction">
      <div className="feature-panel__section-title">건설물 상호작용</div>
      <div className="building-interaction__header">
        <strong>{definition?.name ?? building.type}</strong>
        <button className="draggable-panel__toggle" onClick={onClose}>닫기</button>
      </div>
      <p className="feature-panel__hint">{definition?.description ?? "설치된 건설물입니다."}</p>
      <div className="building-interaction__stats">
        <span>내구도</span>
        <b>{building.hp} / {building.maxHp} ({hpPercent}%)</b>
      </div>

      <button
        className="building-interaction__action"
        onClick={action.stationId ? () => onOpenCrafting?.(action.stationId) : undefined}
        disabled={!canOpenCrafting}
      >
        {action.title}
      </button>
      <p className="feature-panel__hint">{action.description}</p>
      <DismantleAction building={building} onDismantle={handleFallbackDismantle} />
    </div>
  );
}
