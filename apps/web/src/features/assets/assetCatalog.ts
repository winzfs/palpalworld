import type { AssetCatalog, DirectionalSpriteSheetSet } from "./assetTypes";

const playerDefaultSheets: DirectionalSpriteSheetSet = {
  idle: {
    key: "player.default.idle.unarmed.with_shadow",
    src: "/assets/sprites/player/default/Unarmed_Idle_with_shadow.png",
    frameWidth: 64,
    frameHeight: 64,
    columns: 12,
    rows: 4,
    frameCount: 12,
    rowByDirection: { down: 0, left: 1, right: 2, up: 3 },
    frameDurationMs: 150,
  },
  walk: {
    key: "player.default.run.unarmed.with_shadow",
    src: "/assets/sprites/player/default/Unarmed_Run_with_shadow.png",
    frameWidth: 64,
    frameHeight: 64,
    columns: 8,
    rows: 4,
    frameCount: 8,
    rowByDirection: { down: 0, left: 1, right: 2, up: 3 },
    frameDurationMs: 85,
  },
};

export const assetCatalog: AssetCatalog = {
  player: {
    default: playerDefaultSheets,
  },
  creatures: {},
  resources: {},
  buildings: {},
  icons: {},
};

export function getPlayerSpriteSet() {
  return assetCatalog.player.default;
}

export function getCreatureSpriteSet(speciesId: string) {
  return assetCatalog.creatures[speciesId] ?? null;
}

export function getResourceSpriteSet(resourceType: string) {
  return assetCatalog.resources[resourceType] ?? null;
}

export function getBuildingSpriteSet(buildingType: string) {
  return assetCatalog.buildings[buildingType] ?? null;
}

export function getIconAsset(iconKey: string) {
  return assetCatalog.icons[iconKey] ?? null;
}
