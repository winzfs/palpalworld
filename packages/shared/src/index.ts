export type EntityId = string;
export type PlayerId = string;
export type WorldId = string;

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
  position: Vector2;
  hp: number;
  maxHp: number;
  ownerPlayerId?: PlayerId;
};

export type ResourceNodeState = {
  id: EntityId;
  resourceType: "wood" | "stone" | "fiber" | "ore" | "berry";
  position: Vector2;
  remainingAmount: number;
};

export type WorldSnapshot = {
  worldId: WorldId;
  serverTime: number;
  players: PlayerPublicState[];
  creatures: CreaturePublicState[];
  resources: ResourceNodeState[];
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
  "client:use_item": (payload: { itemId: string; targetEntityId?: EntityId; targetPosition?: Vector2 }) => void;
  "client:place_building": (payload: { buildingType: string; position: Vector2 }) => void;
};

export type ServerToClientEvents = {
  "server:world_snapshot": (payload: WorldSnapshot) => void;
  "server:entity_spawned": (payload: CreaturePublicState | ResourceNodeState) => void;
  "server:entity_updated": (payload: Partial<CreaturePublicState | ResourceNodeState> & { id: EntityId }) => void;
  "server:entity_removed": (payload: { id: EntityId }) => void;
  "server:chat_message": (payload: { playerId: PlayerId; nickname: string; message: string; sentAt: number }) => void;
  "server:toast": (payload: { type: "info" | "success" | "warning" | "error"; message: string }) => void;
};

export const WORLD = {
  tileSize: 32,
  defaultWorldId: "starter-island",
  snapshotRateMs: 100,
  playerMoveSpeed: 180,
} as const;
