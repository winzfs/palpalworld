const fs = require("fs");
const path = require("path");

const target = path.join(__dirname, "..", "src", "features", "rendering", "BuildPartRenderer.ts");
let source = fs.readFileSync(target, "utf8");
let changed = false;

function replaceBlock(methodName, replacement) {
  const pattern = new RegExp(`  private ${methodName}\\([\\s\\S]*?\\n  \\}\\n\\n  private `);
  const match = source.match(pattern);
  if (!match) {
    console.log(`[patch-wall-directional-rendering-2p5d] skipped ${methodName}`);
    return;
  }
  const nextMarker = match[0].slice(match[0].lastIndexOf("\n  private ") + 1);
  source = source.replace(pattern, `${replacement}\n\n  ${nextMarker}`);
  changed = true;
  console.log(`[patch-wall-directional-rendering-2p5d] patched ${methodName}`);
}

replaceBlock("drawWallEdgeAnchored", `  private drawWallEdgeAnchored(ctx: CanvasRenderingContext2D, definition: BuildPartDefinition, x: number, y: number, width: number, height: number, rotation: BuildPartRotation, preview: boolean, _intensity: number) {
    const color = getMaterialPalette(definition.material);
    const visual = getBuildPartVisual2p5d(definition);
    const wallHeight = visual.renderHeightPx;
    const lowWall = definition.id.includes("half") || definition.id.includes("railing") || definition.id.includes("fence");
    const rect = this.getEdgeWallRect(x, y, width, height, rotation, wallHeight);
    const isSideWall = !rect.horizontal;
    const postSize = isSideWall ? 8 : 10;

    ctx.save();
    ctx.shadowColor = preview ? "rgba(0,0,0,0.10)" : "rgba(0,0,0,0.25)";
    ctx.shadowBlur = preview ? 1 : 4;
    ctx.shadowOffsetY = preview ? 1 : 3;

    if (rect.horizontal) {
      this.drawHorizontalWallFace(ctx, rect, color, wallHeight, lowWall);
    } else {
      this.drawSideWallFace(ctx, rect, color, wallHeight, lowWall, rotation);
    }

    if (definition.id.includes("corner_post")) {
      const postLeft = rect.horizontal ? rect.left + rect.width / 2 - 8 : rect.left - 1;
      const postTop = rect.horizontal ? rect.wallTop - 3 : rect.top + rect.height / 2 - wallHeight / 2 - 5;
      const postWidth = rect.horizontal ? 16 : rect.width + 2;
      const postHeight = rect.horizontal ? wallHeight + 18 : wallHeight + 12;
      this.drawWallPost(ctx, postLeft, postTop, postWidth, postHeight, color);
    }

    if (preview) this.drawCenterMark(ctx, x - width / 2, y - height / 2, width, height);
    ctx.restore();
  }`);

const insertBefore = `  private drawDoorOnEdge`;
if (!source.includes("private drawHorizontalWallFace")) {
  source = source.replace(insertBefore, `  private drawHorizontalWallFace(ctx: CanvasRenderingContext2D, rect: ReturnType<BuildPartRenderer["getEdgeWallRect"]>, color: ReturnType<typeof getMaterialPalette>, wallHeight: number, lowWall: boolean) {
    const postSize = 10;
    const faceLeft = rect.left + postSize;
    const faceWidth = Math.max(8, rect.width - postSize * 2);

    ctx.fillStyle = color.dark;
    ctx.strokeStyle = "rgba(17, 24, 39, 0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(rect.left, rect.top, rect.width, rect.height, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = color.face;
    ctx.strokeStyle = color.dark;
    ctx.beginPath();
    ctx.roundRect(faceLeft, rect.wallTop + 6, faceWidth, wallHeight, 5);
    ctx.fill();
    ctx.stroke();

    this.drawWallPost(ctx, rect.left, rect.wallTop, postSize, wallHeight + rect.height, color);
    this.drawWallPost(ctx, rect.left + rect.width - postSize, rect.wallTop, postSize, wallHeight + rect.height, color);
    this.drawWallBeam(ctx, rect.left + 4, rect.wallTop + 2, rect.width - 8, 8, color);
    this.drawWallBeam(ctx, rect.left + 4, rect.top + 2, rect.width - 8, 8, color);

    if (!lowWall) this.drawWallPanelDetail(ctx, faceLeft, rect.wallTop + 12, faceWidth, wallHeight - 12);
  }

  private drawSideWallFace(ctx: CanvasRenderingContext2D, rect: ReturnType<BuildPartRenderer["getEdgeWallRect"]>, color: ReturnType<typeof getMaterialPalette>, wallHeight: number, lowWall: boolean, rotation: BuildPartRotation) {
    const sideShade = rotation === 90 ? "rgba(0,0,0,0.18)" : "rgba(255,255,255,0.06)";
    const capInset = 3;
    const visibleWidth = Math.max(8, rect.width);
    const faceTop = rect.top + 7;
    const faceHeight = rect.height - 14;
    const lean = rotation === 90 ? -4 : 4;

    ctx.fillStyle = color.dark;
    ctx.strokeStyle = "rgba(17, 24, 39, 0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(rect.left, rect.top, rect.width, rect.height, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = color.side;
    ctx.beginPath();
    ctx.moveTo(rect.left + capInset, faceTop - wallHeight + 12);
    ctx.lineTo(rect.left + visibleWidth - capInset, faceTop - wallHeight + 12 + lean);
    ctx.lineTo(rect.left + visibleWidth - capInset, faceTop + faceHeight);
    ctx.lineTo(rect.left + capInset, faceTop + faceHeight - lean);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = sideShade;
    ctx.fillRect(rect.left + 2, faceTop - wallHeight + 16, Math.max(2, rect.width - 4), wallHeight + faceHeight - 18);

    this.drawWallPost(ctx, rect.left - 1, rect.top - wallHeight + 11, rect.width + 2, wallHeight + 12, color);
    this.drawWallPost(ctx, rect.left - 1, rect.top + rect.height - 10, rect.width + 2, 20, color);
    this.drawWallBeam(ctx, rect.left - 1, rect.top - wallHeight + 14, rect.width + 2, 7, color);
    this.drawWallBeam(ctx, rect.left - 1, rect.top + rect.height - 8, rect.width + 2, 7, color);

    if (!lowWall) {
      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,0.18)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(rect.left + rect.width / 2, rect.top - wallHeight + 25);
      ctx.lineTo(rect.left + rect.width / 2, rect.top + rect.height - 16);
      ctx.stroke();
      ctx.restore();
    }
  }

${insertBefore}`);
  changed = true;
  console.log("[patch-wall-directional-rendering-2p5d] inserted directional wall helpers");
}

