const fs = require("fs");
const path = require("path");

const target = path.join(__dirname, "..", "src", "features", "buildings", "buildProjection2p5d.ts");
let source = fs.readFileSync(target, "utf8");
let changed = false;

function replaceRegex(regex, replacement, label) {
  if (source.includes(replacement)) {
    console.log(`[patch-iso-build-world-anchor] already-patched ${label}`);
    return;
  }
  if (!regex.test(source)) {
    console.log(`[patch-iso-build-world-anchor] skipped ${label}`);
    return;
  }
  source = source.replace(regex, replacement);
  changed = true;
  console.log(`[patch-iso-build-world-anchor] patched ${label}`);
}

if (!source.includes("BUILD_ISO_WORLD_ORIGIN_X")) {
  source = source.replace(
    'import { BUILD_GRID_SIZE } from "./buildGrid";',
    'import { BUILD_GRID_SIZE, BUILD_ISO_WORLD_ORIGIN_X, BUILD_ISO_WORLD_ORIGIN_Y } from "./buildGrid";',
  );
  changed = true;
  console.log("[patch-iso-build-world-anchor] patched buildGrid origin import");
}

replaceRegex(
  /export function buildGridToIsoCenter\(gridX: number, gridY: number\): IsoPoint \{[\s\S]*?\n\}/,
  `export function buildGridToIsoCenter(gridX: number, gridY: number): IsoPoint {
  return {
    x: BUILD_ISO_WORLD_ORIGIN_X + (gridX - gridY) * (ISO_TILE_WIDTH / 2),
    y: BUILD_ISO_WORLD_ORIGIN_Y + (gridX + gridY) * (ISO_TILE_HEIGHT / 2),
  };
}`,
  "iso world anchored build center",
);

replaceRegex(
  /export function worldCameraToIsoBuildCamera\([\s\S]*?\n\): IsoPoint \{[\s\S]*?\n\}/,
  `export function worldCameraToIsoBuildCamera(
  worldCamX: number,
  worldCamY: number,
  _viewWidth: number,
  _viewHeight: number,
): IsoPoint {
  return { x: worldCamX, y: worldCamY };
}`,
  "normal world camera for build parts",
);

replaceRegex(
  /export function screenToIsoBuildGrid\([\s\S]*?\n\): \{ gridX: number; gridY: number \} \{[\s\S]*?\n\}/,
  `export function screenToIsoBuildGrid(
  screenX: number,
  screenY: number,
  isoCamX: number,
  isoCamY: number,
): { gridX: number; gridY: number } {
  const isoX = screenX + isoCamX - BUILD_ISO_WORLD_ORIGIN_X;
  const isoY = screenY + isoCamY - BUILD_ISO_WORLD_ORIGIN_Y;
  const halfW = ISO_TILE_WIDTH / 2;
  const halfH = ISO_TILE_HEIGHT / 2;
  return {
    gridX: Math.round(isoX / (2 * halfW) + isoY / (2 * halfH)),
    gridY: Math.round(-isoX / (2 * halfW) + isoY / (2 * halfH)),
  };
}`,
  "screen to anchored iso build grid",
);

if (changed) fs.writeFileSync(target, source);
