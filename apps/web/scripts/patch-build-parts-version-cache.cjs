const fs = require("fs");
const path = require("path");

const storePath = path.join(__dirname, "..", "src", "features", "buildings", "buildPartStore.ts");
const scenePath = path.join(__dirname, "..", "src", "features", "game", "GameScene.tsx");
let store = fs.readFileSync(storePath, "utf8");
let scene = fs.readFileSync(scenePath, "utf8");
let storeChanged = false;
let sceneChanged = false;

function storeOnce(search, replacement, label) {
  if (store.includes(replacement)) return;
  if (!store.includes(search)) {
    console.log(`[patch-build-parts-version-cache] skipped store ${label}`);
    return;
  }
  store = store.replace(search, replacement);
  storeChanged = true;
  console.log(`[patch-build-parts-version-cache] patched store ${label}`);
}

function sceneReplace(search, replacement, label) {
  if (!scene.includes(search)) {
    console.log(`[patch-build-parts-version-cache] skipped scene ${label}`);
    return;
  }
  scene = scene.replace(search, replacement);
  sceneChanged = true;
  console.log(`[patch-build-parts-version-cache] patched scene ${label}`);
}

storeOnce(
  'const buildPartStorageKey = "palpalworld.demo.buildParts";\nlet syncChannel',
  'const buildPartStorageKey = "palpalworld.demo.buildParts";\nconst buildPartVersionStorageKey = "palpalworld.demo.buildParts.version";\nlet buildPartsVersion = 0;\nlet syncChannel',
  "version fields",
);

storeOnce(
  'function clonePart(part: PlacedBuildPart): PlacedBuildPart {\n  return { ...part };\n}',
  'function clonePart(part: PlacedBuildPart): PlacedBuildPart {\n  return { ...part };\n}\n\nexport function getBuildPartsVersion() {\n  if (typeof window === "undefined") return buildPartsVersion;\n  const raw = window.localStorage.getItem(buildPartVersionStorageKey);\n  const parsed = raw ? Number(raw) : buildPartsVersion;\n  if (Number.isFinite(parsed)) buildPartsVersion = Math.max(buildPartsVersion, parsed);\n  return buildPartsVersion;\n}\n\nfunction bumpBuildPartsVersion() {\n  buildPartsVersion += 1;\n  if (typeof window !== "undefined") window.localStorage.setItem(buildPartVersionStorageKey, String(buildPartsVersion));\n  return buildPartsVersion;\n}',
  "version helpers",
);

storeOnce(
  '    window.localStorage.setItem(buildPartStorageKey, JSON.stringify(next));\n    window.dispatchEvent(new CustomEvent("palpalworld:build-parts-changed", { detail: { parts: next } }));',
  '    window.localStorage.setItem(buildPartStorageKey, JSON.stringify(next));\n    const version = bumpBuildPartsVersion();\n    window.dispatchEvent(new CustomEvent("palpalworld:build-parts-changed", { detail: { parts: next, version } }));',
  "event version detail",
);

sceneReplace(
  'import { BUILD_PARTS } from "../buildings/buildPartCatalog";',
  'import { BUILD_PARTS } from "../buildings/buildPartCatalog";\nimport { getBuildPartsVersion } from "../buildings/buildPartStore";',
  "import version helper",
);

sceneReplace(
  'const __cacheKey = sourceParts.length + ":" + sourceParts.map((part) => [part.id, part.partId, part.gridX, part.gridY, part.rotation, part.floorLevel, part.isOpen === true ? 1 : 0].join("/")).join("|");',
  'const __cacheKey = String(getBuildPartsVersion()) + ":" + sourceParts.length;',
  "replace heavy cache key",
);

if (storeChanged) fs.writeFileSync(storePath, store);
if (sceneChanged) fs.writeFileSync(scenePath, scene);
