import type { ItemStack } from "@palpalworld/shared";

export type ProgressionTier = "초반" | "초중반" | "중반" | "중후반";
export type CraftingStationId = "hand" | "workbench" | "furnace" | "advanced_workbench" | "kitchen" | "assembly_bench";
export type BuildingCategory = "base" | "production" | "storage" | "farming" | "defense" | "comfort";

export type ProgressionRecipe = {
  id: string;
  name: string;
  tier: ProgressionTier;
  station: CraftingStationId;
  inputs: ItemStack[];
  outputs: ItemStack[];
  craftTimeMs: number;
  description: string;
};

export type ProgressionBuilding = {
  type: string;
  name: string;
  tier: ProgressionTier;
  category: BuildingCategory;
  requires: ItemStack[];
  maxHp: number;
  unlockLevel: number;
  description: string;
};

export const PROGRESSION_RECIPES: ProgressionRecipe[] = [
  { id: "workbench_kit", name: "작업대 키트", tier: "초반", station: "hand", inputs: [{ itemId: "wood", amount: 20 }, { itemId: "stone", amount: 8 }], outputs: [{ itemId: "workbench_kit", amount: 1 }], craftTimeMs: 1500, description: "첫 제작소를 설치하기 위한 기본 키트." },
  { id: "base_core_kit", name: "거점 코어 키트", tier: "초반", station: "workbench", inputs: [{ itemId: "wood", amount: 40 }, { itemId: "stone", amount: 30 }, { itemId: "pal_essence", amount: 1 }], outputs: [{ itemId: "base_core_kit", amount: 1 }], craftTimeMs: 5000, description: "거점 중심 구조물을 설치하는 핵심 부품." },
  { id: "basic_axe", name: "기본 도끼", tier: "초반", station: "workbench", inputs: [{ itemId: "wood", amount: 12 }, { itemId: "stone", amount: 6 }], outputs: [{ itemId: "basic_axe", amount: 1 }], craftTimeMs: 2000, description: "나무 채집 효율을 올리는 기본 도구." },
  { id: "basic_pickaxe", name: "기본 곡괭이", tier: "초반", station: "workbench", inputs: [{ itemId: "wood", amount: 10 }, { itemId: "stone", amount: 10 }], outputs: [{ itemId: "basic_pickaxe", amount: 1 }], craftTimeMs: 2000, description: "돌과 광석 채집 효율을 올리는 기본 도구." },
  { id: "capture_orb", name: "초급 포획구", tier: "초반", station: "workbench", inputs: [{ itemId: "stone", amount: 5 }, { itemId: "fiber", amount: 3 }], outputs: [{ itemId: "capture_orb", amount: 3 }], craftTimeMs: 3000, description: "낮은 레벨 몬스터를 포획하는 기본 포획구." },
  { id: "training_sword", name: "훈련용 검", tier: "초반", station: "workbench", inputs: [{ itemId: "wood", amount: 12 }, { itemId: "stone", amount: 10 }], outputs: [{ itemId: "training_sword", amount: 1 }], craftTimeMs: 2500, description: "초반 전투용 무기." },
  { id: "cooked_berry", name: "구운 열매", tier: "초반", station: "campfire", inputs: [{ itemId: "berry", amount: 4 }, { itemId: "wood", amount: 1 }], outputs: [{ itemId: "cooked_berry", amount: 4 }], craftTimeMs: 2000, description: "초반 회복과 허기 시스템용 기초 음식." },
  { id: "healing_salve", name: "회복 연고", tier: "초중반", station: "workbench", inputs: [{ itemId: "herb", amount: 5 }, { itemId: "water_jelly", amount: 1 }], outputs: [{ itemId: "healing_salve", amount: 2 }], craftTimeMs: 3500, description: "탐험 중 HP 회복에 쓰는 소비 아이템." },
  { id: "leather_boots", name: "가죽 장화", tier: "초중반", station: "workbench", inputs: [{ itemId: "fiber", amount: 12 }, { itemId: "leaf_pelt", amount: 3 }], outputs: [{ itemId: "leather_boots", amount: 1 }], craftTimeMs: 3500, description: "이동속도 보너스를 주는 초반 장비." },
  { id: "explorer_jacket", name: "탐험가 재킷", tier: "초중반", station: "workbench", inputs: [{ itemId: "fiber", amount: 16 }, { itemId: "leaf_pelt", amount: 3 }], outputs: [{ itemId: "explorer_jacket", amount: 1 }], craftTimeMs: 3000, description: "최대 HP와 방어력을 올리는 기초 방어구." },
  { id: "ingot", name: "주괴", tier: "초중반", station: "furnace", inputs: [{ itemId: "ore", amount: 3 }, { itemId: "coal", amount: 1 }], outputs: [{ itemId: "ingot", amount: 1 }], craftTimeMs: 5000, description: "중반 장비와 생산시설에 쓰이는 제련 재료." },
  { id: "improved_capture_orb", name: "개량 포획구", tier: "중반", station: "advanced_workbench", inputs: [{ itemId: "capture_orb", amount: 2 }, { itemId: "ingot", amount: 1 }, { itemId: "pal_essence", amount: 2 }], outputs: [{ itemId: "improved_capture_orb", amount: 2 }], craftTimeMs: 5000, description: "중급 몬스터 포획 성공률이 더 높은 포획구." },
  { id: "iron_sword", name: "철검", tier: "중반", station: "advanced_workbench", inputs: [{ itemId: "ingot", amount: 6 }, { itemId: "wood", amount: 8 }, { itemId: "fiber", amount: 4 }], outputs: [{ itemId: "iron_sword", amount: 1 }], craftTimeMs: 6000, description: "중반 전투용 주력 무기." },
  { id: "pal_work_harness", name: "펄 작업 하네스", tier: "중반", station: "advanced_workbench", inputs: [{ itemId: "fiber", amount: 20 }, { itemId: "ingot", amount: 4 }, { itemId: "pal_essence", amount: 3 }], outputs: [{ itemId: "pal_work_harness", amount: 1 }], craftTimeMs: 7000, description: "거점 몬스터 작업 효율 시스템에 연결될 장비." },
  { id: "refined_ingot", name: "정제 주괴", tier: "중후반", station: "furnace", inputs: [{ itemId: "ingot", amount: 2 }, { itemId: "coal", amount: 3 }, { itemId: "ember_shard", amount: 1 }], outputs: [{ itemId: "refined_ingot", amount: 1 }], craftTimeMs: 8000, description: "중후반 장비와 자동화 시설의 핵심 재료." },
  { id: "thermal_jacket", name: "방열 재킷", tier: "중후반", station: "assembly_bench", inputs: [{ itemId: "refined_ingot", amount: 4 }, { itemId: "fiber", amount: 25 }, { itemId: "ember_shard", amount: 4 }], outputs: [{ itemId: "thermal_jacket", amount: 1 }], craftTimeMs: 9000, description: "사막/화산 지역 확장용 방어구." },
  { id: "cooling_charm", name: "냉각 부적", tier: "중후반", station: "assembly_bench", inputs: [{ itemId: "ice_crystal", amount: 5 }, { itemId: "spark_core", amount: 2 }, { itemId: "refined_ingot", amount: 2 }], outputs: [{ itemId: "cooling_charm", amount: 1 }], craftTimeMs: 9000, description: "고온/저온 지역 저항 시스템에 연결할 장신구." },
];

