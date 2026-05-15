import { useMemo, useRef, useState, type PointerEvent } from "react";
import type { InventoryState } from "@palpalworld/shared";
import {
  BUILD_PARTS,
  type BuildFloorLevel,
  type BuildPartCategory,
  type BuildPartId,
  type BuildPartRotation,
  type PlacedBuildPart,
  rotateBuildPart,
} from "./buildPartCatalog";
import { buildInventoryEntries } from "../inventory/inventoryUiModel";

const categoryOrder: BuildPartCategory[] = ["floor", "wall", "door", "window", "stairs", "roof", "decor", "utility", "furniture"];
const buildPanelPositionStorageKey = "palpalworld.ui.buildModePanelPosition";
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

type PanelPosition = { x: number; y: number };

type DragState = {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
};

function getDefaultPanelPosition(): PanelPosition {
  if (typeof window === "undefined") return { x: 72, y: 96 };
  if (window.innerWidth <= 720) return { x: 8, y: Math.max(76, window.innerHeight - 520) };
  return { x: 72, y: 96 };
}

function clampPanelPosition(position: PanelPosition): PanelPosition {
  if (typeof window === "undefined") return position;
  const maxX = Math.max(8, window.innerWidth - 96);
  const maxY = Math.max(8, window.innerHeight - 96);
  return {
    x: Math.max(8, Math.min(maxX, position.x)),
    y: Math.max(8, Math.min(maxY, position.y)),
  };
}

function readPanelPosition(): PanelPosition {
  if (typeof window === "undefined") return getDefaultPanelPosition();
  try {
    const raw = window.localStorage.getItem(buildPanelPositionStorageKey);
    if (!raw) return getDefaultPanelPosition();
    const parsed = JSON.parse(raw) as Partial<PanelPosition>;
    if (typeof parsed.x !== "number" || typeof parsed.y !== "number") return getDefaultPanelPosition();
    return clampPanelPosition({ x: parsed.x, y: parsed.y });
  } catch {
    return getDefaultPanelPosition();
  }
}

