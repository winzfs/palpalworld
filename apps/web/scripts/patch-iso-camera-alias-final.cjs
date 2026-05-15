const fs = require("fs");
const path = require("path");

const target = path.join(__dirname, "..", "src", "features", "game", "GameScene.tsx");
let source = fs.readFileSync(target, "utf8");
let changed = false;

function replaceOnce(search, replacement, label) {
  if (source.includes(replacement)) {
    console.log(`[patch-iso-camera-alias-final] already-patched ${label}`);
    return;
  }
  if (!source.includes(search)) {
    console.log(`[patch-iso-camera-alias-final] skipped ${label}`);
    return;
  }
  source = source.replace(search, replacement);
  changed = true;
  console.log(`[patch-iso-camera-alias-final] patched ${label}`);
}

// Several late build-mode patches historically used either __isoCam or
// isoCamera. Keep both names available in draw() so generated code cannot crash
// at runtime when one patch uses the other spelling.
replaceOnce(
  "    const __isoCam = worldCameraToIsoBuildCamera(camera.x, camera.y, width, height);\n    this.drawBuildParts(ctx, camera.x, camera.y, viewport, __isoCam.x, __isoCam.y);",
  "    const __isoCam = worldCameraToIsoBuildCamera(camera.x, camera.y, width, height);\n    const isoCamera = __isoCam;\n    this.drawBuildParts(ctx, camera.x, camera.y, viewport, __isoCam.x, __isoCam.y);",
  "draw isoCamera alias",
);

if (changed) fs.writeFileSync(target, source);
