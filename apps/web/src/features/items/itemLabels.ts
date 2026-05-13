export const ITEM_LABELS: Record<string, string> = {
  wood: "나무",
  hardwood: "단단한 나무",
  stone: "돌",
  fiber: "섬유",
  ore: "광석",
  berry: "열매",
  herb: "약초",
  coal: "석탄",
  ice_crystal: "얼음 결정",
  ember_shard: "불씨 조각",
  pal_essence: "펄 정수",
  leaf_pelt: "잎사귀 털가죽",
  flame_tail: "불꽃 꼬리털",
  water_jelly: "물방울 젤리",
  spark_core: "전기 코어",
  capture_orb: "포획구",
  basic_axe: "기본 도끼",
  basic_pickaxe: "기본 곡괭이",
  basic_sickle: "기본 낫",
  workbench_kit: "작업대 키트",
  base_core_kit: "거점 코어 키트",
  training_sword: "훈련용 검",
  explorer_jacket: "탐험가 재킷",
  leather_boots: "가죽 장화",
  leafbun_saddle: "풀토끼 안장",
  mossboar_saddle: "이끼멧돼지 안장",
  frosthorn_saddle: "서리뿔 안장",
};

export function getItemLabel(itemId: string) {
  return ITEM_LABELS[itemId] ?? itemId;
}
