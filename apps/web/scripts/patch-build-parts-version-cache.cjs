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

function sceneOnce(search, replacement, label) {
  if (scene.includes(replacement)) return;
  if (!scene.includes(search)) {
    console.log(`[patch-build-parts-version-cache] skipped scene ${label}`);
    return;
  }
  scene = scene.replace(search, replacement);
  sceneChanged = true;
  console.log(`[patch-build-parts-version-cache] patched scene ${label}`);
}

function sceneReplaceAll(search, replacement, label) {
  if (!scene.includes(search)) {
    console.log(`[patch-build-parts-version-cache] skipped scene ${label}`);
    return;
  }
  scene = scene.split(search).join(replacement);
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

sceneOnce(
  'function normalizeSnapshotToCurrentTile(snapshot: WorldSnapshot): WorldSnapshot {',
  'function readBuildPartsVersionForScene() {\n  if (typeof window === "undefined") return 0;\n  const raw = window.localStorage.getItem("palpalworld.demo.buildParts.version");\n  const parsed = raw ? Number(raw) : 0;\n  return Number.isFinite(parsed) ? parsed : 0;\n}\n\nfunction normalizeSnapshotToCurrentTile(snapshot: WorldSnapshot): WorldSnapshot {',
  "local scene version helper",
);

sceneReplaceAll(
  'const __cacheKey = sourceParts.length + ":" + sourceParts.map((part) => [part.id, part.partId, part.gridX, part.gridY, part.rotation, part.floorLevel, part.isOpen === true ? 1 : 0].join("/")).join("|");',
  'const __cacheKey = String(readBuildPartsVersionForScene()) + ":" + sourceParts.length;',
  "replace heavy cache key",
);

sceneReplaceAll(
  'const __cacheKey = String(getBuildPartsVersion()) + ":" + sourceParts.length;',
  'const __cacheKey = String(readBuildPartsVersionForScene()) + ":" + sourceParts.length;',
  "replace imported version key",
);

if (storeChanged) fs.writeFileSync(storePath, store);
if (sceneChanged) fs.writeFileSync(scenePath, scene);
