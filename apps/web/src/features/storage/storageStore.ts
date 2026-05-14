import type { BuildingState, ItemStack } from "@palpalworld/shared";

const storageRootKey = "palpalworld.demo.storageBoxes";

type StorageBoxState = Record<string, ItemStack[]>;

function cloneStacks(stacks: ItemStack[]) {
  return stacks.map((stack) => ({ itemId: stack.itemId, amount: stack.amount })).filter((stack) => stack.amount > 0);
}

function readAllStorage(): StorageBoxState {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(storageRootKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as StorageBoxState;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    return {};
  }
}

function writeAllStorage(state: StorageBoxState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageRootKey, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent("palpalworld:storage-changed", { detail: { state } }));
}

export function getStorageBoxKey(building: BuildingState | null) {
  if (!building) return "unknown-storage";
  return building.id || `${building.type}:${Math.round(building.position.x)}:${Math.round(building.position.y)}`;
}

export function readStorageBoxItems(building: BuildingState | null): ItemStack[] {
  const key = getStorageBoxKey(building);
  return cloneStacks(readAllStorage()[key] ?? []);
}

export function writeStorageBoxItems(building: BuildingState | null, items: ItemStack[]) {
  const key = getStorageBoxKey(building);
  const state = readAllStorage();
  state[key] = cloneStacks(items);
  writeAllStorage(state);
}

export function addStorageStack(items: ItemStack[], itemId: string, amount: number) {
  if (amount <= 0) return cloneStacks(items);
  const next = cloneStacks(items);
  const existing = next.find((stack) => stack.itemId === itemId);
  if (existing) existing.amount += amount;
  else next.push({ itemId, amount });
  return cloneStacks(next);
}

export function removeStorageStack(items: ItemStack[], itemId: string, amount: number) {
  if (amount <= 0) return cloneStacks(items);
  return cloneStacks(items.map((stack) => stack.itemId === itemId ? { ...stack, amount: Math.max(0, stack.amount - amount) } : stack));
}
