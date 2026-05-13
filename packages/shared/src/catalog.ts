import type {
  BuildingDefinition,
  CraftingRecipe,
  CreatureSpawnDefinition,
  CreatureSpecies,
  EquippableItemDefinition,
  ItemDefinition,
  RegionDefinition,
  ResourceDefinition,
  ResourceNodeState,
  TraitDefinition,
} from "./index";

export const TRAIT_CATALOG = {
  nimble: { id: "nimble", name: "날쌘", target: "creature", rarity: "common", effects: [{ type: "move_speed_multiplier", value: 1.08 }], description: "이동 속도가 조금 증가한다." },
  sturdy: { id: "sturdy", name: "튼튼한", target: "creature", rarity: "common", effects: [{ type: "defense_multiplier", value: 1.1 }], description: "방어력이 조금 증가한다." },
  hard_worker: { id: "hard_worker", name: "성실한", target: "creature", rarity: "uncommon", effects: [{ type: "work_speed_multiplier", value: 1.15 }], description: "거점 작업 속도가 증가한다." },
  brave: { id: "brave", name: "용감한", target: "creature", rarity: "uncommon", effects: [{ type: "attack_multiplier", value: 1.12 }], description: "공격력이 증가한다." },
  tireless: { id: "tireless", name: "지치지 않는", target: "creature", rarity: "rare", effects: [{ type: "stamina_multiplier", value: 1.25 }], description: "탈것/작업 스태미나가 증가한다." },
  giant_body: { id: "giant_body", name: "거대한 체구", target: "creature", rarity: "rare", effects: [{ type: "max_hp_multiplier", value: 1.2 }, { type: "move_speed_multiplier", value: 0.94 }], description: "체력이 크게 늘지만 이동 속도가 조금 감소한다." },
  flame_attuned: { id: "flame_attuned", name: "화염 친화", target: "creature", rarity: "rare", effects: [{ type: "element_damage_bonus", value: 1.15, element: "fire" }], description: "불속성 공격 효율이 증가한다." },
  frost_attuned: { id: "frost_attuned", name: "빙결 친화", target: "creature", rarity: "rare", effects: [{ type: "element_damage_bonus", value: 1.15, element: "ice" }], description: "얼음속성 공격 효율이 증가한다." },
  lucky: { id: "lucky", name: "행운아", target: "creature", rarity: "epic", effects: [{ type: "capture_bonus", value: 1.12 }, { type: "work_speed_multiplier", value: 1.08 }], description: "포획/작업 관련 보너스를 제공하는 희귀 특성이다." },
  sharp: { id: "sharp", name: "예리한", target: "weapon", rarity: "common", effects: [{ type: "attack_multiplier", value: 1.08 }], description: "무기 공격력이 증가한다." },
  light_grip: { id: "light_grip", name: "가벼운 손잡이", target: "weapon", rarity: "uncommon", effects: [{ type: "move_speed_multiplier", value: 1.04 }], description: "무기를 든 상태에서도 움직임이 가벼워진다." },
} as const satisfies Record<string, TraitDefinition>;

