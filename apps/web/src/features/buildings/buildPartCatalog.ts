import type { ItemStack } from "@palpalworld/shared";

export type BuildPartCategory = "floor" | "wall" | "door" | "window" | "stairs" | "roof" | "furniture" | "utility" | "decor";
export type BuildPartLayer = "foundation" | "floor" | "wall" | "object" | "stairs" | "roof" | "decor";
export type BuildPartRotation = 0 | 90 | 180 | 270;
export type BuildPartMaterial = "wood" | "stone" | "cloth" | "metal";
export type BuildFloorLevel = 0 | 1 | 2;
export type BuildPartId =
  | "wood_foundation_part"
  | "wood_floor_part"
  | "wood_half_floor_part"
  | "wood_wall_part"
  | "wood_half_wall_part"
  | "wood_door_part"
  | "wood_window_part"
  | "wood_corner_post_part"
  | "wood_railing_part"
  | "wood_stairs_part"
  | "wood_ladder_part"
  | "wood_second_floor_part"
  | "wood_roof_edge_part"
  | "wood_roof_corner_part"
  | "wood_roof_cap_part"
  | "stone_foundation_part"
  | "stone_floor_part"
  | "stone_wall_part"
  | "stone_door_frame_part"
  | "stone_window_part"
  | "stone_stairs_part"
  | "cloth_awning_part"
  | "small_lamp_post_part"
  | "wood_sign_part"
  | "wood_fence_part"
  | "wood_gate_part";

export type BuildPartDefinition = {
  id: BuildPartId;
  sourceBuildingType?: string;
  name: string;
  category: BuildPartCategory;
  layer: BuildPartLayer;
  material: BuildPartMaterial;
  width: number;
  height: number;
  floorLevel: BuildFloorLevel;
  maxHp: number;
  blocksMove: boolean;
  blocksBuild: boolean;
  canRotate: boolean;
  requiresFloor: boolean;
  requiresWall: boolean;
  requiresSupport: boolean;
  supportsUpperFloor: boolean;
  connectsFloorLevelDelta: 0 | 1 | -1;
  connectsToSameCategory: boolean;
  cost: ItemStack[];
  description: string;
};

export type PlacedBuildPart = {
  id: string;
  partId: BuildPartId;
  ownerPlayerId: string;
  regionId: string;
  tileX: number;
  tileY: number;
  gridX: number;
  gridY: number;
  floorLevel: BuildFloorLevel;
  rotation: BuildPartRotation;
  hp: number;
  maxHp: number;
  createdAt: number;
  updatedAt: number;
};

const wood = (amount: number): ItemStack => ({ itemId: "wood", amount });
const stone = (amount: number): ItemStack => ({ itemId: "stone", amount });
const fiber = (amount: number): ItemStack => ({ itemId: "fiber", amount });
const ingot = (amount: number): ItemStack => ({ itemId: "ingot", amount });

