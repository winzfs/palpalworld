import { useMemo, useState } from "react";
import type { BuildingState, ItemStack } from "@palpalworld/shared";
import { getItemLabel } from "../items/itemLabels";
import { canDismantleBuilding, getDismantleRefunds } from "./buildingPanelRules";

export function DismantleHeaderAction({
  building,
  onDismantle,
}: {
  building: BuildingState;
  onDismantle?: (building: BuildingState, refunds: ItemStack[]) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const refunds = useMemo(() => getDismantleRefunds(String(building.type)), [building.type]);
  const refundText = refunds.length > 0
    ? refunds.map((item) => `${getItemLabel(item.itemId)} ${item.amount}`).join(" · ")
    : "회수 재료 없음";

  if (!onDismantle || !canDismantleBuilding(building)) return null;

  if (confirming) {
    return (
      <span className="building-interaction__header-confirm" title={`회수: ${refundText}`}>
        <button className="building-interaction__header-danger" onClick={() => onDismantle(building, refunds)}>분해 확정</button>
        <button className="draggable-panel__toggle" onClick={() => setConfirming(false)}>취소</button>
      </span>
    );
  }

  return (
    <button className="building-interaction__header-danger" title={`분해 시 회수: ${refundText}`} onClick={() => setConfirming(true)}>
      분해
    </button>
  );
}

export function BuildingPanelHeader({
  title,
  building,
  onDismantle,
  onClose,
  closeLabel = "닫기",
  className = "building-interaction__header",
}: {
  title: string;
  building: BuildingState;
  onDismantle?: (building: BuildingState, refunds: ItemStack[]) => void;
  onClose: () => void;
  closeLabel?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <strong>{title}</strong>
      <span className="building-interaction__header-actions">
        <DismantleHeaderAction building={building} onDismantle={onDismantle} />
        <button className="draggable-panel__toggle building-panel-header__close" onClick={onClose} aria-label={closeLabel}>×</button>
      </span>
    </div>
  );
}