export const ITEM_CATALOG = {
  wood: { id: "wood", name: "나무", category: "resource", maxStack: 999, description: "기초 건축과 제작에 쓰이는 목재." },
  hardwood: { id: "hardwood", name: "단단한 나무", category: "resource", maxStack: 999 },
  stone: { id: "stone", name: "돌", category: "resource", maxStack: 999 },
  fiber: { id: "fiber", name: "섬유", category: "resource", maxStack: 999 },
  ore: { id: "ore", name: "광석", category: "resource", maxStack: 999 },
  berry: { id: "berry", name: "열매", category: "consumable", maxStack: 999 },
  herb: { id: "herb", name: "약초", category: "consumable", maxStack: 999 },
  coal: { id: "coal", name: "석탄", category: "resource", maxStack: 999 },
  ice_crystal: { id: "ice_crystal", name: "얼음 결정", category: "material", maxStack: 999 },
  ember_shard: { id: "ember_shard", name: "불씨 조각", category: "material", maxStack: 999 },
  pal_essence: { id: "pal_essence", name: "펄 정수", category: "material", maxStack: 999 },
  leaf_pelt: { id: "leaf_pelt", name: "잎사귀 털가죽", category: "material", maxStack: 999 },
  flame_tail: { id: "flame_tail", name: "불꽃 꼬리털", category: "material", maxStack: 999 },
  water_jelly: { id: "water_jelly", name: "물방울 젤리", category: "material", maxStack: 999 },
  spark_core: { id: "spark_core", name: "전기 코어", category: "material", maxStack: 999 },
  basic_axe: { id: "basic_axe", name: "기본 도끼", category: "tool", maxStack: 1 },
  basic_pickaxe: { id: "basic_pickaxe", name: "기본 곡괭이", category: "tool", maxStack: 1 },
  basic_sickle: { id: "basic_sickle", name: "기본 낫", category: "tool", maxStack: 1 },
  capture_orb: { id: "capture_orb", name: "초급 포획구", category: "capture", maxStack: 99 },
  workbench_kit: { id: "workbench_kit", name: "작업대 키트", category: "building", maxStack: 99 },
  base_core_kit: { id: "base_core_kit", name: "거점 코어 키트", category: "building", maxStack: 10 },
  training_sword: { id: "training_sword", name: "훈련용 검", category: "weapon", maxStack: 1, slot: "weapon", statBonuses: { attack: 5 }, traitPool: ["sharp", "light_grip"] },
  explorer_jacket: { id: "explorer_jacket", name: "탐험가 재킷", category: "equipment", maxStack: 1, slot: "body", statBonuses: { defense: 3, maxHp: 15 } },
  leather_boots: { id: "leather_boots", name: "가죽 장화", category: "equipment", maxStack: 1, slot: "feet", statBonuses: { moveSpeed: 10 } },
  leafbun_saddle: { id: "leafbun_saddle", name: "풀토끼 안장", category: "mount_gear", maxStack: 1, slot: "mountGear", statBonuses: {} },
  mossboar_saddle: { id: "mossboar_saddle", name: "이끼멧돼지 안장", category: "mount_gear", maxStack: 1, slot: "mountGear", statBonuses: {} },
  frosthorn_saddle: { id: "frosthorn_saddle", name: "서리뿔 안장", category: "mount_gear", maxStack: 1, slot: "mountGear", statBonuses: {} },
} as const satisfies Record<string, ItemDefinition | EquippableItemDefinition>;

export const REGION_CATALOG = {
  starter_meadow: { id: "starter_meadow", name: "초록빛 초원", recommendedLevel: [1, 8], resourceTypes: ["wood", "stone", "fiber", "berry", "herb"], creatureSpeciesIds: ["leafbun", "sparkit", "droplet"], description: "초보 모험가가 처음 정착하는 안전한 초원 지역." },
  moss_forest: { id: "moss_forest", name: "이끼숲", recommendedLevel: [6, 15], resourceTypes: ["wood", "hardwood", "fiber", "herb", "berry"], creatureSpeciesIds: ["leafbun", "mossboar", "shadowcat"], description: "나무와 약초가 풍부하지만 밤에는 어둠속성 몬스터가 출몰한다." },
  stone_hills: { id: "stone_hills", name: "돌무지 언덕", recommendedLevel: [10, 22], resourceTypes: ["stone", "ore", "coal"], creatureSpeciesIds: ["rockturtle", "moleminer", "sparkit"], description: "광석과 석탄이 풍부한 채광 중심 지역." },
  ember_desert: { id: "ember_desert", name: "불씨 사막", recommendedLevel: [18, 32], resourceTypes: ["stone", "ore", "coal", "ember_shard"], creatureSpeciesIds: ["flametail", "cinderscorp", "rockturtle"], description: "고열 환경과 불속성 몬스터가 지배하는 사막." },
  frost_peaks: { id: "frost_peaks", name: "서리 봉우리", recommendedLevel: [28, 45], resourceTypes: ["stone", "ore", "ice_crystal"], creatureSpeciesIds: ["snowpuff", "frosthorn", "shadowcat"], description: "방한 장비와 냉각 작업 몬스터가 중요한 고난도 지역." },
} as const satisfies Record<string, RegionDefinition>;