export const PROGRESSION_BUILDINGS: ProgressionBuilding[] = [
  { type: "workbench", name: "작업대", tier: "초반", category: "production", requires: [{ itemId: "workbench_kit", amount: 1 }], maxHp: 300, unlockLevel: 1, description: "도구, 무기, 포획구를 제작하는 첫 생산시설." },
  { type: "base_core", name: "거점 코어", tier: "초반", category: "base", requires: [{ itemId: "base_core_kit", amount: 1 }], maxHp: 800, unlockLevel: 1, description: "개인 거점의 중심." },
  { type: "storage_box", name: "보관함", tier: "초반", category: "storage", requires: [{ itemId: "wood", amount: 25 }], maxHp: 250, unlockLevel: 1, description: "자원과 아이템 보관 기능의 기본 구조물." },
  { type: "campfire", name: "모닥불", tier: "초반", category: "production", requires: [{ itemId: "wood", amount: 8 }, { itemId: "stone", amount: 4 }], maxHp: 100, unlockLevel: 1, description: "기초 음식 제작용 구조물." },
  { type: "pal_bed", name: "펄 침대", tier: "초반", category: "comfort", requires: [{ itemId: "wood", amount: 10 }, { itemId: "fiber", amount: 12 }], maxHp: 150, unlockLevel: 2, description: "거점 몬스터 회복 시스템용 침대." },
  { type: "farm_plot", name: "작은 밭", tier: "초중반", category: "farming", requires: [{ itemId: "wood", amount: 12 }, { itemId: "berry", amount: 6 }], maxHp: 220, unlockLevel: 2, description: "열매와 약초 생산 자동화의 시작점." },
  { type: "wood_floor", name: "나무 바닥", tier: "초중반", category: "base", requires: [{ itemId: "wood", amount: 4 }], maxHp: 120, unlockLevel: 2, description: "거점 레이아웃용 기본 바닥." },
  { type: "wood_wall", name: "나무 벽", tier: "초중반", category: "defense", requires: [{ itemId: "wood", amount: 6 }], maxHp: 180, unlockLevel: 2, description: "거점 방어와 공간 분리에 쓰는 기본 벽." },
  { type: "furnace", name: "화로", tier: "초중반", category: "production", requires: [{ itemId: "stone", amount: 40 }, { itemId: "coal", amount: 8 }], maxHp: 420, unlockLevel: 4, description: "광석을 주괴로 제련하는 중반 진입 시설." },
  { type: "advanced_workbench", name: "고급 작업대", tier: "중반", category: "production", requires: [{ itemId: "wood", amount: 40 }, { itemId: "ingot", amount: 8 }, { itemId: "fiber", amount: 15 }], maxHp: 500, unlockLevel: 7, description: "중급 장비와 개량 포획구 제작소." },
  { type: "kitchen", name: "조리대", tier: "중반", category: "production", requires: [{ itemId: "wood", amount: 25 }, { itemId: "stone", amount: 20 }, { itemId: "ingot", amount: 4 }], maxHp: 360, unlockLevel: 8, description: "음식과 버프 아이템 제작 시설." },
  { type: "guard_tower", name: "감시탑", tier: "중반", category: "defense", requires: [{ itemId: "wood", amount: 50 }, { itemId: "ingot", amount: 6 }], maxHp: 550, unlockLevel: 10, description: "거점 습격/방어 시스템용 방어 건물." },
  { type: "assembly_bench", name: "조립대", tier: "중후반", category: "production", requires: [{ itemId: "ingot", amount: 15 }, { itemId: "spark_core", amount: 4 }, { itemId: "wood", amount: 30 }], maxHp: 650, unlockLevel: 14, description: "중후반 장비와 자동화 부품 제작소." },
  { type: "power_generator", name: "발전기", tier: "중후반", category: "production", requires: [{ itemId: "ingot", amount: 20 }, { itemId: "spark_core", amount: 8 }, { itemId: "coal", amount: 12 }], maxHp: 700, unlockLevel: 16, description: "전기 몬스터 작업과 자동화 시설의 기반." },
  { type: "cold_storage", name: "냉장 보관함", tier: "중후반", category: "storage", requires: [{ itemId: "refined_ingot", amount: 6 }, { itemId: "ice_crystal", amount: 8 }, { itemId: "wood", amount: 20 }], maxHp: 620, unlockLevel: 18, description: "음식 보관 시스템용 상위 보관함." },
];

