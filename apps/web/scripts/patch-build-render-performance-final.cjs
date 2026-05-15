const fs = require("fs");
const path = require("path");

const scenePath = path.join(__dirname, "..", "src", "features", "game", "GameScene.tsx");
const rendererPath = path.join(__dirname, "..", "src", "features", "rendering", "BuildPartRenderer.ts");

let scene = fs.readFileSync(scenePath, "utf8");
let renderer = fs.readFileSync(rendererPath, "utf8");
let sceneChanged = false;
let rendererChanged = false;

function replaceSceneRegex(regex, replacement, label) {
  if (scene.includes(replacement)) {
    console.log(`[patch-build-render-performance-final] already-patched scene ${label}`);
    return;
  }
  if (!regex.test(scene)) {
    console.log(`[patch-build-render-performance-final] skipped scene ${label}`);
    return;
  }
  scene = scene.replace(regex, replacement);
  sceneChanged = true;
  console.log(`[patch-build-render-performance-final] patched scene ${label}`);
}

function replaceRenderer(search, replacement, label) {
  if (renderer.includes(replacement)) {
    console.log(`[patch-build-render-performance-final] already-patched renderer ${label}`);
    return;
  }
  if (!renderer.includes(search)) {
    console.log(`[patch-build-render-performance-final] skipped renderer ${label}`);
    return;
  }
  renderer = renderer.replace(search, replacement);
  rendererChanged = true;
  console.log(`[patch-build-render-performance-final] patched renderer ${label}`);
}

