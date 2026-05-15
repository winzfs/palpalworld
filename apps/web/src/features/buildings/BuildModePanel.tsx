import { useMemo } from "react";
import type { InventoryState } from "@palpalworld/shared";
import {
  BUILD_PARTS,
  type BuildFloorLevel,
  type BuildPartCategory,
  type BuildPartId,
  type BuildPartRotation,
  rotateBuildPart,
} from "./buildPartCatalog";
import { buildInventoryEntries } from "../inventory/inventoryUiModel";

const categoryOrder: BuildPartCategory[] = ["floor", "wall", "door", "window", "stairs", "roof", "decor", "utility", "furniture"];
const categoryLabels: Record<BuildPartCategory, string> = {
  floor: "기초/바닥",
  wall: "벽/난간",
  door: "문",
  window: "창문",
  stairs: "계단",
  roof: "지붕",
  furniture: "가구",
  utility: "설비",
  decor: "장식",
};

function getPartIcon(category: BuildPartCategory) {
  switch (category) {
    case "floor": return "▦";
    case "wall": return "▥";
    case "door": return "🚪";
    case "window": return "▣";
    case "stairs": return "↗";
    case "roof": return "▰";
    case "decor": return "✦";
    case "utility": return "⚙";
    case "furniture": return "▤";
    default: return "□";
  }
}

export function BuildModePanel({
  inventory,
  selectedPartId,
  selectedRotation,
  selectedFloorLevel,
  onSelectPart,
  onRotate,
  onSetFloorLevel,
  onClose,
}: {
  inventory: InventoryState | null;
  selectedPartId: BuildPartId | null;
  selectedRotation: BuildPartRotation;
  selectedFloorLevel: BuildFloorLevel;
  onSelectPart: (partId: BuildPartId) => void;
  onRotate: (rotation: BuildPartRotation) => void;
  onSetFloorLevel: (floorLevel: BuildFloorLevel) => void;
  onClose: () => void;
}) {
  const buildEntries = useMemo(() => buildInventoryEntries(inventory).filter((entry) => entry.buildPartId), [inventory]);
  const ownedAmountByPartId = useMemo(() => {
    const amounts = new Map<string, number>();
    for (const entry of buildEntries) amounts.set(entry.buildPartId!, entry.amount ?? 0);
    return amounts;
  }, [buildEntries]);
  const availableParts = useMemo(() => Object.values(BUILD_PARTS).filter((part) => (ownedAmountByPartId.get(part.id) ?? 0) > 0), [ownedAmountByPartId]);
  const selectedPart = selectedPartId ? BUILD_PARTS[selectedPartId] : null;

  return (
    <section className="build-mode-panel" aria-label="건설 모드">
      <header className="build-mode-panel__header">
        <div>
          <strong>건설 모드</strong>
          <span>부품 선택 → 맵에 드래그/클릭 설치</span>
        </div>
        <button onClick={onClose} aria-label="건설 모드 닫기">×</button>
      </header>

      <div className="build-mode-panel__toolbar">
        <div className="build-mode-panel__floor-tabs" aria-label="층 선택">
          {([0, 1, 2] as BuildFloorLevel[]).map((floorLevel) => (
            <button
              key={floorLevel}
              className={floorLevel === selectedFloorLevel ? "build-mode-panel__chip build-mode-panel__chip--active" : "build-mode-panel__chip"}
              onClick={() => onSetFloorLevel(floorLevel)}
            >
              {floorLevel + 1}층
            </button>
          ))}
        </div>
        <button className="build-mode-panel__rotate" onClick={() => onRotate(rotateBuildPart(selectedRotation))}>회전 {selectedRotation}°</button>
      </div>

      {selectedPart ? (
        <div className="build-mode-panel__selected">
          <b>{selectedPart.name}</b>
          <span>{selectedPart.description}</span>
          <small>{selectedPart.width}×{selectedPart.height}칸 · {selectedPart.layer} · 보유 {ownedAmountByPartId.get(selectedPart.id) ?? 0}</small>
        </div>
      ) : (
        <div className="build-mode-panel__selected build-mode-panel__selected--empty">
          <b>부품을 선택하세요</b>
          <span>모바일: 부품 선택 후 맵에서 드래그하면 반투명 미리보기가 따라갑니다.</span>
          <span>PC: 마우스 포인터를 따라 부품 미리보기가 움직입니다.</span>
        </div>
      )}

      <div className="build-mode-panel__groups">
        {categoryOrder.map((category) => {
          const parts = availableParts.filter((part) => part.category === category);
          if (parts.length <= 0) return null;
          return (
            <div className="build-mode-panel__group" key={category}>
              <h3>{categoryLabels[category]}</h3>
              <div className="build-mode-panel__grid">
                {parts.map((part) => {
                  const selected = selectedPartId === part.id;
                  return (
                    <button
                      key={part.id}
                      className={selected ? "build-mode-panel__part build-mode-panel__part--selected" : "build-mode-panel__part"}
                      onClick={() => onSelectPart(part.id)}
                      title={part.description}
                    >
                      <span className="build-mode-panel__part-icon">{getPartIcon(part.category)}</span>
                      <b>{part.name}</b>
                      <small>×{ownedAmountByPartId.get(part.id) ?? 0}</small>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