export function getBuildingItemId(buildingType: string) {
  return `building_${buildingType}`;
}

export function getBuildingTypeFromBuildingItemId(itemId: string) {
  if (!itemId.startsWith("building_")) return null;
  const buildingType = itemId.replace(/^building_/, "");
  return getProgressionBuilding(buildingType)?.type ?? null;
}

export function getBuildingByRequiredItemId(itemId: string) {
  return PROGRESSION_BUILDINGS.find(
    (building) => building.requires.length === 1 && building.requires[0]?.itemId === itemId && building.requires[0]?.amount === 1,
  ) ?? null;
}

export function isBuildingItemId(itemId: string) {
  return Boolean(getBuildingTypeFromBuildingItemId(itemId) || getBuildingByRequiredItemId(itemId));
}

export function getProgressionBuildingByItemId(itemId: string) {
  const buildingType = getBuildingTypeFromBuildingItemId(itemId);
  if (buildingType) return getProgressionBuilding(buildingType);
  return getBuildingByRequiredItemId(itemId);
}

export function getServerPlacementBuildingItemId(itemId: string) {
  const building = getProgressionBuildingByItemId(itemId);
  if (!building) return itemId;
  return getBuildingItemId(building.type);
}

export function getProgressionRecipe(recipeId: string) {
  return PROGRESSION_RECIPES.find((recipe) => recipe.id === recipeId) ?? null;
}

export function getProgressionBuilding(buildingType: string) {
  return PROGRESSION_BUILDINGS.find((building) => building.type === buildingType) ?? null;
}
