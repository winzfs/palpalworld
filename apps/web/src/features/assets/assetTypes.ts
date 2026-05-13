export type AssetKey = string;

export type SpriteAsset = {
  key: AssetKey;
  src: string;
  width: number;
  height: number;
  frameCount?: number;
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

export type AssetCatalog = {
  creatures: Record<string, CreatureSpriteSet>;
  resources: Record<string, ResourceSpriteSet>;
  buildings: Record<string, BuildingSpriteSet>;
  icons: Record<string, SpriteAsset>;
};
