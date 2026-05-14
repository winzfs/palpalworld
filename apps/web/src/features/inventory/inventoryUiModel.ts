import type { InventoryState } from "@palpalworld/shared";
import { getIconAsset } from "../assets/assetCatalog";
import { getProgressionBuildingByItemId, isBuildingItemId } from "../crafting/progressionCatalog";
import { getItemLabel } from "../items/itemLabels";

export type InventoryCategory = "general" | "equipment" | "crafting" | "building";
export type InventoryEntryKind = "stack" | "instance";

export type InventoryEntry = {
  key: string;
  kind: InventoryEntryKind;
  itemId: string;
  instanceId?: string;
  label: string;
  amount?: number;
  detail?: string;
  category: InventoryCategory;
  iconSrc?: string;
  description: string;
  quickSlotEligible: boolean;
  buildingType?: string | null;
};

export const inventoryCategoryLabels: Record<InventoryCategory, string> = {
  general: "일반",
  equipment: "장비",
  crafting: "제작",
  building: "건설",
};

const craftingItemIds = new Set([
  "wood",
  "hardwood",
  "stone",
  "fiber",
  "ore",
  "coal",
  "ice_crystal",
  "ember_shard",
  "spark_core",
  "pal_essence",
  "leaf_pelt",
  "flame_tail",
  "water_jelly",
  "ingot",
  "refined_ingot",
]);

const equipmentItemIds = new Set([
  "basic_axe",
  "basic_pickaxe",
  "basic_sickle",
  "training_sword",
  "iron_sword",
  "explorer_jacket",
  "leather_boots",
  "thermal_jacket",
  "cooling_charm",
  "leafbun_saddle",
  "mossboar_saddle",
  "frosthorn_saddle",
]);

const usableItemIds = new Set([
  "capture_orb",
  "improved_capture_orb",
  "berry",
  "cooked_berry",
  "herb",
  "healing_salve",
]);

export function getInventoryEntryCategory(itemId: string, kind: InventoryEntryKind): InventoryCategory {
  if (kind === "instance" || equipmentItemIds.has(itemId)) return "equipment";
  if (isBuildingItemId(itemId)) return "building";
  if (craftingItemIds.has(itemId)) return "crafting";
  return "general";
}

export function getInventoryItemLabel(itemId: string) {
  const label = getItemLabel(itemId);
  if (label !== itemId) return label;
  const building = getProgressionBuildingByItemId(itemId);
  return building ? `${building.name} 설치 아이템` : itemId;
}

export function getInventoryItemDescription(entry: InventoryEntry) {
  if (entry.category === "building") return "필드에 배치할 수 있는 건설 아이템입니다. 선택하면 배치 모드로 전환됩니다.";
  if (entry.category === "equipment") return "장착하거나 퀵슬롯에 등록해 빠르게 사용할 수 있는 장비입니다.";
  if (entry.category === "crafting") return "제작과 건설에 사용되는 재료입니다.";
  if (usableItemIds.has(entry.itemId)) return "퀵슬롯에 등록해 빠르게 사용할 수 있는 소비/사용 아이템입니다.";
  return "가방에 보관된 일반 아이템입니다.";
}

export function isQuickSlotEligible(itemId: string, category: InventoryCategory) {
  return category === "equipment" || usableItemIds.has(itemId);
}

export function buildInventoryEntries(inventory: InventoryState | null): InventoryEntry[] {
  const stackEntries: InventoryEntry[] = (inventory?.items ?? []).map((item) => {
    const category = getInventoryEntryCategory(item.itemId, "stack");
    const icon = getIconAsset(item.itemId);
    const building = getProgressionBuildingByItemId(item.itemId);
    const entry: InventoryEntry = {
      key: `stack:${item.itemId}`,
      kind: "stack",
      itemId: item.itemId,
      label: getInventoryItemLabel(item.itemId),
      amount: item.amount,
      category,
      iconSrc: icon?.src,
      description: "",
      quickSlotEligible: isQuickSlotEligible(item.itemId, category),
      buildingType: building?.type ?? null,
    };
    return { ...entry, description: getInventoryItemDescription(entry) };
  });

  const instanceEntries: InventoryEntry[] = (inventory?.itemInstances ?? []).map((item) => {
    const category = getInventoryEntryCategory(item.itemId, "instance");
    const icon = getIconAsset(item.itemId);
    const entry: InventoryEntry = {
      key: `instance:${item.instanceId}`,
      kind: "instance",
      itemId: item.itemId,
      instanceId: item.instanceId,
      label: getInventoryItemLabel(item.itemId),
      detail: `Lv.${item.level}`,
      category,
      iconSrc: icon?.src,
      description: "",
      quickSlotEligible: true,
    };
    return { ...entry, description: getInventoryItemDescription(entry) };
  });

  return [...stackEntries, ...instanceEntries];
}

export function findInventoryEntryByKey(inventory: InventoryState | null, key: string | null | undefined) {
  if (!key) return null;
  return buildInventoryEntries(inventory).find((entry) => entry.key === key) ?? null;
}
