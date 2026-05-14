export type PetSpeciesDefinition = {
  speciesId: string;
  name: string;
  description: string;
  baseCaptureDifficulty: number;
  movementType?: "ground" | "flying";
  mountSpeed?: number;
};

export const PET_SPECIES_CATALOG: Record<string, PetSpeciesDefinition> = {
  leafbun: {
    speciesId: "leafbun",
    name: "풀토끼",
    description: "풀숲에서 자주 발견되는 민첩한 초반 펫입니다.",
    baseCaptureDifficulty: 0.85,
    movementType: "ground",
    mountSpeed: 260,
  },
  sparkit: {
    speciesId: "sparkit",
    name: "스파킷",
    description: "전기 기운을 품은 빠른 펫입니다.",
    baseCaptureDifficulty: 0.72,
    movementType: "ground",
    mountSpeed: 275,
  },
  droplet: {
    speciesId: "droplet",
    name: "물방울이",
    description: "물가 근처에서 발견되는 순한 펫입니다.",
    baseCaptureDifficulty: 0.9,
    movementType: "ground",
    mountSpeed: 245,
  },
  breezewing: {
    speciesId: "breezewing",
    name: "브리즈윙",
    description: "바람을 타고 공중을 떠다니는 비행형 펫입니다. 탑승 시 매우 빠르게 이동합니다.",
    baseCaptureDifficulty: 0.58,
    movementType: "flying",
    mountSpeed: 340,
  },
  moleminer: {
    speciesId: "moleminer",
    name: "두더광부",
    description: "광석을 좋아하는 땅속성 작업형 펫입니다.",
    baseCaptureDifficulty: 0.68,
    movementType: "ground",
    mountSpeed: 235,
  },
  mossboar: {
    speciesId: "mossboar",
    name: "이끼멧돼지",
    description: "체력이 높은 야생 멧돼지형 펫입니다.",
    baseCaptureDifficulty: 0.62,
    movementType: "ground",
    mountSpeed: 255,
  },
  rockturtle: {
    speciesId: "rockturtle",
    name: "바위거북",
    description: "단단한 등껍질을 가진 방어형 펫입니다.",
    baseCaptureDifficulty: 0.55,
    movementType: "ground",
    mountSpeed: 220,
  },
};

export function getPetSpeciesDefinition(speciesId: string): PetSpeciesDefinition {
  return PET_SPECIES_CATALOG[speciesId] ?? {
    speciesId,
    name: speciesId,
    description: "아직 도감 정보가 등록되지 않은 펫입니다.",
    baseCaptureDifficulty: 0.65,
    movementType: "ground",
    mountSpeed: 250,
  };
}

export function isFlyingPetSpecies(speciesId: string) {
  return getPetSpeciesDefinition(speciesId).movementType === "flying";
}