export const RESOURCE_CATALOG = {
  wood: { type: "wood", name: "나무", baseAmount: 100, respawnMs: 30_000, harvestTool: "axe", drops: [{ itemId: "wood", min: 8, max: 14, chance: 1 }] },
  hardwood: { type: "hardwood", name: "단단한 나무", baseAmount: 140, respawnMs: 45_000, harvestTool: "axe", drops: [{ itemId: "wood", min: 6, max: 10, chance: 1 }, { itemId: "hardwood", min: 3, max: 7, chance: 0.75 }] },
  stone: { type: "stone", name: "돌무더기", baseAmount: 100, respawnMs: 30_000, harvestTool: "pickaxe", drops: [{ itemId: "stone", min: 8, max: 12, chance: 1 }] },
  fiber: { type: "fiber", name: "풀섬유", baseAmount: 60, respawnMs: 20_000, harvestTool: "sickle", drops: [{ itemId: "fiber", min: 5, max: 9, chance: 1 }] },
  ore: { type: "ore", name: "광맥", baseAmount: 120, respawnMs: 50_000, harvestTool: "pickaxe", drops: [{ itemId: "stone", min: 3, max: 6, chance: 1 }, { itemId: "ore", min: 4, max: 8, chance: 0.9 }] },
  berry: { type: "berry", name: "열매 덤불", baseAmount: 40, respawnMs: 25_000, drops: [{ itemId: "berry", min: 4, max: 8, chance: 1 }] },
  herb: { type: "herb", name: "약초", baseAmount: 35, respawnMs: 25_000, drops: [{ itemId: "herb", min: 3, max: 6, chance: 1 }] },
  coal: { type: "coal", name: "석탄맥", baseAmount: 100, respawnMs: 55_000, harvestTool: "pickaxe", drops: [{ itemId: "coal", min: 4, max: 8, chance: 1 }] },
  ice_crystal: { type: "ice_crystal", name: "얼음 결정석", baseAmount: 80, respawnMs: 70_000, harvestTool: "pickaxe", drops: [{ itemId: "ice_crystal", min: 2, max: 5, chance: 1 }] },
  ember_shard: { type: "ember_shard", name: "불씨 결정석", baseAmount: 80, respawnMs: 70_000, harvestTool: "pickaxe", drops: [{ itemId: "ember_shard", min: 2, max: 5, chance: 1 }] },
} as const satisfies Record<string, ResourceDefinition>;

