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

// Stable mode: build storage/placement stays in the normal world grid. The part
// renderer still draws diamond/isometric shapes at that world-grid center. This
// avoids remote installs caused by saving screen-to-iso lattice coordinates that
// are unrelated to the clicked world position.
replaceRegex(
  /export function buildGridToIsoCenter\(gridX: number, gridY: number\): IsoPoint \{[\s\S]*?\n\}/,
  `export function buildGridToIsoCenter(gridX: number, gridY: number): IsoPoint {
  return { x: gridX * BUILD_GRID_SIZE, y: gridY * BUILD_GRID_SIZE };
}`,
  "normal world grid build center",
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
  return {
    gridX: Math.round((screenX + isoCamX) / BUILD_GRID_SIZE),
    gridY: Math.round((screenY + isoCamY) / BUILD_GRID_SIZE),
  };
}`,
  "screen to normal build grid",
);

if (changed) fs.writeFileSync(target, source);
