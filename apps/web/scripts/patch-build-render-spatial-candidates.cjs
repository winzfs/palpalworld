const fs = require("fs");
const path = require("path");

const target = path.join(__dirname, "..", "src", "features", "game", "GameScene.tsx");
let source = fs.readFileSync(target, "utf8");
let changed = false;

function replace(search, replacement, label) {
  if (source.includes(replacement)) {
    console.log(`[patch-build-render-spatial-candidates] already-patched ${label}`);
    return;
  }
  if (!source.includes(search)) {
    console.log(`[patch-build-render-spatial-candidates] skipped ${label}`);
    return;
  }
  source = source.replace(search, replacement);
  changed = true;
  console.log(`[patch-build-render-spatial-candidates] patched ${label}`);
}

function replaceAll(search, replacement, label) {
  if (!source.includes(search)) {
    console.log(`[patch-build-render-spatial-candidates] skipped ${label}`);
    return;
  }
  source = source.split(search).join(replacement);
  changed = true;
  console.log(`[patch-build-render-spatial-candidates] patched ${label}`);
}

replace(
  '  private getSelectedPlacedBuildPart() {\n    return this.selectedPlacedBuildPartId ? this.placedBuildParts.find((part) => part.id === this.selectedPlacedBuildPartId) ?? null : null;\n  }',
  '  private getSelectedPlacedBuildPart() {\n    return this.selectedPlacedBuildPartId ? this.placedBuildParts.find((part) => part.id === this.selectedPlacedBuildPartId) ?? null : null;\n  }\n  private getSceneBuildPartsInIsoViewport(viewport: ViewportBounds, isoCamX: number, isoCamY: number, padding = 420) {\n    const width = this.cachedRootRectWidth || this.root.clientWidth;\n    const height = this.cachedRootRectHeight || this.root.clientHeight;\n    const corners = [\n      screenToIsoBuildGrid(-padding, -padding, isoCamX, isoCamY),\n      screenToIsoBuildGrid(width + padding, -padding, isoCamX, isoCamY),\n      screenToIsoBuildGrid(-padding, height + padding, isoCamX, isoCamY),\n      screenToIsoBuildGrid(width + padding, height + padding, isoCamX, isoCamY),\n    ];\n    const xs = corners.map((point) => point.gridX);\n    const ys = corners.map((point) => point.gridY);\n    const minGX = Math.min(...xs) - 4;\n    const maxGX = Math.max(...xs) + 4;\n    const minGY = Math.min(...ys) - 4;\n    const maxGY = Math.max(...ys) + 4;\n    const tile = this.getCurrentTile();\n    return this.placedBuildParts.filter((part) => part.tileX === tile.x && part.tileY === tile.y && part.gridX >= minGX && part.gridX <= maxGX && part.gridY >= minGY && part.gridY <= maxGY);\n  }',
  "viewport grid candidate helper",
);

replaceAll(
  'return getBuildPartsInGridRect(this.placedBuildParts, this.getCurrentTile(), minGX, minGY, maxGX, maxGY);',
  'const tile = this.getCurrentTile();\n    return this.placedBuildParts.filter((part) => part.tileX === tile.x && part.tileY === tile.y && part.gridX >= minGX && part.gridX <= maxGX && part.gridY >= minGY && part.gridY <= maxGY);',
  "remove undefined helper usage",
);

replace(
  '    const sourceParts = this.getSceneBuildParts();\n    if (sourceParts.length <= 0) return;',
  '    const sourceParts = this.getSceneBuildPartsInIsoViewport(viewport, isoCamX, isoCamY);\n    if (sourceParts.length <= 0) return;',
  "base source candidates",
);

replace(
  '    const sourceParts = this.getSceneBuildParts();\n    if (sourceParts.length <= 0) return;\n\n    const localPlayer = this.getLocalPlayer();',
  '    const sourceParts = this.getSceneBuildPartsInIsoViewport(viewport, isoCamX, isoCamY, 560);\n    if (sourceParts.length <= 0) return;\n\n    const localPlayer = this.getLocalPlayer();',
  "foreground source candidates",
);

if (changed) fs.writeFileSync(target, source);
