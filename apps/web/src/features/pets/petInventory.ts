import { getPetSpeciesDefinition } from "./petCatalog";

const petItemPrefix = "pet_";

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
  return `${getPetSpeciesDefinition(species).name}`;
}

export function getPetItemDescription(itemId: string) {
  const species = getSpeciesIdFromPetItemId(itemId);
  return getPetSpeciesDefinition(species).description;
}
