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

const anchorConstants = `
// Build part isometric visuals still live in normal world/camera space.
// This anchor keeps the diamond lattice fixed in the world instead of behaving
// like a HUD layer that follows the player camera.
export const BUILD_ISO_WORLD_ORIGIN_X = 1500;
export const BUILD_ISO_WORLD_ORIGIN_Y = 620;
`;

if (!source.includes("BUILD_ISO_WORLD_ORIGIN_X")) {
  source = source.replace("export const ISO_ROOF_RISE = 34;\n", `export const ISO_ROOF_RISE = 34;\n${anchorConstants}`);
  changed = true;
  console.log("[patch-iso-build-world-anchor] patched anchor constants");
}

replaceRegex(
  /export function buildGridToIsoCenter\(gridX: number, gridY: number\): IsoPoint \{\n  return \{\n    x: \(gridX - gridY\) \* \(ISO_TILE_WIDTH \/ 2\),\n    y: \(gridX \+ gridY\) \* \(ISO_TILE_HEIGHT \/ 2\),\n  \};\n\}/,
  `export function buildGridToIsoCenter(gridX: number, gridY: number): IsoPoint {
  return {
    x: BUILD_ISO_WORLD_ORIGIN_X + (gridX - gridY) * (ISO_TILE_WIDTH / 2),
    y: BUILD_ISO_WORLD_ORIGIN_Y + (gridX + gridY) * (ISO_TILE_HEIGHT / 2),
  };
}`,
  "world anchored buildGridToIsoCenter",
);

replaceRegex(
  /export function worldCameraToIsoBuildCamera\(\n  worldCamX: number,\n  worldCamY: number,\n  viewWidth: number,\n  viewHeight: number,\n\): IsoPoint \{\n  const px = worldCamX \+ viewWidth \/ 2;\n  const py = worldCamY \+ viewHeight \/ 2;\n  const playerIsoX = \(px - py\) \/ 2;\n  const playerIsoY = \(px \+ py\) \* ISO_TILE_HEIGHT \/ \(2 \* BUILD_GRID_SIZE\);\n  return \{ x: playerIsoX - viewWidth \/ 2, y: playerIsoY - viewHeight \/ 2 \};\n\}/,
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
  /  const isoX = screenX \+ isoCamX;\n  const isoY = screenY \+ isoCamY;/,
  `  const isoX = screenX + isoCamX - BUILD_ISO_WORLD_ORIGIN_X;
  const isoY = screenY + isoCamY - BUILD_ISO_WORLD_ORIGIN_Y;`,
  "screen to anchored iso grid",
);

if (changed) fs.writeFileSync(target, source);
