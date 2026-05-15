const fs = require("fs");
const path = require("path");

const target = path.join(__dirname, "..", "src", "features", "buildings", "buildPartCatalog.ts");
let source = fs.readFileSync(target, "utf8");
let changed = false;

const helperBlock = `
export function isBuildPartItemId(itemId: string): itemId is BuildPartId {
  return Object.prototype.hasOwnProperty.call(BUILD_PARTS, itemId);
}

export function getBuildPart(itemId: string): BuildPartDefinition | null {
  return isBuildPartItemId(itemId) ? BUILD_PARTS[itemId] : null;
}
`;

if (!source.includes("export function isBuildPartItemId")) {
  source = `${source.trimEnd()}\n${helperBlock}\n`;
  changed = true;
  console.log("[patch-build-part-catalog-helpers] patched helpers");
} else {
  console.log("[patch-build-part-catalog-helpers] helpers already present");
}

if (changed) fs.writeFileSync(target, source);
