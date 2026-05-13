export type EntityId = string;
export type PlayerId = string;
export type WorldId = string;
export type RegionId = "starter_meadow" | "moss_forest" | "stone_hills" | "ember_desert" | "frost_peaks";

export type Vector2 = {
  x: number;
  y: number;
};

export type Direction = "up" | "down" | "left" | "right";

export type ElementType =
  | "neutral"
  | "fire"
  | "water"
  | "grass"
  | "electric"
  | "ice"
  | "dark";

export type WorkSkill =
  | "logging"
  | "mining"
  | "hauling"
  | "farming"
  | "crafting"
  | "cooking"
  | "generating"
  | "cooling"
  | "defending"
  | "scouting"
  | "healing";

export type CreatureRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";
export type ResourceType = "wood" | "hardwood" | "stone" | "fiber" | "ore" | "berry" | "herb" | "coal" | "ice_crystal" | "ember_shard";
export type ItemCategory = "resource" | "tool" | "consumable" | "capture" | "material" | "building" | "equipment";
export type ItemId = string;
export type BuildingType = "base_core" | "storage_box" | "workbench" | "pal_bed" | "farm_plot" | "furnace" | "campfire" | "wood_wall" | "wood_floor";

export type ItemDefinition = {
  id: ItemId;
  name: string;
  category: ItemCategory;
  maxStack: number;
  description?: string;
};

export type ItemStack = {
  itemId: ItemId;
  amount: number;
};

export type InventoryState = {
  ownerPlayerId: PlayerId;
  items: ItemStack[];
};

export type LootEntry = {
  itemId: ItemId;
  min: number;
  max: number;
  chance: number;
};

export type CreatureSpecies = {
  id: string;
  name: string;
  element: ElementType;
  rarity: CreatureRarity;
  baseHp: number;
  baseAttack: number;
  baseDefense: number;
  baseMoveSpeed: number;
  workSkills: Partial<Record<WorkSkill, number>>;
  drops: LootEntry[];
};

export type CreatureSpawnDefinition = {
  id: EntityId;
  speciesId: string;
  regionId: RegionId;
  position: Vector2;
  level: number;
  respawnMs: number;
};

export type RegionDefinition = {
  id: RegionId;
  name: string;
  recommendedLevel: [number, number];
  resourceTypes: ResourceType[];
  creatureSpeciesIds: string[];
  description: string;
};

export type ResourceDefinition = {
  type: ResourceType;
  name: string;
  baseAmount: number;
  respawnMs: number;
  harvestTool?: "axe" | "pickaxe" | "sickle";
  drops: LootEntry[];
};

export type CraftingRecipe = {
  id: string;
  name: string;
  station: "hand" | "workbench" | "furnace" | "campfire";
  inputs: ItemStack[];
  outputs: ItemStack[];
  craftTimeMs: number;
};

export type BuildingDefinition = {
  type: BuildingType;
  name: string;
  size: { width: number; height: number };
  maxHp: number;
  requires: ItemStack[];
  unlockLevel: number;
  description: string;
};

export type PlayerPublicState = {
  id: PlayerId;
  nickname: string;
  position: Vector2;
  direction: Direction;
  hp: number;
  maxHp: number;
};

export type CreaturePublicState = {
  id: EntityId;
  speciesId: string;
  regionId: RegionId;
  position: Vector2;
  level: number;
  hp: number;
  maxHp: number;
  ownerPlayerId?: PlayerId;
  respawnAt?: number;
};

export type ResourceNodeState = {
  id: EntityId;
  resourceType: ResourceType;
  regionId: RegionId;
  position: Vector2;
  remainingAmount: number;
  maxAmount: number;
  respawnAt?: number;
};

export type BuildingState = {
  id: EntityId;
  type: BuildingType;
  ownerPlayerId: PlayerId;
  position: Vector2;
  hp: number;
  maxHp: number;
};

export type WorldSnapshot = {
  worldId: WorldId;
  serverTime: number;
  players: PlayerPublicState[];
  creatures: CreaturePublicState[];
  resources: ResourceNodeState[];
  buildings: BuildingState[];
};

export type PlayerInputPayload = {
  movement: Vector2;
  aim?: Vector2;
  primaryAction: boolean;
  secondaryAction: boolean;
  sequence: number;
};

export type ClientToServerEvents = {
  "client:join_world": (payload: { nickname: string; worldId?: WorldId }) => void;
  "client:player_input": (payload: PlayerInputPayload) => void;
  "client:chat_message": (payload: { message: string }) => void;
  "client:interact_entity": (payload: { entityId: EntityId }) => void;
  "client:craft_item": (payload: { recipeId: string }) => void;
  "client:use_item": (payload: { itemId: string; targetEntityId?: EntityId; targetPosition?: Vector2 }) => void;
  "client:place_building": (payload: { buildingType: BuildingType; position: Vector2 }) => void;
};

export type ServerToClientEvents = {
  "server:world_snapshot": (payload: WorldSnapshot) => void;
  "server:inventory_updated": (payload: InventoryState) => void;
  "server:entity_spawned": (payload: CreaturePublicState | ResourceNodeState | BuildingState) => void;
  "server:entity_updated": (payload: Partial<CreaturePublicState | ResourceNodeState | BuildingState> & { id: EntityId }) => void;
  "server:entity_removed": (payload: { id: EntityId }) => void;
  "server:chat_message": (payload: { playerId: PlayerId; nickname: string; message: string; sentAt: number }) => void;
  "server:toast": (payload: { type: "info" | "success" | "warning" | "error"; message: string }) => void;
};

export const WORLD = {
  tileSize: 32,
  defaultWorldId: "starter-island",
  snapshotRateMs: 100,
  playerMoveSpeed: 180,
  interactRange: 72,
  buildRange: 160,
  attackRange: 88,
  playerAttackPower: 14,
  playerAttackCooldownMs: 450,
  defaultResourceRespawnMs: 30_000,
} as const;

export * from "./catalog";
