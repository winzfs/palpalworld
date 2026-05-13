export type AssetKey = string;
export type SpriteDirection = "down" | "up" | "left" | "right";
export type SpriteAnimationId = "idle" | "walk" | "run" | "attack" | "hurt" | "death";

export type SpriteAsset = {
  key: AssetKey;
  src: string;
  width: number;
  height: number;
  frameCount?: number;
};

export type SpriteSheetAsset = {
  key: AssetKey;
  src: string;
  frameWidth: number;
  frameHeight: number;
  columns: number;
  rows: number;
  frameCount: number;
  rowByDirection: Record<SpriteDirection, number>;
  frameDurationMs: number;
};

export type DirectionalSpriteSheetSet = Partial<Record<SpriteAnimationId, SpriteSheetAsset>>;

export type PlayerSpriteSet = {
  default: DirectionalSpriteSheetSet;
};

export type CreatureSpriteSet = {
  idle: {
    down: SpriteAsset;
    up?: SpriteAsset;
    left?: SpriteAsset;
    right?: SpriteAsset;
  };
};

export type ResourceSpriteSet = {
  idle: SpriteAsset;
  depleted?: SpriteAsset;
};

export type BuildingSpriteSet = {
  idle: SpriteAsset;
};

export type TileSetAsset = {
  key: AssetKey;
  src: string;
  tileWidth: number;
  tileHeight: number;
  columns: number;
  rows: number;
  tileIds: Record<string, number>;
};

export type TerrainTileId = "grass" | "grass_dark" | "grass_light" | "dirt" | "flower" | "water";

export type AssetCatalog = {
  player: PlayerSpriteSet;
  creatures: Record<string, CreatureSpriteSet>;
  resources: Record<string, ResourceSpriteSet>;
  buildings: Record<string, BuildingSpriteSet>;
  tilesets: Record<string, TileSetAsset>;
  icons: Record<string, SpriteAsset>;
};
