import type { BuildingType } from "@palpalworld/shared";

export function CraftingPanel({
  onCraft,
  onPlaceBuilding,
}: {
  onCraft: (recipeId: string) => void;
  onPlaceBuilding: (buildingType: BuildingType) => void;
}) {
  return (
    <div className="feature-panel feature-panel--crafting">
      <div className="feature-panel__section-title">제작</div>
      <div className="control-grid">
        <button onClick={() => onCraft("workbench_kit")}>작업대 키트 제작</button>
        <button onClick={() => onCraft("base_core_kit")}>거점 코어 키트 제작</button>
        <button onClick={() => onCraft("capture_orb")}>포획구 제작</button>
      </div>

      <div className="feature-panel__section-title">건설</div>
      <div className="control-grid">
        <button onClick={() => onPlaceBuilding("workbench")}>작업대 설치</button>
        <button onClick={() => onPlaceBuilding("base_core")}>거점 코어 설치</button>
        <button onClick={() => onPlaceBuilding("storage_box")}>보관함 설치</button>
      </div>
    </div>
  );
}