export const CREATURE_CATALOG = {
  leafbun: { id: "leafbun", name: "풀토끼", element: "grass", rarity: "common", baseHp: 55, baseAttack: 9, baseDefense: 5, baseMoveSpeed: 110, workSkills: { farming: 1, hauling: 1 }, traitPool: ["nimble", "hard_worker", "lucky"], mount: { speciesId: "leafbun", mountType: "ground", requiredGearItemId: "leafbun_saddle", moveSpeedMultiplier: 1.25, staminaSeconds: 18, unlockLevel: 3 }, drops: [{ itemId: "leaf_pelt", min: 1, max: 2, chance: 0.8 }, { itemId: "berry", min: 1, max: 3, chance: 0.35 }] },
  flametail: { id: "flametail", name: "불꼬리여우", element: "fire", rarity: "uncommon", baseHp: 70, baseAttack: 14, baseDefense: 6, baseMoveSpeed: 125, workSkills: { cooking: 2, crafting: 1 }, traitPool: ["nimble", "brave", "flame_attuned", "tireless"], drops: [{ itemId: "flame_tail", min: 1, max: 2, chance: 0.75 }, { itemId: "ember_shard", min: 1, max: 1, chance: 0.2 }] },
  droplet: { id: "droplet", name: "물방울슬라임", element: "water", rarity: "common", baseHp: 62, baseAttack: 8, baseDefense: 8, baseMoveSpeed: 80, workSkills: { farming: 1, cooling: 1 }, traitPool: ["sturdy", "hard_worker", "giant_body"], drops: [{ itemId: "water_jelly", min: 1, max: 3, chance: 0.9 }] },
  sparkit: { id: "sparkit", name: "전기쥐", element: "electric", rarity: "uncommon", baseHp: 58, baseAttack: 13, baseDefense: 5, baseMoveSpeed: 135, workSkills: { generating: 2, hauling: 1 }, traitPool: ["nimble", "brave", "tireless"], drops: [{ itemId: "spark_core", min: 1, max: 2, chance: 0.65 }] },
  rockturtle: { id: "rockturtle", name: "돌거북", element: "neutral", rarity: "uncommon", baseHp: 120, baseAttack: 10, baseDefense: 18, baseMoveSpeed: 55, workSkills: { mining: 3, hauling: 1 }, traitPool: ["sturdy", "giant_body", "hard_worker"], drops: [{ itemId: "stone", min: 4, max: 10, chance: 1 }, { itemId: "ore", min: 1, max: 3, chance: 0.4 }] },
  mossboar: { id: "mossboar", name: "이끼멧돼지", element: "grass", rarity: "rare", baseHp: 145, baseAttack: 18, baseDefense: 12, baseMoveSpeed: 95, workSkills: { logging: 2, farming: 1 }, traitPool: ["brave", "sturdy", "hard_worker", "tireless"], mount: { speciesId: "mossboar", mountType: "ground", requiredGearItemId: "mossboar_saddle", moveSpeedMultiplier: 1.35, staminaSeconds: 26, unlockLevel: 8 }, drops: [{ itemId: "hardwood", min: 2, max: 5, chance: 0.8 }] },
  shadowcat: { id: "shadowcat", name: "그림자고양이", element: "dark", rarity: "rare", baseHp: 82, baseAttack: 22, baseDefense: 7, baseMoveSpeed: 160, workSkills: { scouting: 3 }, traitPool: ["nimble", "brave", "lucky", "tireless"], drops: [{ itemId: "pal_essence", min: 1, max: 2, chance: 0.5 }] },
  moleminer: { id: "moleminer", name: "광석두더지", element: "neutral", rarity: "rare", baseHp: 98, baseAttack: 16, baseDefense: 15, baseMoveSpeed: 85, workSkills: { mining: 3 }, traitPool: ["hard_worker", "sturdy", "giant_body"], drops: [{ itemId: "ore", min: 3, max: 7, chance: 0.9 }, { itemId: "coal", min: 1, max: 3, chance: 0.35 }] },
  cinderscorp: { id: "cinderscorp", name: "재불전갈", element: "fire", rarity: "epic", baseHp: 160, baseAttack: 26, baseDefense: 18, baseMoveSpeed: 105, workSkills: { generating: 1, defending: 2 }, traitPool: ["brave", "sturdy", "flame_attuned", "giant_body"], drops: [{ itemId: "ember_shard", min: 2, max: 6, chance: 0.85 }] },
  snowpuff: { id: "snowpuff", name: "눈송이펄", element: "ice", rarity: "uncommon", baseHp: 75, baseAttack: 12, baseDefense: 10, baseMoveSpeed: 90, workSkills: { cooling: 2 }, traitPool: ["sturdy", "hard_worker", "frost_attuned"], drops: [{ itemId: "ice_crystal", min: 1, max: 3, chance: 0.6 }] },
  frosthorn: { id: "frosthorn", name: "서리뿔사슴", element: "ice", rarity: "epic", baseHp: 180, baseAttack: 25, baseDefense: 16, baseMoveSpeed: 135, workSkills: { cooling: 3, hauling: 1 }, traitPool: ["brave", "tireless", "frost_attuned", "giant_body"], mount: { speciesId: "frosthorn", mountType: "ground", requiredGearItemId: "frosthorn_saddle", moveSpeedMultiplier: 1.55, staminaSeconds: 35, unlockLevel: 18 }, drops: [{ itemId: "ice_crystal", min: 3, max: 8, chance: 0.9 }, { itemId: "pal_essence", min: 1, max: 2, chance: 0.4 }] },
} as const satisfies Record<string, CreatureSpecies>;