export const BUILD_PARTS: Record<BuildPartId, BuildPartDefinition> = {
  wood_foundation_part: {
    id: "wood_foundation_part",
    name: "나무 기초",
    category: "floor",
    layer: "foundation",
    material: "wood",
    width: 1,
    height: 1,
    floorLevel: 0,
    maxHp: 180,
    blocksMove: false,
    blocksBuild: false,
    canRotate: false,
    requiresFloor: false,
    requiresWall: false,
    requiresSupport: false,
    supportsUpperFloor: true,
    connectsFloorLevelDelta: 0,
    connectsToSameCategory: true,
    cost: [wood(6), stone(2)],
    description: "집의 가장 기본이 되는 지면 기초입니다. 2층 지지를 계산할 때 기준이 됩니다.",
  },
  wood_floor_part: {
    id: "wood_floor_part",
    sourceBuildingType: "wood_floor",
    name: "나무 바닥 부품",
    category: "floor",
    layer: "floor",
    material: "wood",
    width: 1,
    height: 1,
    floorLevel: 0,
    maxHp: 120,
    blocksMove: false,
    blocksBuild: false,
    canRotate: false,
    requiresFloor: false,
    requiresWall: false,
    requiresSupport: false,
    supportsUpperFloor: true,
    connectsFloorLevelDelta: 0,
    connectsToSameCategory: true,
    cost: [wood(4)],
    description: "집의 기준이 되는 1칸 바닥입니다. 가구와 벽을 깔끔하게 정렬하는 기반입니다.",
  },
  wood_half_floor_part: {
    id: "wood_half_floor_part",
    name: "나무 반칸 바닥",
    category: "floor",
    layer: "floor",
    material: "wood",
    width: 1,
    height: 1,
    floorLevel: 0,
    maxHp: 90,
    blocksMove: false,
    blocksBuild: false,
    canRotate: true,
    requiresFloor: false,
    requiresWall: false,
    requiresSupport: false,
    supportsUpperFloor: false,
    connectsFloorLevelDelta: 0,
    connectsToSameCategory: true,
    cost: [wood(2)],
    description: "테라스나 현관 끝선을 다듬는 반칸 느낌의 바닥 부품입니다.",
  },
  wood_wall_part: {
    id: "wood_wall_part",
    sourceBuildingType: "wood_wall",
    name: "나무 벽 부품",
    category: "wall",
    layer: "wall",
    material: "wood",
    width: 1,
    height: 1,
    floorLevel: 0,
    maxHp: 180,
    blocksMove: true,
    blocksBuild: true,
    canRotate: true,
    requiresFloor: false,
    requiresWall: false,
    requiresSupport: false,
    supportsUpperFloor: true,
    connectsFloorLevelDelta: 0,
    connectsToSameCategory: true,
    cost: [wood(6)],
    description: "주변 벽과 자동 연결되는 기본 벽입니다.",
  },
  wood_half_wall_part: {
    id: "wood_half_wall_part",
    name: "나무 반벽",
    category: "wall",
    layer: "wall",
    material: "wood",
    width: 1,
    height: 1,
    floorLevel: 0,
    maxHp: 110,
    blocksMove: false,
    blocksBuild: true,
    canRotate: true,
    requiresFloor: false,
    requiresWall: false,
    requiresSupport: false,
    supportsUpperFloor: false,
    connectsFloorLevelDelta: 0,
    connectsToSameCategory: true,
    cost: [wood(4)],
    description: "난간이나 낮은 담장처럼 공간을 나누는 낮은 벽입니다.",
  },
  wood_door_part: {
    id: "wood_door_part",
    name: "나무 문 부품",
    category: "door",
    layer: "wall",
    material: "wood",
    width: 1,
    height: 1,
    floorLevel: 0,
    maxHp: 160,
    blocksMove: false,
    blocksBuild: true,
    canRotate: true,
    requiresFloor: false,
    requiresWall: true,
    requiresSupport: false,
    supportsUpperFloor: false,
    connectsFloorLevelDelta: 0,
    connectsToSameCategory: false,
    cost: [wood(8), fiber(2)],
    description: "벽 자리에 교체 설치하는 출입구입니다.",
  },
  wood_window_part: {
    id: "wood_window_part",
    name: "나무 창문 부품",
    category: "window",
    layer: "wall",
    material: "wood",
    width: 1,
    height: 1,
    floorLevel: 0,
    maxHp: 120,
    blocksMove: true,
    blocksBuild: true,
    canRotate: true,
    requiresFloor: false,
    requiresWall: true,
    requiresSupport: false,
    supportsUpperFloor: false,
    connectsFloorLevelDelta: 0,
    connectsToSameCategory: false,
    cost: [wood(6), stone(2)],
    description: "벽 자리에 교체 설치하는 창문입니다. 내부/외부 느낌을 살리는 장식 부품입니다.",
  },
  wood_corner_post_part: {
    id: "wood_corner_post_part",
    name: "나무 기둥 부품",
    category: "wall",
    layer: "wall",
    material: "wood",
    width: 1,
    height: 1,
    floorLevel: 0,
    maxHp: 220,
    blocksMove: true,
    blocksBuild: true,
    canRotate: false,
    requiresFloor: false,
    requiresWall: false,
    requiresSupport: false,
    supportsUpperFloor: true,
    connectsFloorLevelDelta: 0,
    connectsToSameCategory: true,
    cost: [wood(10)],
    description: "모서리와 입구를 강조하고 2층을 지지하는 구조 기둥입니다.",
  },
  wood_railing_part: {
    id: "wood_railing_part",
    name: "나무 난간",
    category: "wall",
    layer: "wall",
    material: "wood",
    width: 1,
    height: 1,
    floorLevel: 1,
    maxHp: 95,
    blocksMove: false,
    blocksBuild: true,
    canRotate: true,
    requiresFloor: true,
    requiresWall: false,
    requiresSupport: true,
    supportsUpperFloor: false,
    connectsFloorLevelDelta: 0,
    connectsToSameCategory: true,
    cost: [wood(4), fiber(1)],
    description: "2층 발코니나 계단 주변에 쓰는 낮은 난간입니다.",
  },
  wood_stairs_part: {
    id: "wood_stairs_part",
    name: "나무 계단",
    category: "stairs",
    layer: "stairs",
    material: "wood",
    width: 1,
    height: 2,
    floorLevel: 0,
    maxHp: 180,
    blocksMove: false,
    blocksBuild: true,
    canRotate: true,
    requiresFloor: true,
    requiresWall: false,
    requiresSupport: false,
    supportsUpperFloor: true,
    connectsFloorLevelDelta: 1,
    connectsToSameCategory: false,
    cost: [wood(12), fiber(3)],
    description: "1층과 2층을 연결하는 기본 계단입니다. 회전 방향에 따라 올라가는 방향이 바뀝니다.",
  },
  wood_ladder_part: {
    id: "wood_ladder_part",
    name: "나무 사다리",
    category: "stairs",
    layer: "stairs",
    material: "wood",
    width: 1,
    height: 1,
    floorLevel: 0,
    maxHp: 90,
    blocksMove: false,
    blocksBuild: true,
    canRotate: true,
    requiresFloor: false,
    requiresWall: true,
    requiresSupport: false,
    supportsUpperFloor: false,
    connectsFloorLevelDelta: 1,
    connectsToSameCategory: false,
    cost: [wood(8), fiber(4)],
    description: "좁은 공간에서 2층으로 오르내리는 벽 부착형 이동 부품입니다.",
  },
  wood_second_floor_part: {
    id: "wood_second_floor_part",
    name: "나무 2층 바닥",
    category: "floor",
    layer: "floor",
    material: "wood",
    width: 1,
    height: 1,
    floorLevel: 1,
    maxHp: 130,
    blocksMove: false,
    blocksBuild: false,
    canRotate: false,
    requiresFloor: false,
    requiresWall: false,
    requiresSupport: true,
    supportsUpperFloor: true,
    connectsFloorLevelDelta: 0,
    connectsToSameCategory: true,
    cost: [wood(6), fiber(1)],
    description: "기둥, 벽, 계단으로 지지해야 하는 2층용 바닥입니다.",
  },
  wood_roof_edge_part: {
    id: "wood_roof_edge_part",
    name: "나무 지붕 테두리",
    category: "roof",
    layer: "roof",
    material: "wood",
    width: 1,
    height: 1,
    floorLevel: 1,
    maxHp: 100,
    blocksMove: false,
    blocksBuild: false,
    canRotate: true,
    requiresFloor: false,
    requiresWall: true,
    requiresSupport: true,
    supportsUpperFloor: false,
    connectsFloorLevelDelta: 0,
    connectsToSameCategory: true,
    cost: [wood(5), fiber(2)],
    description: "실내감을 만들기 위한 상단 장식 부품입니다. 초반에는 시각 효과 중심으로 사용합니다.",
  },
  wood_roof_corner_part: {
    id: "wood_roof_corner_part",
    name: "나무 지붕 모서리",
    category: "roof",
    layer: "roof",
    material: "wood",
    width: 1,
    height: 1,
    floorLevel: 1,
    maxHp: 100,
    blocksMove: false,
    blocksBuild: false,
    canRotate: true,
    requiresFloor: false,
    requiresWall: true,
    requiresSupport: true,
    supportsUpperFloor: false,
    connectsFloorLevelDelta: 0,
    connectsToSameCategory: true,
    cost: [wood(5), fiber(2)],
    description: "지붕 테두리의 모서리를 자연스럽게 연결하는 부품입니다.",
  },
  wood_roof_cap_part: {
    id: "wood_roof_cap_part",
    name: "나무 지붕 덮개",
    category: "roof",
    layer: "roof",
    material: "wood",
    width: 1,
    height: 1,
    floorLevel: 1,
    maxHp: 90,
    blocksMove: false,
    blocksBuild: false,
    canRotate: false,
    requiresFloor: false,
    requiresWall: false,
    requiresSupport: true,
    supportsUpperFloor: false,
    connectsFloorLevelDelta: 0,
    connectsToSameCategory: true,
    cost: [wood(4), fiber(2)],
    description: "방 위를 덮는 지붕면 장식입니다. 실내/실외 판정과 연결할 수 있습니다.",
  },
  stone_foundation_part: {
    id: "stone_foundation_part",
    name: "돌 기초",
    category: "floor",
    layer: "foundation",
    material: "stone",
    width: 1,
    height: 1,
    floorLevel: 0,
    maxHp: 300,
    blocksMove: false,
    blocksBuild: false,
    canRotate: false,
    requiresFloor: false,
    requiresWall: false,
    requiresSupport: false,
    supportsUpperFloor: true,
    connectsFloorLevelDelta: 0,
    connectsToSameCategory: true,
    cost: [stone(8)],
    description: "높은 내구도의 기초 부품입니다. 무거운 2층 구조에 적합합니다.",
  },
  stone_floor_part: {
    id: "stone_floor_part",
    name: "돌 바닥",
    category: "floor",
    layer: "floor",
    material: "stone",
    width: 1,
    height: 1,
    floorLevel: 0,
    maxHp: 240,
    blocksMove: false,
    blocksBuild: false,
    canRotate: false,
    requiresFloor: false,
    requiresWall: false,
    requiresSupport: false,
    supportsUpperFloor: true,
    connectsFloorLevelDelta: 0,
    connectsToSameCategory: true,
    cost: [stone(6)],
    description: "튼튼하고 깔끔한 석재 바닥입니다.",
  },
  stone_wall_part: {
    id: "stone_wall_part",
    name: "돌 벽",
    category: "wall",
    layer: "wall",
    material: "stone",
    width: 1,
    height: 1,
    floorLevel: 0,
    maxHp: 360,
    blocksMove: true,
    blocksBuild: true,
    canRotate: true,
    requiresFloor: false,
    requiresWall: false,
    requiresSupport: false,
    supportsUpperFloor: true,
    connectsFloorLevelDelta: 0,
    connectsToSameCategory: true,
    cost: [stone(10)],
    description: "습격 방어에 유리한 고내구도 벽입니다.",
  },
  stone_door_frame_part: {
    id: "stone_door_frame_part",
    name: "돌 문틀",
    category: "door",
    layer: "wall",
    material: "stone",
    width: 1,
    height: 1,
    floorLevel: 0,
    maxHp: 300,
    blocksMove: false,
    blocksBuild: true,
    canRotate: true,
    requiresFloor: false,
    requiresWall: true,
    requiresSupport: false,
    supportsUpperFloor: true,
    connectsFloorLevelDelta: 0,
    connectsToSameCategory: false,
    cost: [stone(8), ingot(1)],
    description: "석재 건물용 출입구 프레임입니다.",
  },
  stone_window_part: {
    id: "stone_window_part",
    name: "돌 창문",
    category: "window",
    layer: "wall",
    material: "stone",
    width: 1,
    height: 1,
    floorLevel: 0,
    maxHp: 240,
    blocksMove: true,
    blocksBuild: true,
    canRotate: true,
    requiresFloor: false,
    requiresWall: true,
    requiresSupport: false,
    supportsUpperFloor: false,
    connectsFloorLevelDelta: 0,
    connectsToSameCategory: false,
    cost: [stone(7), ingot(1)],
    description: "석재 벽 자리에 교체 설치하는 창문입니다.",
  },
  stone_stairs_part: {
    id: "stone_stairs_part",
    name: "돌 계단",
    category: "stairs",
    layer: "stairs",
    material: "stone",
    width: 1,
    height: 2,
    floorLevel: 0,
    maxHp: 320,
    blocksMove: false,
    blocksBuild: true,
    canRotate: true,
    requiresFloor: true,
    requiresWall: false,
    requiresSupport: false,
    supportsUpperFloor: true,
    connectsFloorLevelDelta: 1,
    connectsToSameCategory: false,
    cost: [stone(14), ingot(1)],
    description: "튼튼한 2층 연결 계단입니다.",
  },
  cloth_awning_part: {
    id: "cloth_awning_part",
    name: "천막 차양",
    category: "roof",
    layer: "roof",
    material: "cloth",
    width: 1,
    height: 1,
    floorLevel: 1,
    maxHp: 70,
    blocksMove: false,
    blocksBuild: false,
    canRotate: true,
    requiresFloor: false,
    requiresWall: true,
    requiresSupport: false,
    supportsUpperFloor: false,
    connectsFloorLevelDelta: 0,
    connectsToSameCategory: true,
    cost: [fiber(8), wood(2)],
    description: "현관이나 창가에 설치하는 가벼운 차양입니다.",
  },
  small_lamp_post_part: {
    id: "small_lamp_post_part",
    name: "작은 등불 기둥",
    category: "decor",
    layer: "decor",
    material: "metal",
    width: 1,
    height: 1,
    floorLevel: 0,
    maxHp: 80,
    blocksMove: false,
    blocksBuild: true,
    canRotate: false,
    requiresFloor: true,
    requiresWall: false,
    requiresSupport: false,
    supportsUpperFloor: false,
    connectsFloorLevelDelta: 0,
    connectsToSameCategory: false,
    cost: [wood(3), ingot(1), fiber(1)],
    description: "집 주변을 밝히는 장식 조명입니다.",
  },
  wood_sign_part: {
    id: "wood_sign_part",
    name: "나무 표지판",
    category: "decor",
    layer: "decor",
    material: "wood",
    width: 1,
    height: 1,
    floorLevel: 0,
    maxHp: 70,
    blocksMove: false,
    blocksBuild: true,
    canRotate: true,
    requiresFloor: false,
    requiresWall: false,
    requiresSupport: false,
    supportsUpperFloor: false,
    connectsFloorLevelDelta: 0,
    connectsToSameCategory: false,
    cost: [wood(4)],
    description: "거점 이름이나 구역을 표시하는 장식 부품입니다.",
  },
  wood_fence_part: {
    id: "wood_fence_part",
    name: "나무 울타리",
    category: "wall",
    layer: "wall",
    material: "wood",
    width: 1,
    height: 1,
    floorLevel: 0,
    maxHp: 110,
    blocksMove: true,
    blocksBuild: true,
    canRotate: true,
    requiresFloor: false,
    requiresWall: false,
    requiresSupport: false,
    supportsUpperFloor: false,
    connectsFloorLevelDelta: 0,
    connectsToSameCategory: true,
    cost: [wood(4)],
    description: "마당, 밭, 동물 공간을 나누는 낮은 울타리입니다.",
  },
  wood_gate_part: {
    id: "wood_gate_part",
    name: "나무 울타리 문",
    category: "door",
    layer: "wall",
    material: "wood",
    width: 1,
    height: 1,
    floorLevel: 0,
    maxHp: 100,
    blocksMove: false,
    blocksBuild: true,
    canRotate: true,
    requiresFloor: false,
    requiresWall: false,
    requiresSupport: false,
    supportsUpperFloor: false,
    connectsFloorLevelDelta: 0,
    connectsToSameCategory: false,
    cost: [wood(5), fiber(1)],
    description: "울타리 사이에 설치하는 출입문입니다.",
  },
};

export const BUILD_PART_TEST_ITEM_STACKS: ItemStack[] = Object.values(BUILD_PARTS).map((part) => ({ itemId: part.id, amount: part.category === "floor" || part.category === "wall" ? 80 : 30 }));

export function getBuildPart(partId: string | null | undefined) {
  return partId ? BUILD_PARTS[partId as BuildPartId] ?? null : null;
}

export function isBuildPartItemId(itemId: string) {
  return Boolean(getBuildPart(itemId));
}

export function getBuildPartBySourceBuildingType(buildingType: string) {
  return Object.values(BUILD_PARTS).find((part) => part.sourceBuildingType === buildingType) ?? null;
}

export function getBuildPartsByCategory(category: BuildPartCategory) {
  return Object.values(BUILD_PARTS).filter((part) => part.category === category);
}

export function getBuildPartsByFloorLevel(floorLevel: BuildFloorLevel) {
  return Object.values(BUILD_PARTS).filter((part) => part.floorLevel === floorLevel);
}

export function getStairBuildParts() {
  return Object.values(BUILD_PARTS).filter((part) => part.category === "stairs");
}

export function rotateBuildPart(rotation: BuildPartRotation): BuildPartRotation {
  return ((rotation + 90) % 360) as BuildPartRotation;
}
