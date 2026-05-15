import type { BuildingState, ItemStack } from "@palpalworld/shared";
import { getProgressionBuilding } from "../crafting/progressionCatalog";

export type SharedBuildingState = BuildingState & {
  ownerNickname?: string;
  isRemoteSharedBuilding?: boolean;
};

export function getCurrentMultiplayerPlayerIdForBuildingUi() {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem("palpalworld.multiplayer.sessionPlayerId")
    ?? window.localStorage.getItem("palpalworld.multiplayer.playerId");
}

export function canDismantleBuilding(building: BuildingState) {
  const sharedBuilding = building as SharedBuildingState;
  if (sharedBuilding.isRemoteSharedBuilding) return false;

  const ownerPlayerId = building.ownerPlayerId;
  if (!ownerPlayerId || ownerPlayerId === "demo-player") return true;

  const localMultiplayerPlayerId = getCurrentMultiplayerPlayerIdForBuildingUi();
  return Boolean(localMultiplayerPlayerId && ownerPlayerId === localMultiplayerPlayerId);
}

export function getDismantleRefunds(buildingType: string): ItemStack[] {
  const definition = getProgressionBuilding(buildingType);
  if (!definition) return [];

  return definition.requires
    .map((item) => ({ itemId: item.itemId, amount: Math.max(1, Math.floor(item.amount / 2)) }))
    .filter((item) => item.amount > 0);
}
