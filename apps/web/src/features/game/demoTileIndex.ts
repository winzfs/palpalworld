import type { BuildingState, CreaturePublicState, ResourceNodeState } from "@palpalworld/shared";
import { DEFAULT_PLAYER_TILE, isSameTile, type MapTileRef } from "../../../../../packages/shared/src/worldTiles";

export type DemoTileBuckets = {
  resources: ResourceNodeState[];
  creatures: CreaturePublicState[];
  buildings: BuildingState[];
};

export type DemoTileIndex = Map<string, DemoTileBuckets>;

export function tileKey(tile: MapTileRef) {
  return `${tile.regionId}:${tile.tileX}:${tile.tileY}`;
}

export function entityTile(entity: { currentTile?: MapTileRef }) {
  return entity.currentTile ?? DEFAULT_PLAYER_TILE;
}

export function isOnTile(entity: { currentTile?: MapTileRef }, tile: MapTileRef) {
  return isSameTile(entityTile(entity), tile);
}

function ensureBucket(index: DemoTileIndex, tile: MapTileRef) {
  const key = tileKey(tile);
  const existing = index.get(key);
  if (existing) return existing;
  const bucket: DemoTileBuckets = { resources: [], creatures: [], buildings: [] };
  index.set(key, bucket);
  return bucket;
}

export function createDemoTileIndex(resources: ResourceNodeState[], creatures: CreaturePublicState[], buildings: BuildingState[]) {
  const index: DemoTileIndex = new Map();
  for (const resource of resources) ensureBucket(index, entityTile(resource as any)).resources.push(resource);
  for (const creature of creatures) ensureBucket(index, entityTile(creature as any)).creatures.push(creature);
  for (const building of buildings) ensureBucket(index, entityTile(building as any)).buildings.push(building);
  return index;
}

export function getDemoTileBucket(index: DemoTileIndex, tile: MapTileRef) {
  return ensureBucket(index, tile);
}

export function addBuildingToTileIndex(index: DemoTileIndex, building: BuildingState) {
  ensureBucket(index, entityTile(building as any)).buildings.push(building);
}

export function getAliveTileCreatures(index: DemoTileIndex, tile: MapTileRef) {
  return getDemoTileBucket(index, tile).creatures.filter((creature) => creature.hp > 0);
}

export function getAliveTileResources(index: DemoTileIndex, tile: MapTileRef) {
  return getDemoTileBucket(index, tile).resources.filter((resource) => resource.remainingAmount > 0);
}

export function getTileBuildings(index: DemoTileIndex, tile: MapTileRef) {
  return getDemoTileBucket(index, tile).buildings;
}
