import type { BuildingState } from "@palpalworld/shared";
import { getProgressionBuilding } from "../crafting/progressionCatalog";

function getBuildingAction(buildingType: string) {
  switch (buildingType) {
    case "workbench":
    case "advanced_workbench":
      return {
        title: "제작대 열기",
        description: "이 건물 근처에서 도구, 장비, 포획구 제작 기능을 확장할 수 있습니다.",
      };
    case "storage_box":
    case "cold_storage":
      return {
        title: "보관함 열기",
        description: "아이템을 넣고 꺼내는 창고 UI로 연결할 예정입니다.",
      };
    case "campfire":
    case "kitchen":
      return {
        title: "요리하기",
        description: "음식과 회복 아이템 제작 UI로 연결할 예정입니다.",
      };
    case "furnace":
      return {
        title: "제련하기",
        description: "광석을 주괴로 바꾸는 제련 UI로 연결할 예정입니다.",
      };
    case "base_core":
      return {
        title: "거점 관리",
        description: "거점 이름, 작업 배치, 몬스터 관리 UI로 연결할 예정입니다.",
      };
    default:
      return {
        title: "건설물 정보",
        description: "아직 전용 상호작용이 없는 건설물입니다.",
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
  onOpenCrafting?: () => void;
}) {
  if (!building) return null;

  const definition = getProgressionBuilding(building.type);
  const action = getBuildingAction(building.type);
  const hpPercent = Math.max(0, Math.min(100, Math.round((building.hp / building.maxHp) * 100)));
  const canOpenCrafting = building.type === "workbench" || building.type === "advanced_workbench" || building.type === "campfire" || building.type === "furnace";

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
        onClick={canOpenCrafting ? onOpenCrafting : undefined}
        disabled={!canOpenCrafting}
      >
        {action.title}
      </button>
      <p className="feature-panel__hint">{action.description}</p>
    </div>
  );
}