export const CRAFTING_RECIPES = {
  basic_axe: { id: "basic_axe", name: "기본 도끼", station: "workbench", inputs: [{ itemId: "wood", amount: 12 }, { itemId: "stone", amount: 6 }], outputs: [{ itemId: "basic_axe", amount: 1 }], craftTimeMs: 2_000 },
  basic_pickaxe: { id: "basic_pickaxe", name: "기본 곡괭이", station: "workbench", inputs: [{ itemId: "wood", amount: 10 }, { itemId: "stone", amount: 10 }], outputs: [{ itemId: "basic_pickaxe", amount: 1 }], craftTimeMs: 2_000 },
  capture_orb: { id: "capture_orb", name: "초급 포획구", station: "workbench", inputs: [{ itemId: "stone", amount: 5 }, { itemId: "fiber", amount: 3 }, { itemId: "pal_essence", amount: 1 }], outputs: [{ itemId: "capture_orb", amount: 3 }], craftTimeMs: 3_000 },
  training_sword: { id: "training_sword", name: "훈련용 검", station: "workbench", inputs: [{ itemId: "wood", amount: 12 }, { itemId: "stone", amount: 10 }], outputs: [{ itemId: "training_sword", amount: 1 }], craftTimeMs: 2_500 },
  explorer_jacket: { id: "explorer_jacket", name: "탐험가 재킷", station: "workbench", inputs: [{ itemId: "fiber", amount: 16 }, { itemId: "leaf_pelt", amount: 3 }], outputs: [{ itemId: "explorer_jacket", amount: 1 }], craftTimeMs: 3_000 },
  workbench_kit: { id: "workbench_kit", name: "작업대 키트", station: "hand", inputs: [{ itemId: "wood", amount: 20 }, { itemId: "stone", amount: 8 }], outputs: [{ itemId: "workbench_kit", amount: 1 }], craftTimeMs: 1_500 },
  base_core_kit: { id: "base_core_kit", name: "거점 코어 키트", station: "workbench", inputs: [{ itemId: "wood", amount: 40 }, { itemId: "stone", amount: 30 }, { itemId: "pal_essence", amount: 3 }], outputs: [{ itemId: "base_core_kit", amount: 1 }], craftTimeMs: 5_000 },
  leafbun_saddle: { id: "leafbun_saddle", name: "풀토끼 안장", station: "workbench", inputs: [{ itemId: "leaf_pelt", amount: 4 }, { itemId: "fiber", amount: 12 }, { itemId: "wood", amount: 8 }], outputs: [{ itemId: "leafbun_saddle", amount: 1 }], craftTimeMs: 4_000 },
  mossboar_saddle: { id: "mossboar_saddle", name: "이끼멧돼지 안장", station: "workbench", inputs: [{ itemId: "hardwood", amount: 10 }, { itemId: "fiber", amount: 18 }, { itemId: "leaf_pelt", amount: 6 }], outputs: [{ itemId: "mossboar_saddle", amount: 1 }], craftTimeMs: 6_000 },
} as const satisfies Record<string, CraftingRecipe>;

export const BUILDING_CATALOG = {
  base_core: { type: "base_core", name: "거점 코어", size: { width: 2, height: 2 }, maxHp: 800, requires: [{ itemId: "base_core_kit", amount: 1 }], unlockLevel: 1, description: "개인 거점의 중심. 주변에 건물을 배치할 수 있다." },
  storage_box: { type: "storage_box", name: "보관함", size: { width: 1, height: 1 }, maxHp: 250, requires: [{ itemId: "wood", amount: 25 }], unlockLevel: 1, description: "자원과 아이템을 보관한다." },
  workbench: { type: "workbench", name: "작업대", size: { width: 2, height: 1 }, maxHp: 300, requires: [{ itemId: "workbench_kit", amount: 1 }], unlockLevel: 1, description: "도구와 포획구를 제작한다." },
  pal_bed: { type: "pal_bed", name: "펄 침대", size: { width: 1, height: 1 }, maxHp: 150, requires: [{ itemId: "wood", amount: 10 }, { itemId: "fiber", amount: 12 }], unlockLevel: 2, description: "거점 몬스터의 피로도를 회복한다." },
  farm_plot: { type: "farm_plot", name: "작은 밭", size: { width: 2, height: 2 }, maxHp: 220, requires: [{ itemId: "wood", amount: 12 }, { itemId: "berry", amount: 6 }], unlockLevel: 2, description: "열매와 약초를 재배한다." },
  furnace: { type: "furnace", name: "화로", size: { width: 2, height: 2 }, maxHp: 420, requires: [{ itemId: "stone", amount: 40 }, { itemId: "coal", amount: 8 }], unlockLevel: 4, description: "광석을 제련하는 제작소." },
  campfire: { type: "campfire", name: "모닥불", size: { width: 1, height: 1 }, maxHp: 100, requires: [{ itemId: "wood", amount: 8 }, { itemId: "stone", amount: 4 }], unlockLevel: 1, description: "간단한 요리와 야간 시야 확보에 사용한다." },
  wood_wall: { type: "wood_wall", name: "나무 벽", size: { width: 1, height: 1 }, maxHp: 180, requires: [{ itemId: "wood", amount: 6 }], unlockLevel: 1, description: "거점 방어용 기본 벽." },
  wood_floor: { type: "wood_floor", name: "나무 바닥", size: { width: 1, height: 1 }, maxHp: 120, requires: [{ itemId: "wood", amount: 4 }], unlockLevel: 1, description: "건물 배치용 바닥 타일." },
} as const satisfies Record<string, BuildingDefinition>;

