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

function replaceSceneOnce(search, replacement, label) {
  if (scene.includes(replacement)) {
    console.log(`[patch-build-render-performance-final] already-patched scene ${label}`);
    return;
  }
  if (!scene.includes(search)) {
    console.log(`[patch-build-render-performance-final] skipped scene ${label}`);
    return;
  }
  scene = scene.replace(search, replacement);
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

// Stable two-pass build rendering:
// - floors/stairs/decor render below the player
// - walls/doors/windows/roofs render above the player
// - foreground pieces near the local player become translucent
// This fixes indoor readability and avoids the wall-missing artifacts caused by
// the previous static offscreen layer cache.
replaceSceneRegex(
  /  private drawBuildParts\(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number, viewport: ViewportBounds, isoCamX: number, isoCamY: number\) \{[\s\S]*?\n  \}\n  private drawBuildings\(/,
  `  private drawBuildParts(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number, viewport: ViewportBounds, isoCamX: number, isoCamY: number) {
    const sourceParts = this.getSceneBuildParts();
    if (sourceParts.length <= 0) return;

    const visibleParts: PlacedBuildPart[] = [];
    const cullPad = sourceParts.length > 80 ? 120 : 220;
    for (const part of sourceParts) {
      const definition = BUILD_PARTS[part.partId];
      if (!definition) continue;
      if (definition.category === "wall" || definition.category === "door" || definition.category === "window" || definition.category === "roof") continue;
      const iso = buildGridToIsoCenter(part.gridX, part.gridY);
      const width = Math.max(1, definition.width) * BUILD_GRID_SIZE;
      const height = Math.max(1, definition.height) * BUILD_GRID_SIZE;
      const halfW = Math.max(44, width * 0.76 + 36);
      const halfH = Math.max(44, height * 0.46 + 100 + part.floorLevel * 58);
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

    const heavyScene = sourceParts.length > 90 || visibleParts.length > 50;
    for (const part of visibleParts) {
      const visibility = heavyScene
        ? { hide: false, alpha: 0.94, outlineAlpha: 0 }
        : getBuildPartVisibility({ part, selectedHouseId: this.selectedHouseId, activeFloorLevel: this.selectedBuildFloorLevel, mode: "editing" });
      if (visibility.hide) continue;
      ctx.save();
      ctx.globalAlpha *= visibility.alpha;
      this.buildPartRenderer.drawPlacedPart(ctx, part, isoCamX, isoCamY);
      ctx.restore();
    }
  }

  private drawBuildPartsForeground(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number, viewport: ViewportBounds, isoCamX: number, isoCamY: number) {
    const sourceParts = this.getSceneBuildParts();
    if (sourceParts.length <= 0) return;

    const localPlayer = this.getLocalPlayer();
    const playerFloorLevel = Math.round((this as any).localPlayerFloorLevel ?? 0);
    const visibleParts: PlacedBuildPart[] = [];
    const cullPad = sourceParts.length > 80 ? 140 : 240;
    for (const part of sourceParts) {
      const definition = BUILD_PARTS[part.partId];
      if (!definition) continue;
      if (definition.category !== "wall" && definition.category !== "door" && definition.category !== "window" && definition.category !== "roof") continue;
      const iso = buildGridToIsoCenter(part.gridX, part.gridY);
      const width = Math.max(1, definition.width) * BUILD_GRID_SIZE;
      const height = Math.max(1, definition.height) * BUILD_GRID_SIZE;
      const halfW = Math.max(54, width * 0.82 + 46);
      const halfH = Math.max(64, height * 0.54 + 132 + part.floorLevel * 64);
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
      const definition = BUILD_PARTS[part.partId];
      if (!definition) continue;
      const visibility = getBuildPartVisibility({ part, selectedHouseId: this.selectedHouseId, activeFloorLevel: this.selectedBuildFloorLevel, mode: "editing" });
      if (visibility.hide) continue;
      const center = buildGridToIsoCenter(part.gridX, part.gridY);
      const nearPlayer = Boolean(localPlayer && Math.hypot(localPlayer.position.x - center.x, localPlayer.position.y - center.y) <= (definition.category === "roof" ? 190 : 150));
      const sameFloor = Math.abs(part.floorLevel - playerFloorLevel) <= 1;
      const indoorAlpha = nearPlayer && sameFloor ? (definition.category === "roof" ? 0.24 : 0.46) : 1;
      ctx.save();
      ctx.globalAlpha *= visibility.alpha * indoorAlpha;
      this.buildPartRenderer.drawPlacedPart(ctx, part, isoCamX, isoCamY);
      ctx.restore();

      const directlySelected = part.id === this.selectedPlacedBuildPartId;
      const demolitionSelected = this.demolitionSelectedPartIds.has(part.id);
      const houseGhost = ghostOutlineCount < maxGhostOutlines && Boolean(part.houseId && part.houseId === this.selectedHouseId);
      if (!directlySelected && !demolitionSelected && !houseGhost) continue;
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
  "two pass indoor build rendering",
);

replaceSceneOnce(
  '    this.drawPlayers(ctx, camera.x, camera.y, now, viewport);\n    this.drawInteractionHint(ctx, camera.x, camera.y);',
  '    this.drawPlayers(ctx, camera.x, camera.y, now, viewport);\n    this.drawBuildPartsForeground(ctx, camera.x, camera.y, viewport, isoCamera.x, isoCamera.y);\n    this.drawInteractionHint(ctx, camera.x, camera.y);',
  "draw foreground build parts after players",
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
