const fs = require("fs");
const path = require("path");

const target = path.join(__dirname, "..", "src", "features", "rendering", "BuildPartRenderer.ts");
let source = fs.readFileSync(target, "utf8");
let changed = false;

function replace(search, replacement, label) {
  if (source.includes(replacement)) {
    console.log(`[patch-build-sprite-cache] already-patched ${label}`);
    return;
  }
  if (!source.includes(search)) {
    console.log(`[patch-build-sprite-cache] skipped ${label}`);
    return;
  }
  source = source.replace(search, replacement);
  changed = true;
  console.log(`[patch-build-sprite-cache] patched ${label}`);
}

replace(
  `export class BuildPartRenderer {
  private liteMode = false;`,
  `export class BuildPartRenderer {
  private liteMode = false;
  private spriteCache = new Map<string, { canvas: HTMLCanvasElement; offsetX: number; offsetY: number }>();`,
  "sprite cache field",
);

replace(
  `  drawPlacedPart(ctx: CanvasRenderingContext2D, part: PlacedBuildPart, isoCamX: number, isoCamY: number) {
    const definition = BUILD_PARTS[part.partId];
    if (!definition) return;
    const iso = buildGridToIsoCenter(part.gridX, part.gridY);
    this.drawPart(ctx, definition, iso.x - isoCamX, iso.y - isoCamY, part.rotation, false, 1, part.floorLevel, part.isOpen === true);
  }`,
  `  drawPlacedPart(ctx: CanvasRenderingContext2D, part: PlacedBuildPart, isoCamX: number, isoCamY: number) {
    const definition = BUILD_PARTS[part.partId];
    if (!definition) return;
    const iso = buildGridToIsoCenter(part.gridX, part.gridY);
    const x = iso.x - isoCamX;
    const y = iso.y - isoCamY;
    const sprite = this.getPlacedPartSprite(definition, part.rotation, part.floorLevel, part.isOpen === true);
    if (sprite) {
      ctx.drawImage(sprite.canvas, Math.round(x + sprite.offsetX), Math.round(y + sprite.offsetY));
      return;
    }
    this.drawPart(ctx, definition, x, y, part.rotation, false, 1, part.floorLevel, part.isOpen === true);
  }

  private getPlacedPartSprite(definition: BuildPartDefinition, rotation: BuildPartRotation, floorLevel: number, isOpen: boolean) {
    if (typeof document === "undefined") return null;
    const key = definition.id + ":" + rotation + ":" + floorLevel + ":" + (isOpen ? 1 : 0) + ":" + (this.liteMode ? 1 : 0);
    const cached = this.spriteCache.get(key);
    if (cached) return cached;

    const width = Math.max(1, definition.width) * BUILD_GRID_SIZE;
    const height = Math.max(1, definition.height) * BUILD_GRID_SIZE;
    const visual = getBuildPartVisual2p5d(definition);
    const margin = Math.ceil(150 + Math.max(0, floorLevel) * BUILD_2P5D_FLOOR_HEIGHT + visual.renderHeightPx * 0.7);
    const canvasWidth = Math.min(640, Math.ceil(width + margin * 2));
    const canvasHeight = Math.min(640, Math.ceil(height + margin * 2 + visual.renderHeightPx + BUILD_2P5D_ROOF_RISE));
    if (canvasWidth <= 0 || canvasHeight <= 0) return null;

    const canvas = document.createElement("canvas");
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const cacheCtx = canvas.getContext("2d");
    if (!cacheCtx) return null;
    cacheCtx.imageSmoothingEnabled = false;
    const anchorX = Math.floor(canvasWidth / 2);
    const anchorY = Math.floor(canvasHeight / 2);
    this.drawPart(cacheCtx, definition, anchorX, anchorY, rotation, false, 1, floorLevel, isOpen);

    if (this.spriteCache.size > 260) this.spriteCache.clear();
    const sprite = { canvas, offsetX: -anchorX, offsetY: -anchorY };
    this.spriteCache.set(key, sprite);
    return sprite;
  }`,
  "drawPlacedPart sprite cache",
);

if (changed) fs.writeFileSync(target, source);