// Replace the final generated drawBuildParts with a cull-first implementation.
// The old path sorted/drew/outlined a broad set of parts every frame. This path
// computes cheap iso bounds first, discards off-screen parts before sorting, and
// limits expensive house-wide outline drawing when many parts are visible.
replaceSceneRegex(
  /  private drawBuildParts\(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number, viewport: ViewportBounds, isoCamX: number, isoCamY: number\) \{[\s\S]*?\n  \}\n  private drawBuildings\(/,
  `  private drawBuildParts(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number, viewport: ViewportBounds, isoCamX: number, isoCamY: number) {
    const sourceParts = this.getSceneBuildParts();
    if (sourceParts.length <= 0) return;

    const visibleParts: PlacedBuildPart[] = [];
    const cullPad = 180;
    for (const part of sourceParts) {
      const definition = BUILD_PARTS[part.partId];
      if (!definition) continue;
      const iso = buildGridToIsoCenter(part.gridX, part.gridY);
      const width = Math.max(1, definition.width) * BUILD_GRID_SIZE;
      const height = Math.max(1, definition.height) * BUILD_GRID_SIZE;
      const halfW = Math.max(40, width * 0.72 + 32);
      const halfH = Math.max(40, height * 0.42 + 96 + part.floorLevel * 58);
      if (iso.x + halfW < viewport.left - cullPad) continue;
      if (iso.x - halfW > viewport.right + cullPad) continue;
      if (iso.y + halfH < viewport.top - cullPad) continue;
      if (iso.y - halfH > viewport.bottom + cullPad) continue;
      visibleParts.push(part);
    }
    if (visibleParts.length <= 0) return;

    visibleParts.sort((a, b) => {
      const definitionA = BUILD_PARTS[a.partId];
      const definitionB = BUILD_PARTS[b.partId];
      if (!definitionA || !definitionB) return 0;
      return getBuildPartSortKey(definitionA, a.gridX, a.gridY, a.floorLevel) - getBuildPartSortKey(definitionB, b.gridX, b.gridY, b.floorLevel);
    });

    const heavyScene = visibleParts.length > 48;
    const drawHouseGhostOutlines = !heavyScene;
    let ghostOutlineCount = 0;
    const maxGhostOutlines = heavyScene ? 0 : 32;

    for (const part of visibleParts) {
      const visibility = getBuildPartVisibility({ part, selectedHouseId: this.selectedHouseId, activeFloorLevel: this.selectedBuildFloorLevel, mode: "editing" });
      if (visibility.hide) continue;

      ctx.save();
      ctx.globalAlpha *= heavyScene ? Math.min(visibility.alpha, 0.92) : visibility.alpha;
      this.buildPartRenderer.drawPlacedPart(ctx, part, isoCamX, isoCamY);
      ctx.restore();

      const demolitionSelected = this.demolitionSelectedPartIds.has(part.id);
      const directlySelected = part.id === this.selectedPlacedBuildPartId;
      const houseGhost = drawHouseGhostOutlines && ghostOutlineCount < maxGhostOutlines && Boolean(part.houseId && part.houseId === this.selectedHouseId);
      if (!demolitionSelected && !directlySelected && !houseGhost) continue;
      if (houseGhost) ghostOutlineCount += 1;

      this.buildPartRenderer.drawPlacedPartOutline(ctx, part, isoCamX, isoCamY, {
        alpha: directlySelected ? 1 : demolitionSelected ? 0.92 : visibility.outlineAlpha,
        strokeStyle: demolitionSelected ? "rgba(248, 113, 113, 0.98)" : directlySelected ? "rgba(250, 204, 21, 0.95)" : "rgba(96, 165, 250, 0.55)",
        lineWidth: demolitionSelected || directlySelected ? 3 : 1,
        dashed: !demolitionSelected && !directlySelected,
        fillStyle: demolitionSelected ? "rgba(248, 113, 113, 0.08)" : directlySelected ? "rgba(250, 204, 21, 0.08)" : undefined,
      });
    }
  }
  private drawBuildings(`,
  "cull first drawBuildParts",
);

// Make the rectangle drag selection cheaper and more forgiving by keeping the
// current grid prefilter but using padded iso bounds instead of exact centers.
replaceSceneRegex(
  /    return this\.getSceneBuildParts\(\)\.filter\(\(part\) => \{\n      const definition = BUILD_PARTS\[part\.partId\];\n      const rangePad = Math\.max\(1, definition\?\.width \?\? 1, definition\?\.height \?\? 1\) \+ 1;\n      if \(part\.gridX < minGX - rangePad \|\| part\.gridX > maxGX \+ rangePad \|\| part\.gridY < minGY - rangePad \|\| part\.gridY > maxGY \+ rangePad\) return false;\n      const partIso = buildGridToIsoCenter\(part\.gridX, part\.gridY\);\n      const partSX = partIso\.x - __isoCam\.x;\n      const partSY = partIso\.y - __isoCam\.y;\n      const halfW = Math\.max\(24, \(\(definition\?\.width \?\? 1\) \* BUILD_GRID_SIZE\) \/ 2 \+ 10\);\n      const halfH = Math\.max\(18, \(\(definition\?\.height \?\? 1\) \* BUILD_GRID_SIZE \* 0\.62\) \/ 2 \+ 18\);\n      return partSX \+ halfW >= scrLeft && partSX - halfW <= scrRight && partSY \+ halfH >= scrTop && partSY - halfH <= scrBottom;\n    \}\);/,
  `    return this.getSceneBuildParts().filter((part) => {
      const definition = BUILD_PARTS[part.partId];
      const rangePad = Math.max(1, definition?.width ?? 1, definition?.height ?? 1) + 1;
      if (part.gridX < minGX - rangePad || part.gridX > maxGX + rangePad || part.gridY < minGY - rangePad || part.gridY > maxGY + rangePad) return false;
      const partIso = buildGridToIsoCenter(part.gridX, part.gridY);
      const partSX = partIso.x - __isoCam.x;
      const partSY = partIso.y - __isoCam.y;
      const halfW = Math.max(30, ((definition?.width ?? 1) * BUILD_GRID_SIZE) / 2 + 18);
      const halfH = Math.max(24, ((definition?.height ?? 1) * BUILD_GRID_SIZE * 0.62) / 2 + 24);
      return partSX + halfW >= scrLeft && partSX - halfW <= scrRight && partSY + halfH >= scrTop && partSY - halfH <= scrBottom;
    });`,
  "padded drag hit bounds",
);

// Canvas shadows are expensive when many build parts are placed. These softer
// defaults keep the visual depth but avoid stacking lots of blur work.
replaceRenderer("ctx.shadowBlur = preview ? 1 : 3;", "ctx.shadowBlur = preview ? 0 : 1;", "reduce shadow blur");
replaceRenderer("ctx.shadowColor = preview ? \"rgba(0,0,0,0.07)\" : \"rgba(0,0,0,0.16)\";", "ctx.shadowColor = preview ? \"rgba(0,0,0,0.04)\" : \"rgba(0,0,0,0.10)\";", "reduce shadow color");

if (sceneChanged) fs.writeFileSync(scenePath, scene);
if (rendererChanged) fs.writeFileSync(rendererPath, renderer);