export const STARTER_RESOURCE_NODES: ResourceNodeState[] = [
  { id: "starter-tree-1", regionId: "starter_meadow", resourceType: "wood", position: { x: 320, y: 240 }, remainingAmount: 100, maxAmount: 100 },
  { id: "starter-tree-2", regionId: "starter_meadow", resourceType: "wood", position: { x: 240, y: 420 }, remainingAmount: 100, maxAmount: 100 },
  { id: "starter-stone-1", regionId: "starter_meadow", resourceType: "stone", position: { x: 520, y: 360 }, remainingAmount: 100, maxAmount: 100 },
  { id: "starter-fiber-1", regionId: "starter_meadow", resourceType: "fiber", position: { x: 430, y: 250 }, remainingAmount: 60, maxAmount: 60 },
  { id: "starter-berry-1", regionId: "starter_meadow", resourceType: "berry", position: { x: 680, y: 300 }, remainingAmount: 40, maxAmount: 40 },
  { id: "forest-hardwood-1", regionId: "moss_forest", resourceType: "hardwood", position: { x: 900, y: 260 }, remainingAmount: 140, maxAmount: 140 },
  { id: "hills-ore-1", regionId: "stone_hills", resourceType: "ore", position: { x: 1020, y: 520 }, remainingAmount: 120, maxAmount: 120 },
  { id: "hills-coal-1", regionId: "stone_hills", resourceType: "coal", position: { x: 1120, y: 440 }, remainingAmount: 100, maxAmount: 100 },
];

export const STARTER_CREATURE_SPAWNS: CreatureSpawnDefinition[] = [
  { id: "spawn-leafbun-1", speciesId: "leafbun", regionId: "starter_meadow", position: { x: 380, y: 330 }, level: 2, respawnMs: 25_000, traitIds: ["nimble"] },
  { id: "spawn-leafbun-2", speciesId: "leafbun", regionId: "starter_meadow", position: { x: 620, y: 250 }, level: 3, respawnMs: 25_000, traitIds: ["hard_worker"] },
  { id: "spawn-droplet-1", speciesId: "droplet", regionId: "starter_meadow", position: { x: 760, y: 420 }, level: 3, respawnMs: 30_000, traitIds: ["sturdy"] },
  { id: "spawn-sparkit-1", speciesId: "sparkit", regionId: "starter_meadow", position: { x: 560, y: 520 }, level: 4, respawnMs: 35_000, traitIds: ["brave"] },
  { id: "spawn-mossboar-1", speciesId: "mossboar", regionId: "moss_forest", position: { x: 960, y: 310 }, level: 8, respawnMs: 45_000, traitIds: ["sturdy", "hard_worker"] },
  { id: "spawn-rockturtle-1", speciesId: "rockturtle", regionId: "stone_hills", position: { x: 1080, y: 560 }, level: 10, respawnMs: 45_000, traitIds: ["giant_body"] },
];
