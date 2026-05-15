import type { ItemStack } from "@palpalworld/shared";

export type BuildPartCategory = "floor" | "wall" | "door" | "window" | "roof" | "furniture" | "utility";
export type BuildPartLayer = "floor" | "wall" | "object" | "roof";
export type BuildPartRotation = 0 | 90 | 180 | 270;
export type BuildPartId =
  | "wood_floor_part"
  | "wood_wall_part"
  | "wood_door_part"
  | "wood_window_part"
  | "wood_corner_post_part"
  | "wood_roof_edge_part";

export type BuildPartDefinition = {
  id: BuildPartId;
  sourceBuildingType?: string;
  name: string;
  category: BuildPartCategory;
  layer: BuildPartLayer;
  width: number;
  height: number;
  maxHp: number;
  blocksMove: boolean;
  blocksBuild: boolean;
  canRotate: boolean;
  requiresFloor: boolean;
  requiresWall: boolean;
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
  rotation: BuildPartRotation;
  hp: number;
  maxHp: number;
  createdAt: number;
  updatedAt: number;
};

export const BUILD_PARTS: Record<BuildPartId, BuildPartDefinition> = {
  wood_floor_part: {
    id: "wood_floor_part",
    sourceBuildingType: "wood_floor",
    name: "나무 바닥 부품",
    category: "floor",
    layer: "floor",
    width: 1,
    height: 1,
    maxHp: 120,
    blocksMove: false,
    blocksBuild: false,
    canRotate: false,
    requiresFloor: false,
    requiresWall: false,
    connectsToSameCategory: true,
    cost: [{ itemId: "wood", amount: 4 }],
    description: "집의 기준이 되는 1칸 바닥입니다. 가구와 벽을 깔끔하게 정렬하는 기반입니다.",
  },
  wood_wall_part: {
    id: "wood_wall_part",
    sourceBuildingType: "wood_wall",
    name: "나무 벽 부품",
    category: "wall",
    layer: "wall",
    width: 1,
    height: 1,
    maxHp: 180,
    blocksMove: true,
    blocksBuild: true,
    canRotate: true,
    requiresFloor: false,
    requiresWall: false,
    connectsToSameCategory: true,
    cost: [{ itemId: "wood", amount: 6 }],
    description: "주변 벽과 자동 연결되는 기본 벽입니다.",
  },
  wood_door_part: {
    id: "wood_door_part",
    name: "나무 문 부품",
    category: "door",
    layer: "wall",
    width: 1,
    height: 1,
    maxHp: 160,
    blocksMove: false,
    blocksBuild: true,
    canRotate: true,
    requiresFloor: false,
    requiresWall: true,
    connectsToSameCategory: false,
    cost: [{ itemId: "wood", amount: 8 }, { itemId: "fiber", amount: 2 }],
    description: "벽 자리에 교체 설치하는 출입구입니다.",
  },
  wood_window_part: {
    id: "wood_window_part",
    name: "나무 창문 부품",
    category: "window",
    layer: "wall",
    width: 1,
    height: 1,
    maxHp: 120,
    blocksMove: true,
    blocksBuild: true,
    canRotate: true,
    requiresFloor: false,
    requiresWall: true,
    connectsToSameCategory: false,
    cost: [{ itemId: "wood", amount: 6 }, { itemId: "stone", amount: 2 }],
    description: "벽 자리에 교체 설치하는 창문입니다. 내부/외부 느낌을 살리는 장식 부품입니다.",
  },
  wood_corner_post_part: {
    id: "wood_corner_post_part",
    name: "나무 기둥 부품",
    category: "wall",
    layer: "wall",
    width: 1,
    height: 1,
    maxHp: 220,
    blocksMove: true,
    blocksBuild: true,
    canRotate: false,
    requiresFloor: false,
    requiresWall: false,
    connectsToSameCategory: true,
    cost: [{ itemId: "wood", amount: 10 }],
    description: "모서리와 입구를 강조하는 구조 기둥입니다.",
  },
  wood_roof_edge_part: {
    id: "wood_roof_edge_part",
    name: "나무 지붕 테두리",
    category: "roof",
    layer: "roof",
    width: 1,
    height: 1,
    maxHp: 100,
    blocksMove: false,
    blocksBuild: false,
    canRotate: true,
    requiresFloor: false,
    requiresWall: true,
    connectsToSameCategory: true,
    cost: [{ itemId: "wood", amount: 5 }, { itemId: "fiber", amount: 2 }],
    description: "실내감을 만들기 위한 상단 장식 부품입니다. 초반에는 시각 효과 중심으로 사용합니다.",
  },
};

export function getBuildPart(partId: string | null | undefined) {
  return partId ? BUILD_PARTS[partId as BuildPartId] ?? null : null;
}

export function getBuildPartBySourceBuildingType(buildingType: string) {
  return Object.values(BUILD_PARTS).find((part) => part.sourceBuildingType === buildingType) ?? null;
}

export function getBuildPartsByCategory(category: BuildPartCategory) {
  return Object.values(BUILD_PARTS).filter((part) => part.category === category);
}

export function rotateBuildPart(rotation: BuildPartRotation): BuildPartRotation {
  return ((rotation + 90) % 360) as BuildPartRotation;
}
