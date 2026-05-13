import type { AssetCatalog } from "./assetTypes";

export const assetCatalog: AssetCatalog = {
  creatures: {},
  resources: {},
  buildings: {},
  icons: {},
};

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
