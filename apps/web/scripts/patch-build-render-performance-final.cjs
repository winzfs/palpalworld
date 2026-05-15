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

    const viewportWidth = Math.max(1, Math.ceil((this as any).cachedRootRectWidth || this.root.clientWidth));
    const viewportHeight = Math.max(1, Math.ceil((this as any).cachedRootRectHeight || this.root.clientHeight));
    const cachePadding = 260;
    const layerWidth = Math.ceil(MAP_TILE_SIZE.width + cachePadding * 2);
    const layerHeight = Math.ceil(MAP_TILE_SIZE.height + cachePadding * 2);
    const cacheOwner = this as unknown as {
      __buildPartLayerCanvas?: HTMLCanvasElement;
      __buildPartLayerCtx?: CanvasRenderingContext2D | null;
      __buildPartLayerKey?: string;
    };

    const staticKey = [
      sourceParts.length,
      this.selectedHouseId ?? "none",
      this.selectedBuildFloorLevel,
      sourceParts.map((part) => \`\${part.id}:\${part.partId}:\${part.gridX}:\${part.gridY}:\${part.floorLevel}:\${part.rotation}:\${part.houseId ?? ""}\`).join("|"),
    ].join("#");

    if (!cacheOwner.__buildPartLayerCanvas || cacheOwner.__buildPartLayerCanvas.width !== layerWidth || cacheOwner.__buildPartLayerCanvas.height !== layerHeight) {
      cacheOwner.__buildPartLayerCanvas = document.createElement("canvas");
      cacheOwner.__buildPartLayerCanvas.width = layerWidth;
      cacheOwner.__buildPartLayerCanvas.height = layerHeight;
      cacheOwner.__buildPartLayerCtx = cacheOwner.__buildPartLayerCanvas.getContext("2d");
      cacheOwner.__buildPartLayerKey = undefined;
    }

    if (cacheOwner.__buildPartLayerKey !== staticKey) {
      const layerCtx = cacheOwner.__buildPartLayerCtx;
      if (layerCtx) {
        layerCtx.clearRect(0, 0, layerWidth, layerHeight);
        layerCtx.imageSmoothingEnabled = false;
        const sortedParts = [...sourceParts].sort((a, b) => {
          const definitionA = BUILD_PARTS[a.partId];
          const definitionB = BUILD_PARTS[b.partId];
          if (!definitionA || !definitionB) return 0;
          return getBuildPartSortKey(definitionA, a.gridX, a.gridY, a.floorLevel) - getBuildPartSortKey(definitionB, b.gridX, b.gridY, b.floorLevel);
        });
        const heavyScene = sortedParts.length > 70;
        const extremeScene = sortedParts.length > 130;
        for (const part of sortedParts) {
          const visibility = extremeScene
            ? { hide: false, alpha: 0.86, outlineAlpha: 0 }
            : getBuildPartVisibility({ part, selectedHouseId: this.selectedHouseId, activeFloorLevel: this.selectedBuildFloorLevel, mode: "editing" });
          if (visibility.hide) continue;
          layerCtx.save();
          layerCtx.globalAlpha *= heavyScene ? Math.min(visibility.alpha, 0.92) : visibility.alpha;
          this.buildPartRenderer.drawPlacedPart(layerCtx, part, -cachePadding, -cachePadding);
          layerCtx.restore();
        }
        cacheOwner.__buildPartLayerKey = staticKey;
      }
    }

    const layer = cacheOwner.__buildPartLayerCanvas;
    if (layer) {
      const sx = Math.max(0, Math.floor(isoCamX + cachePadding));
      const sy = Math.max(0, Math.floor(isoCamY + cachePadding));
      const sw = Math.min(viewportWidth, layer.width - sx);
      const sh = Math.min(viewportHeight, layer.height - sy);
      if (sw > 0 && sh > 0) ctx.drawImage(layer, sx, sy, sw, sh, 0, 0, sw, sh);
    }

    const visibleParts: PlacedBuildPart[] = [];
    const cullPad = sourceParts.length > 80 ? 96 : 160;
    for (const part of sourceParts) {
      const definition = BUILD_PARTS[part.partId];
      if (!definition) continue;
      const directlySelected = part.id === this.selectedPlacedBuildPartId;
      const demolitionSelected = this.demolitionSelectedPartIds.has(part.id);
      const houseGhostCandidate = sourceParts.length <= 70 && Boolean(part.houseId && part.houseId === this.selectedHouseId);
      if (!directlySelected && !demolitionSelected && !houseGhostCandidate) continue;
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

    let ghostOutlineCount = 0;
    const maxGhostOutlines = sourceParts.length > 70 ? 0 : 20;
    for (const part of visibleParts) {
      const directlySelected = part.id === this.selectedPlacedBuildPartId;
      const demolitionSelected = this.demolitionSelectedPartIds.has(part.id);
      const houseGhost = ghostOutlineCount < maxGhostOutlines && Boolean(part.houseId && part.houseId === this.selectedHouseId);
      if (!directlySelected && !demolitionSelected && !houseGhost) continue;
      if (houseGhost) ghostOutlineCount += 1;
      const visibility = getBuildPartVisibility({ part, selectedHouseId: this.selectedHouseId, activeFloorLevel: this.selectedBuildFloorLevel, mode: "editing" });
      if (visibility.hide) continue;
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
  "cached build layer drawBuildParts",
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
