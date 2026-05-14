import { getPetSpeciesDefinition } from "./petCatalog";

const petItemPrefix = "pet_";

const petEmojiBySpeciesId: Record<string, string> = {
  leafbun: "🐰",
  sparkit: "⚡",
  droplet: "💧",
  moleminer: "⛏️",
  mossboar: "🐗",
  rockturtle: "🐢",
};

export function createPetItemId(speciesId: string) {
  return `${petItemPrefix}${speciesId}`;
}

export function isPetItemId(itemId: string) {
  return itemId.startsWith(petItemPrefix);
}

export function getSpeciesIdFromPetItemId(itemId: string) {
  return isPetItemId(itemId) ? itemId.slice(petItemPrefix.length) : itemId;
}

export function getPetItemLabel(itemId: string) {
  const species = getSpeciesIdFromPetItemId(itemId);
  return getPetSpeciesDefinition(species).name;
}

export function getPetItemDescription(itemId: string) {
  const species = getSpeciesIdFromPetItemId(itemId);
  return `${getPetSpeciesDefinition(species).description} 방생하거나 탈것으로 사용할 수 있습니다.`;
}

export function getPetItemEmoji(itemId: string) {
  const species = getSpeciesIdFromPetItemId(itemId);
  return petEmojiBySpeciesId[species] ?? "🐾";
}
