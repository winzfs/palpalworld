const fs = require("fs");
const path = require("path");

const target = path.join(__dirname, "..", "src", "features", "game", "GameScene.tsx");
let source = fs.readFileSync(target, "utf8");
let changed = false;

function replaceOnce(search, replacement, label) {
  if (!source.includes(search)) {
    console.log(`[patch-house-visibility-2p5d] skipped ${label}`);
    return;
  }
  source = source.replace(search, replacement);
  changed = true;
  console.log(`[patch-house-visibility-2p5d] patched ${label}`);
}

function ensureAfter(anchor, insertion, label) {
  if (source.includes(insertion)) return;
  replaceOnce(anchor, `${anchor}\n${insertion}`, label);
}

ensureAfter(
  'import { getBuildPartSortKey } from "../buildings/buildPartVisual2p5d";',
  'import { getBuildPartVisibility } from "../buildings/houseVisibility2p5d";',
  "visibility import",
);

replaceOnce(
  '      this.buildPartRenderer.drawPlacedPart(ctx, part, cameraX, cameraY);\n      if (part.houseId && part.houseId === this.selectedHouseId) {\n        this.buildPartRenderer.drawPlacedPartOutline(ctx, part, cameraX, cameraY, {\n          strokeStyle: part.id === this.selectedPlacedBuildPartId ? "rgba(250, 204, 21, 0.95)" : "rgba(96, 165, 250, 0.5)",\n          lineWidth: part.id === this.selectedPlacedBuildPartId ? 3 : 1,\n          dashed: part.id !== this.selectedPlacedBuildPartId,\n          fillStyle: part.id === this.selectedPlacedBuildPartId ? "rgba(250, 204, 21, 0.08)" : undefined,\n        });\n      }',
  '      const visibility = getBuildPartVisibility({ part, selectedHouseId: this.selectedHouseId, activeFloorLevel: this.selectedBuildFloorLevel, mode: "editing" });\n      if (visibility.hide) continue;\n      ctx.save();\n      ctx.globalAlpha *= visibility.alpha;\n      this.buildPartRenderer.drawPlacedPart(ctx, part, cameraX, cameraY);\n      ctx.restore();\n      if (part.houseId && part.houseId === this.selectedHouseId) {\n        this.buildPartRenderer.drawPlacedPartOutline(ctx, part, cameraX, cameraY, {\n          alpha: part.id === this.selectedPlacedBuildPartId ? 1 : visibility.outlineAlpha,\n          strokeStyle: part.id === this.selectedPlacedBuildPartId ? "rgba(250, 204, 21, 0.95)" : "rgba(96, 165, 250, 0.68)",\n          lineWidth: part.id === this.selectedPlacedBuildPartId ? 3 : 1,\n          dashed: part.id !== this.selectedPlacedBuildPartId,\n          fillStyle: part.id === this.selectedPlacedBuildPartId ? "rgba(250, 204, 21, 0.08)" : undefined,\n        });\n      }',
  "visibility drawBuildParts",
);

if (changed) fs.writeFileSync(target, source);
