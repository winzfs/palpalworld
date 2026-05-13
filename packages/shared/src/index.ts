export type EntityId = string;
export type PlayerId = string;
export type WorldId = string;
export type RegionId = "starter_meadow" | "moss_forest" | "stone_hills" | "ember_desert" | "frost_peaks";
export type ItemInstanceId = string;

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
export type ItemCategory = "resource" | "tool" | "consumable" | "capture" | "material" | "building" | "equipment" | "weapon" | "mount_gear";
export type ItemId = string;
export type BuildingType = "base_core" | "storage_box" | "workbench" | "pal_bed" | "farm_plot" | "furnace" | "campfire" | "wood_wall" | "wood_floor";
export type MountType = "ground" | "flying" | "swimming";
export type TraitRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";
export type TraitTarget = "creature" | "weapon" | "player" | "base";
export type TraitEffectType =
  | "attack_multiplier"
  | "defense_multiplier"
  | "max_hp_multiplier"
  | "move_speed_multiplier"
  | "work_speed_multiplier"
  | "capture_bonus"
  | "stamina_multiplier"
  | "element_damage_bonus";
export type EquipmentSlot = "weapon" | "head" | "body" | "hands" | "feet" | "accessory1" | "accessory2" | "mountGear";
export type StatId = "maxHp" | "attack" | "defense" | "moveSpeed" | "stamina" | "capturePower" | "workCommandPower";

export type TraitEffect = {
  type: TraitEffectType;
  value: number;
  element?: ElementType;
  workSkill?: WorkSkill;
};

export type TraitDefinition = {
  id: string;
  name: string;
  target: TraitTarget;
  rarity: TraitRarity;
  effects: readonly TraitEffect[];
  description: string;
};

export type MountDefinition = {
  speciesId: string;
  mountType: MountType;
  requiredGearItemId?: ItemId;
  moveSpeedMultiplier: number;
  staminaSeconds: number;
  unlockLevel: number;
};

export type ItemDefinition = {
  id: ItemId;
  name: string;
  category: ItemCategory;
  maxStack: number;
  description?: string;
};

export type EquippableItemDefinition = ItemDefinition & {
  category: "equipment" | "weapon" | "mount_gear";
  slot: EquipmentSlot;
  statBonuses: Partial<Record<StatId, number>>;
  traitPool?: readonly string[];
};

export type ItemStack = {
  itemId: ItemId;
  amount: number;
};

export type ItemInstance = {
  instanceId: ItemInstanceId;
  itemId: ItemId;
  ownerPlayerId: PlayerId;
  level: number;
  durability?: number;
  traitIds: string[];
  locked: boolean;
};

export type InventoryState = {
  ownerPlayerId: PlayerId;
  items: ItemStack[];
  itemInstances: ItemInstance[];
};

export type EquipmentState = {
  ownerPlayerId: PlayerId;
  slots: Partial<Record<EquipmentSlot, ItemInstanceId>>;
};

export type PlayerProgressState = {
  playerId: PlayerId;
  level: number;
  exp: number;
  nextExp: number;
  statPoints: number;
};

export type PlayerStats = Record<StatId, number>;

export type PlayerProfileState = {
  playerId: PlayerId;
  progress: PlayerProgressState;
  stats: PlayerStats;
  equipment: EquipmentState;
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
  traitPool: readonly string[];
  mount?: MountDefinition;
  drops: readonly LootEntry[];
};

export type CreatureSpawnDefinition = {
  id: EntityId;
  speciesId: string;
  regionId: RegionId;
  position: Vector2;
  level: number;
  respawnMs: number;
  traitIds?: readonly string[];
};

export type RegionDefinition = {
  id: RegionId;
  name: string;
  recommendedLevel: readonly [number, number];
  resourceTypes: readonly ResourceType[];
  creatureSpeciesIds: readonly string[];
  description: string;
};

export type ResourceDefinition = {
  type: ResourceType;
  name: string;
  baseAmount: number;
  respawnMs: number;
  harvestTool?: "axe" | "pickaxe" | "sickle";
  drops: readonly LootEntry[];
};

export type CraftingRecipe = {
  id: string;
  name: string;
  station: "hand" | "workbench" | "furnace" | "campfire";
  inputs: readonly ItemStack[];
  outputs: readonly ItemStack[];
  craftTimeMs: number;
};

export type BuildingDefinition = {
  type: BuildingType;
  name: string;
  size: { width: number; height: number };
  maxHp: number;
  requires: readonly ItemStack[];
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
  mountedCreatureId?: EntityId;
};

export type OwnedCreatureState = {
  id: EntityId;
  speciesId: string;
  ownerPlayerId: PlayerId;
  nickname?: string;
  level: number;
  traitIds: string[];
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  isMounted: boolean;
};

export type CreaturePublicState = {
  id: EntityId;
  speciesId: string;
  regionId: RegionId;
  position: Vector2;
  level: number;
  hp: number;
  maxHp: number;
  traitIds: string[];
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
  "client:equip_item": (payload: { itemInstanceId: ItemInstanceId }) => void;
  "client:unequip_item": (payload: { slot: EquipmentSlot }) => void;
  "client:use_item": (payload: { itemId: string; targetEntityId?: EntityId; targetPosition?: Vector2 }) => void;
  "client:place_building": (payload: { buildingType: BuildingType; position: Vector2; itemId?: ItemId }) => void;
  "client:try_capture": (payload: { creatureId: EntityId; orbItemId: ItemId }) => void;
  "client:mount_creature": (payload: { ownedCreatureId: EntityId }) => void;
  "client:dismount_creature": () => void;
};

export type ServerToClientEvents = {
  "server:world_snapshot": (payload: WorldSnapshot) => void;
  "server:inventory_updated": (payload: InventoryState) => void;
  "server:equipment_updated": (payload: EquipmentState) => void;
  "server:player_profile_updated": (payload: PlayerProfileState) => void;
  "server:owned_creatures_updated": (payload: { ownerPlayerId: PlayerId; creatures: OwnedCreatureState[] }) => void;
  "server:entity_spawned": (payload: CreaturePublicState | ResourceNodeState | BuildingState) => void;
  "server:entity_updated": (payload: Partial<CreaturePublicState | ResourceNodeState | BuildingState | PlayerPublicState> & { id: EntityId }) => void;
  "server:entity_removed": (payload: { id: EntityId }) => void;
  "server:chat_message": (payload: { playerId: PlayerId; nickname: string; message: string; sentAt: number }) => void;
  "server:toast": (payload: { type: "info" | "success" | "warning" | "error"; message: string }) => void;
};

export const PLAYER_BASE_STATS: PlayerStats = {
  maxHp: 100,
  attack: 14,
  defense: 5,
  moveSpeed: 180,
  stamina: 100,
  capturePower: 1,
  workCommandPower: 1,
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
