import type { InventoryState } from "@palpalworld/shared";
import { getIconAsset } from "../assets/assetCatalog";
import { getBuildPart, isBuildPartItemId } from "../buildings/buildPartCatalog";
import { getProgressionBuildingByItemId, isBuildingItemId } from "../crafting/progressionCatalog";
import { getItemLabel } from "../items/itemLabels";
import { getPetItemDescription, getPetItemEmoji, getPetItemLabel, isPetItemId } from "../pets/petInventory";

export type InventoryCategory = "general" | "usable" | "material" | "equipment" | "building" | "pet";
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
  iconText?: string;
  description: string;
  quickSlotEligible: boolean;
  buildingType?: string | null;
  buildPartId?: string | null;
};

export const inventoryCategoryLabels: Record<InventoryCategory, string> = {
  general: "일반",
  usable: "사용",
  material: "재료",
  equipment: "장비",
  building: "건설",
  pet: "펫",
};

const materialItemIds = new Set([
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
  if (isPetItemId(itemId)) return "pet";
  if (kind === "instance" || equipmentItemIds.has(itemId)) return "equipment";
  if (isBuildingItemId(itemId) || isBuildPartItemId(itemId)) return "building";
  if (usableItemIds.has(itemId)) return "usable";
  if (materialItemIds.has(itemId)) return "material";
  return "general";
}

export function getInventoryItemLabel(itemId: string) {
  if (isPetItemId(itemId)) return getPetItemLabel(itemId);
  const label = getItemLabel(itemId);
  if (label !== itemId) return label;
  const buildPart = getBuildPart(itemId);
  if (buildPart) return buildPart.name;
  const building = getProgressionBuildingByItemId(itemId);
  return building ? `${building.name} 설치 아이템` : itemId;
}

export function getInventoryItemDescription(entry: InventoryEntry) {
  if (entry.category === "pet") return getPetItemDescription(entry.itemId);
  if (entry.buildPartId) return "집을 조립하는 건축 부품입니다. 건설 모드에서 선택하면 그리드에 맞춰 설치됩니다.";
  if (entry.category === "building") return "필드에 배치할 수 있는 건설 아이템입니다. 선택하면 배치 모드로 전환됩니다.";
  if (entry.category === "equipment") return "장착하거나 퀵슬롯에 등록해 빠르게 사용할 수 있는 장비입니다.";
  if (entry.category === "usable") return "음식, 회복 아이템, 포획구처럼 즉시 사용할 수 있는 아이템입니다. 퀵슬롯에 등록할 수 있습니다.";
  if (entry.category === "material") return "제작과 건설에 사용되는 재료입니다. 직접 사용하지 않고 제작식에서 소모됩니다.";
  return "가방에 보관된 일반 아이템입니다.";
}

export function isQuickSlotEligible(_itemId: string, category: InventoryCategory) {
  return category === "equipment" || category === "usable" || category === "building" || category === "pet";
}

export function buildInventoryEntries(inventory: InventoryState | null): InventoryEntry[] {
  const stackEntries: InventoryEntry[] = (inventory?.items ?? []).map((item) => {
    const category = getInventoryEntryCategory(item.itemId, "stack");
    const icon = getIconAsset(item.itemId);
    const building = getProgressionBuildingByItemId(item.itemId);
    const buildPart = getBuildPart(item.itemId);
    const entry: InventoryEntry = {
      key: `stack:${item.itemId}`,
      kind: "stack",
      itemId: item.itemId,
      label: getInventoryItemLabel(item.itemId),
      amount: item.amount,
      category,
      iconSrc: icon?.src,
      iconText: category === "pet" ? getPetItemEmoji(item.itemId) : undefined,
      description: "",
      quickSlotEligible: isQuickSlotEligible(item.itemId, category),
      buildingType: building?.type ?? null,
      buildPartId: buildPart?.id ?? null,
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
      iconText: category === "pet" ? getPetItemEmoji(item.itemId) : undefined,
      description: "",
      quickSlotEligible: isQuickSlotEligible(item.itemId, category),
    };
    return { ...entry, description: getInventoryItemDescription(entry) };
  });

  return [...stackEntries, ...instanceEntries];
}

export function findInventoryEntryByKey(inventory: InventoryState | null, key: string | null | undefined) {
  if (!key) return null;
  return buildInventoryEntries(inventory).find((entry) => entry.key === key) ?? null;
}
