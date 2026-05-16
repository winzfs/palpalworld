const fs = require("fs");
const path = require("path");

const target = path.join(__dirname, "..", "src", "features", "game", "GameScene.tsx");
let source = fs.readFileSync(target, "utf8");
let changed = false;

const drawStart = source.indexOf("  private draw() {");
const drawEnd = drawStart >= 0 ? source.indexOf("\n  private ", drawStart + 18) : -1;

if (drawStart >= 0 && drawEnd > drawStart) {
  const drawBody = source.slice(drawStart, drawEnd);
  const needsIso = drawBody.includes("__isoCam.") || drawBody.includes("isoCamera.");
  const hasBoth = drawBody.includes("const __isoCam =") && drawBody.includes("const isoCamera = __isoCam;");

  if (needsIso && !hasBoth) {
    let nextDrawBody = drawBody;

    if (nextDrawBody.includes("const __isoCam =") && !nextDrawBody.includes("const isoCamera = __isoCam;")) {
      nextDrawBody = nextDrawBody.replace(
        "    const __isoCam = worldCameraToIsoBuildCamera(camera.x, camera.y, width, height);",
        "    const __isoCam = worldCameraToIsoBuildCamera(camera.x, camera.y, width, height);\n    const isoCamera = __isoCam;",
      );
      nextDrawBody = nextDrawBody.replace(
        "    const __isoCam = worldCameraToIsoBuildCamera(camera.x, camera.y, rect.width, rect.height);",
        "    const __isoCam = worldCameraToIsoBuildCamera(camera.x, camera.y, rect.width, rect.height);\n    const isoCamera = __isoCam;",
      );
    }

    if (!nextDrawBody.includes("const __isoCam =")) {
      const hasCachedSize = nextDrawBody.includes("const width =") && nextDrawBody.includes("const height =");
      const sizeArgs = hasCachedSize ? "width, height" : "rect.width, rect.height";
      const line = `    const __isoCam = worldCameraToIsoBuildCamera(camera.x, camera.y, ${sizeArgs});\n    const isoCamera = __isoCam;\n`;
      if (nextDrawBody.includes("    const viewport = this.getViewportBounds(camera.x, camera.y);\n")) {
        nextDrawBody = nextDrawBody.replace(
          "    const viewport = this.getViewportBounds(camera.x, camera.y);\n",
          "    const viewport = this.getViewportBounds(camera.x, camera.y);\n" + line,
        );
      }
    }

    if (nextDrawBody !== drawBody) {
      source = source.slice(0, drawStart) + nextDrawBody + source.slice(drawEnd);
      changed = true;
      console.log("[patch-iso-camera-alias-final] patched draw iso camera declarations");
    }
  }
}

if (changed) fs.writeFileSync(target, source);
