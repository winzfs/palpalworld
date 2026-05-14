import type { BuildingState } from "@palpalworld/shared";
import { getCraftingStationByBuildingType, getProgressionBuilding, type CraftingStationId } from "../crafting/progressionCatalog";

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
    case "storage_box":
    case "cold_storage":
      return {
        title: "보관함 열기",
        description: "아이템을 넣고 꺼내는 창고 UI로 연결할 예정입니다.",
        stationId: null,
      };
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

export function BuildingInteractionPanel({
  building,
  onClose,
  onOpenCrafting,
}: {
  building: BuildingState | null;
  onClose: () => void;
  onOpenCrafting?: (stationId: CraftingStationId) => void;
}) {
  if (!building) return null;

  const definition = getProgressionBuilding(building.type);
  const action = getBuildingAction(building.type);
  const hpPercent = Math.max(0, Math.min(100, Math.round((building.hp / building.maxHp) * 100)));
  const canOpenCrafting = Boolean(action.stationId);

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
    </div>
  );
}
