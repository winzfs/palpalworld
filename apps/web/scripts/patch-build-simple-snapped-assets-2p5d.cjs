const fs = require("fs");
const path = require("path");

const target = path.join(__dirname, "..", "src", "features", "rendering", "BuildPartRenderer.ts");
let source = fs.readFileSync(target, "utf8");
let changed = false;

function replaceBlock(methodName, replacement) {
  const pattern = new RegExp(`  private ${methodName}\\([\\s\\S]*?\\n  \\}\\n\\n  private `);
  const match = source.match(pattern);
  if (!match) {
    console.log(`[patch-build-simple-snapped-assets-2p5d] skipped ${methodName}`);
    return;
  }
  const nextMarker = match[0].slice(match[0].lastIndexOf("\n  private ") + 1);
  source = source.replace(pattern, `${replacement}\n\n  ${nextMarker}`);
  changed = true;
  console.log(`[patch-build-simple-snapped-assets-2p5d] patched ${methodName}`);
}

replaceBlock("drawFloor", `  private drawFloor(ctx: CanvasRenderingContext2D, definition: BuildPartDefinition, left: number, top: number, width: number, height: number, preview: boolean, intensity: number, floorLevel: number) {
    const color = getMaterialPalette(definition.material);
    const isFoundation = definition.layer === "foundation";
    const isUpperFloor = floorLevel > 0 || definition.id.includes("second_floor");
    const inset = 1;
    const slabDepth = isFoundation ? 10 : 6;
    const x = left + inset;
    const y = top + inset;
    const w = width - inset * 2;
    const h = height - inset * 2 - slabDepth;

    ctx.save();
    ctx.shadowColor = preview ? "rgba(0,0,0,0.10)" : "rgba(0,0,0,0.20)";
    ctx.shadowBlur = preview ? 1 : 3;
    ctx.shadowOffsetY = 2;

    // Full-width slab: intentionally fills the grid so adjacent floors connect tightly.
    ctx.fillStyle = color.dark;
    ctx.strokeStyle = "rgba(15,23,42,0.9)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y + slabDepth, w, h, 4);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = isUpperFloor ? color.light : color.base;
    ctx.strokeStyle = color.dark;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 4);
    ctx.fill();
    ctx.stroke();

    // Simple grid-fitting edge strips. These make neighboring parts feel locked together.
    ctx.fillStyle = color.side;
    ctx.globalAlpha *= 0.95;
    ctx.fillRect(x, y, w, 5);
    ctx.fillRect(x, y + h - 5, w, 5);
    ctx.fillRect(x, y, 5, h);
    ctx.fillRect(x + w - 5, y, 5, h);

    ctx.globalAlpha *= 0.85;
    if (definition.material === "stone") {
      ctx.strokeStyle = "rgba(30,41,59,0.34)";
      ctx.lineWidth = 1;
      for (let yy = y + 13; yy < y + h - 6; yy += 13) {
        ctx.beginPath();
        ctx.moveTo(x + 8, yy);
        ctx.lineTo(x + w - 8, yy + 1);
        ctx.stroke();
      }
      for (let xx = x + 16; xx < x + w - 8; xx += 18) {
        ctx.beginPath();
        ctx.moveTo(xx, y + 8);
        ctx.lineTo(xx - 3, y + h - 8);
        ctx.stroke();
      }
    } else {
      ctx.strokeStyle = "rgba(255,255,255,0.18)";
      ctx.lineWidth = 1;
      for (let xx = x + 13; xx < x + w - 6; xx += 12) {
        ctx.beginPath();
        ctx.moveTo(xx, y + 8);
        ctx.lineTo(xx - 4, y + h - 8);
        ctx.stroke();
      }
    }

    if (isUpperFloor) {
      ctx.globalAlpha *= 0.35 * intensity;
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.fillRect(x + 8, y + 7, w - 16, 4);
    }
    ctx.restore();
  }`);

replaceBlock("drawHorizontalWallFace", `  private drawHorizontalWallFace(ctx: CanvasRenderingContext2D, rect: ReturnType<BuildPartRenderer["getEdgeWallRect"]>, color: ReturnType<typeof getMaterialPalette>, wallHeight: number, lowWall: boolean) {
    const wallBottom = rect.top + 1;
    const actualWallHeight = lowWall ? Math.min(26, wallHeight) : wallHeight;
    const wallTop = wallBottom - actualWallHeight;
    const x = rect.left;
    const w = rect.width;
    const postW = 6;

    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.18)";
    ctx.shadowBlur = 2;
    ctx.shadowOffsetY = 2;

    // Thin bottom seam exactly spans the tile edge.
    ctx.fillStyle = color.dark;
    ctx.strokeStyle = "rgba(15,23,42,0.9)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, wallBottom - 4, w, 8, 3);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = color.face;
    ctx.strokeStyle = color.dark;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, wallTop, w, actualWallHeight, 4);
    ctx.fill();
    ctx.stroke();

    // Minimal posts, flush to both ends. No oversized caps.
    ctx.fillStyle = color.side;
    ctx.fillRect(x, wallTop, postW, actualWallHeight + 5);
    ctx.fillRect(x + w - postW, wallTop, postW, actualWallHeight + 5);
    ctx.fillRect(x, wallTop, w, 6);
    ctx.fillRect(x, wallBottom - 5, w, 6);

    ctx.strokeStyle = "rgba(255,255,255,0.16)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + postW + 4, wallTop + 10);
    ctx.lineTo(x + w - postW - 4, wallTop + 10);
    ctx.stroke();
    ctx.restore();
  }`);