function writePanelPosition(position: PanelPosition) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(buildPanelPositionStorageKey, JSON.stringify(clampPanelPosition(position)));
}

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
  selectedPlacedPart,
  selectedHousePartCount = 0,
  demolitionMode = false,
  demolitionSelectionCount = 0,
  onSelectPart,
  onRotate,
  onSetFloorLevel,
  onRotateSelectedPlacedPart,
  onDeleteSelectedPlacedPart,
  onClearSelection,
  onFocusHouse,
  onToggleDemolitionMode,
  onDismantleDemolitionSelection,
  onClose,
}: {
  inventory: InventoryState | null;
  selectedPartId: BuildPartId | null;
  selectedRotation: BuildPartRotation;
  selectedFloorLevel: BuildFloorLevel;
  selectedPlacedPart?: PlacedBuildPart | null;
  selectedHousePartCount?: number;
  demolitionMode?: boolean;
  demolitionSelectionCount?: number;
  onSelectPart: (partId: BuildPartId) => void;
  onRotate: (rotation: BuildPartRotation) => void;
  onSetFloorLevel: (floorLevel: BuildFloorLevel) => void;
  onRotateSelectedPlacedPart?: () => void;
  onDeleteSelectedPlacedPart?: () => void;
  onClearSelection?: () => void;
  onFocusHouse?: () => void;
  onToggleDemolitionMode?: (enabled: boolean) => void;
  onDismantleDemolitionSelection?: () => void;
  onClose: () => void;
}) {
  const [panelPosition, setPanelPosition] = useState<PanelPosition>(() => readPanelPosition());
  const dragStateRef = useRef<DragState | null>(null);
  const buildEntries = useMemo(() => buildInventoryEntries(inventory).filter((entry) => entry.buildPartId), [inventory]);
  const ownedAmountByPartId = useMemo(() => {
    const amounts = new Map<string, number>();
    for (const entry of buildEntries) amounts.set(entry.buildPartId!, entry.amount ?? 0);
    return amounts;
  }, [buildEntries]);
  const availableParts = useMemo(() => Object.values(BUILD_PARTS).filter((part) => (ownedAmountByPartId.get(part.id) ?? 0) > 0), [ownedAmountByPartId]);
  const selectedPart = selectedPartId ? BUILD_PARTS[selectedPartId] : null;
  const selectedPlacedDefinition = selectedPlacedPart ? BUILD_PARTS[selectedPlacedPart.partId] : null;

  const handlePanelDragStart = (event: PointerEvent<HTMLElement>) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest("button,input,select,textarea")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: panelPosition.x,
      startY: panelPosition.y,
    };
  };

  const handlePanelDragMove = (event: PointerEvent<HTMLElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    const nextPosition = clampPanelPosition({
      x: dragState.startX + event.clientX - dragState.startClientX,
      y: dragState.startY + event.clientY - dragState.startClientY,
    });
    setPanelPosition(nextPosition);
  };

  const handlePanelDragEnd = (event: PointerEvent<HTMLElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    dragStateRef.current = null;
    writePanelPosition(panelPosition);
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const resetPanelPosition = () => {
    const nextPosition = getDefaultPanelPosition();
    setPanelPosition(nextPosition);
    writePanelPosition(nextPosition);
  };

  return (
    <section
      className={demolitionMode ? "build-mode-panel build-mode-panel--demolition" : "build-mode-panel"}
      aria-label="건설 모드"
      style={{ left: panelPosition.x, top: panelPosition.y }}
    >
      <header
        className="build-mode-panel__header build-mode-panel__header--draggable"
        onPointerDown={handlePanelDragStart}
        onPointerMove={handlePanelDragMove}
        onPointerUp={handlePanelDragEnd}
        onPointerCancel={handlePanelDragEnd}
      >
        <div>
          <strong>{demolitionMode ? "철거 모드" : "건설 모드"}</strong>
          <span>{demolitionMode ? "맵을 드래그해서 여러 부품 선택 → 일괄 분해" : "헤더 드래그로 패널 이동 · 부품 선택 → 맵에 드래그/클릭 설치"}</span>
        </div>
        <button
          className={demolitionMode ? "build-mode-panel__header-action build-mode-panel__header-action--active" : "build-mode-panel__header-action"}
          onClick={() => onToggleDemolitionMode?.(!demolitionMode)}
          aria-pressed={demolitionMode}
          title="철거 모드"
        >철거</button>
        <button onClick={resetPanelPosition} aria-label="건설 패널 위치 초기화">↺</button>
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
        <button className="build-mode-panel__rotate" onClick={() => onRotate(rotateBuildPart(selectedRotation))}>새 부품 회전 {selectedRotation}°</button>
      </div>

      {demolitionMode ? (
        <div className="build-mode-panel__demolition-card">
          <div>
            <b>철거 선택</b>
            <span>{demolitionSelectionCount > 0 ? `${demolitionSelectionCount}개 선택됨` : "드래그하거나 부품을 클릭해서 선택"}</span>
          </div>
          <button className="build-mode-panel__danger" disabled={demolitionSelectionCount <= 0} onClick={onDismantleDemolitionSelection}>선택 {demolitionSelectionCount}개 분해</button>
        </div>
      ) : null}

      {selectedPlacedPart && selectedPlacedDefinition ? (
        <div className="build-mode-panel__edit-card">
          <div className="build-mode-panel__edit-title">
            <b>선택 부품 편집</b>
            <span>{selectedPlacedDefinition.name}</span>
          </div>
          <div className="build-mode-panel__edit-meta">
            <span>집 부품</span><b>{selectedHousePartCount}개</b>
            <span>위치</span><b>{selectedPlacedPart.gridX}, {selectedPlacedPart.gridY}</b>
            <span>층</span><b>{selectedPlacedPart.floorLevel + 1}층</b>
            <span>회전</span><b>{selectedPlacedPart.rotation}°</b>
          </div>
          <div className="build-mode-panel__edit-actions">
            <button onClick={onRotateSelectedPlacedPart}>회전</button>
            <button onClick={onFocusHouse}>집 선택</button>
            <button onClick={onClearSelection}>선택 해제</button>
            <button className="build-mode-panel__danger" onClick={onDeleteSelectedPlacedPart}>분해</button>
          </div>
          <p>선택한 부품을 맵에서 드래그하면 다시 옮길 수 있습니다.</p>
        </div>
      ) : null}

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
