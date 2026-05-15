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

replaceSceneRegex(
  /  private drawBuildParts\(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number, viewport: ViewportBounds, isoCamX: number, isoCamY: number\) \{[\s\S]*?\n  \}\n  private drawBuildings\(/,
  `  private drawBuildParts(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number, viewport: ViewportBounds, isoCamX: number, isoCamY: number) {
    const sourceParts = this.getSceneBuildParts();
    if (sourceParts.length <= 0) return;

    const visibleParts: PlacedBuildPart[] = [];
    const cullPad = sourceParts.length > 80 ? 96 : 160;
    for (const part of sourceParts) {
      const definition = BUILD_PARTS[part.partId];
      if (!definition) continue;
      const iso = buildGridToIsoCenter(part.gridX, part.gridY);
      const width = Math.max(1, definition.width) * BUILD_GRID_SIZE;
      const height = Math.max(1, definition.height) * BUILD_GRID_SIZE;
      const halfW = Math.max(36, width * 0.66 + 28);
      const halfH = Math.max(36, height * 0.38 + 82 + part.floorLevel * 58);
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

    const heavyScene = sourceParts.length > 70 || visibleParts.length > 36;
    const extremeScene = sourceParts.length > 130 || visibleParts.length > 72;
    const drawHouseGhostOutlines = !heavyScene;
    let ghostOutlineCount = 0;
    const maxGhostOutlines = heavyScene ? 0 : 20;

    for (const part of visibleParts) {
      const directlySelected = part.id === this.selectedPlacedBuildPartId;
      const demolitionSelected = this.demolitionSelectedPartIds.has(part.id);
      const needsSelectionPass = directlySelected || demolitionSelected || (!heavyScene && part.houseId && part.houseId === this.selectedHouseId);
      const visibility = needsSelectionPass || !extremeScene
        ? getBuildPartVisibility({ part, selectedHouseId: this.selectedHouseId, activeFloorLevel: this.selectedBuildFloorLevel, mode: "editing" })
        : { hide: false, alpha: 1, outlineAlpha: 0 };
      if (visibility.hide) continue;

      ctx.save();
      ctx.globalAlpha *= extremeScene ? Math.min(visibility.alpha, 0.86) : heavyScene ? Math.min(visibility.alpha, 0.92) : visibility.alpha;
      this.buildPartRenderer.drawPlacedPart(ctx, part, isoCamX, isoCamY);
      ctx.restore();

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
  "adaptive cull first drawBuildParts",
);

replaceSceneRegex(
  /    return this\.getSceneBuildParts\(\)\.filter\(\(part\) => \{[\s\S]*?\n    \}\);/,
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

replaceRenderer("ctx.shadowBlur = preview ? 1 : 3;", "ctx.shadowBlur = preview ? 0 : 1;", "reduce shadow blur");
replaceRenderer("ctx.shadowBlur = preview ? 1 : 2;", "ctx.shadowBlur = preview ? 0 : 1;", "reduce alternate shadow blur");
replaceRenderer("ctx.shadowColor = preview ? \"rgba(0,0,0,0.07)\" : \"rgba(0,0,0,0.16)\";", "ctx.shadowColor = preview ? \"rgba(0,0,0,0.04)\" : \"rgba(0,0,0,0.10)\";", "reduce shadow color");
replaceRenderer("ctx.shadowColor = preview ? \"rgba(0, 0, 0, 0.10)\" : \"rgba(0, 0, 0, 0.18)\";", "ctx.shadowColor = preview ? \"rgba(0, 0, 0, 0.04)\" : \"rgba(0, 0, 0, 0.10)\";", "reduce soft shadow color");

if (sceneChanged) fs.writeFileSync(scenePath, scene);
if (rendererChanged) fs.writeFileSync(rendererPath, renderer);