replaceBlock("drawSideWallFace", `  private drawSideWallFace(ctx: CanvasRenderingContext2D, rect: ReturnType<BuildPartRenderer["getEdgeWallRect"]>, color: ReturnType<typeof getMaterialPalette>, wallHeight: number, lowWall: boolean, rotation: BuildPartRotation) {
    const actualWallHeight = lowWall ? Math.min(26, wallHeight) : wallHeight;
    const x = rect.left + rect.width / 2;
    const wallW = 8;
    const wallTop = rect.top - actualWallHeight + 10;
    const wallBottom = rect.top + rect.height;
    const lean = rotation === 90 ? -2 : 2;

    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.16)";
    ctx.shadowBlur = 2;
    ctx.shadowOffsetY = 2;

    // Thin vertical seam: fills the grid edge but reads as side wall.
    ctx.fillStyle = color.dark;
    ctx.strokeStyle = "rgba(15,23,42,0.9)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x - wallW / 2, rect.top, wallW, rect.height, 3);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = color.side;
    ctx.strokeStyle = color.dark;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x - wallW / 2, wallTop);
    ctx.lineTo(x + wallW / 2, wallTop + lean);
    ctx.lineTo(x + wallW / 2, wallBottom - 3);
    ctx.lineTo(x - wallW / 2, wallBottom - 3 - lean);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.fillRect(x - wallW / 2 + 2, wallTop + 8, Math.max(2, wallW - 4), actualWallHeight + rect.height - 18);

    // Tiny endpoint strips for connection, not bulky blocks.
    ctx.fillStyle = color.light;
    ctx.fillRect(x - wallW / 2, wallTop, wallW, 5);
    ctx.fillRect(x - wallW / 2, wallBottom - 7, wallW, 5);
    ctx.restore();
  }`);

replaceBlock("drawConnectionCaps", `  private drawConnectionCaps(ctx: CanvasRenderingContext2D, _x: number, _y: number, _width: number, _height: number, _rotation: BuildPartRotation, _color: ReturnType<typeof getMaterialPalette>) {
    // Connection points are now represented by flush wall/floor edges, not bulky caps.
  }`);

replaceBlock("drawConnectionGuide", `  private drawConnectionGuide(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, rotation: BuildPartRotation, valid: boolean) {
    const point = getEdgeConnectionPoint2p5d({ x, y, width, height, rotation });
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = valid ? "rgba(250,204,21,0.9)" : "rgba(248,113,113,0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(point.startX, point.startY);
    ctx.lineTo(point.endX, point.endY);
    ctx.stroke();
    ctx.restore();
  }`);

replaceBlock("drawDoorOnEdge", `  private drawDoorOnEdge(ctx: CanvasRenderingContext2D, _definition: BuildPartDefinition, x: number, y: number, width: number, height: number, rotation: BuildPartRotation, _preview: boolean, _intensity: number) {
    const rect = this.getEdgeWallRect(x, y, width, height, rotation, BUILD_2P5D_WALL_HEIGHT);
    ctx.save();
    ctx.fillStyle = "#4a2b16";
    ctx.strokeStyle = "#1f1308";
    ctx.lineWidth = 1.5;
    if (rect.horizontal) {
      const doorWidth = 18;
      const doorHeight = 31;
      const doorX = x - doorWidth / 2;
      const doorY = rect.top - doorHeight + 1;
      ctx.beginPath();
      ctx.roundRect(doorX, doorY, doorWidth, doorHeight, 3);
      ctx.fill();
      ctx.stroke();
    } else {
      const doorWidth = 5;
      const doorHeight = 28;
      const doorX = rect.left + rect.width / 2 - doorWidth / 2;
      const doorY = y - doorHeight / 2 - 2;
      ctx.beginPath();
      ctx.roundRect(doorX, doorY, doorWidth, doorHeight, 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }`);

replaceBlock("drawWindowOnEdge", `  private drawWindowOnEdge(ctx: CanvasRenderingContext2D, _definition: BuildPartDefinition, x: number, y: number, width: number, height: number, rotation: BuildPartRotation, _preview: boolean, _intensity: number) {
    const rect = this.getEdgeWallRect(x, y, width, height, rotation, BUILD_2P5D_WALL_HEIGHT);
    ctx.save();
    ctx.fillStyle = "rgba(125,211,252,0.84)";
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 1.5;
    const windowWidth = rect.horizontal ? 22 : 5;
    const windowHeight = rect.horizontal ? 15 : 20;
    const wx = rect.horizontal ? x - windowWidth / 2 : rect.left + rect.width / 2 - windowWidth / 2;
    const wy = rect.horizontal ? rect.top - 32 : y - windowHeight / 2 - 4;
    ctx.beginPath();
    ctx.roundRect(wx, wy, windowWidth, windowHeight, 3);
    ctx.fill();
    ctx.stroke();
    if (rect.horizontal) {
      ctx.beginPath();
      ctx.moveTo(wx + windowWidth / 2, wy + 2);
      ctx.lineTo(wx + windowWidth / 2, wy + windowHeight - 2);
      ctx.moveTo(wx + 2, wy + windowHeight / 2);
      ctx.lineTo(wx + windowWidth - 2, wy + windowHeight / 2);
      ctx.stroke();
    }
    ctx.restore();
  }`);

if (changed) fs.writeFileSync(target, source);