replaceBlock("drawDoorOnEdge", `  private drawDoorOnEdge(ctx: CanvasRenderingContext2D, _definition: BuildPartDefinition, x: number, y: number, width: number, height: number, rotation: BuildPartRotation, _preview: boolean, _intensity: number) {
    const rect = this.getEdgeWallRect(x, y, width, height, rotation, BUILD_2P5D_WALL_HEIGHT);
    ctx.save();
    ctx.fillStyle = "#4a2b16";
    ctx.strokeStyle = "#1f1308";
    ctx.lineWidth = 2;
    if (rect.horizontal) {
      const doorWidth = 20;
      const doorHeight = 36;
      const doorX = x - doorWidth / 2;
      const doorY = rect.top - doorHeight + 3;
      ctx.beginPath();
      ctx.roundRect(doorX, doorY, doorWidth, doorHeight, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#facc15";
      ctx.beginPath();
      ctx.arc(doorX + doorWidth - 6, doorY + doorHeight / 2, 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const doorWidth = 8;
      const doorHeight = 34;
      const doorX = rect.left + rect.width / 2 - doorWidth / 2;
      const doorY = y - doorHeight / 2 - 2;
      ctx.beginPath();
      ctx.roundRect(doorX, doorY, doorWidth, doorHeight, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(250,204,21,0.85)";
      ctx.beginPath();
      ctx.arc(doorX + doorWidth / 2, doorY + doorHeight / 2, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }`);

replaceBlock("drawWindowOnEdge", `  private drawWindowOnEdge(ctx: CanvasRenderingContext2D, _definition: BuildPartDefinition, x: number, y: number, width: number, height: number, rotation: BuildPartRotation, _preview: boolean, _intensity: number) {
    const rect = this.getEdgeWallRect(x, y, width, height, rotation, BUILD_2P5D_WALL_HEIGHT);
    ctx.save();
    ctx.fillStyle = "rgba(125, 211, 252, 0.88)";
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2;
    const windowWidth = rect.horizontal ? 26 : 8;
    const windowHeight = rect.horizontal ? 18 : 24;
    const wx = rect.horizontal ? x - windowWidth / 2 : rect.left + rect.width / 2 - windowWidth / 2;
    const wy = rect.horizontal ? rect.top - 35 : y - windowHeight / 2 - 4;
    ctx.beginPath();
    ctx.roundRect(wx, wy, windowWidth, windowHeight, 4);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(wx + windowWidth / 2, wy + 2);
    ctx.lineTo(wx + windowWidth / 2, wy + windowHeight - 2);
    if (rect.horizontal) {
      ctx.moveTo(wx + 2, wy + windowHeight / 2);
      ctx.lineTo(wx + windowWidth - 2, wy + windowHeight / 2);
    }
    ctx.stroke();
    ctx.restore();
  }`);

if (changed) fs.writeFileSync(target, source);
