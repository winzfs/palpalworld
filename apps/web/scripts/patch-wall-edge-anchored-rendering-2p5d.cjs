const fs = require("fs");
const path = require("path");

const target = path.join(__dirname, "..", "src", "features", "rendering", "BuildPartRenderer.ts");
let source = fs.readFileSync(target, "utf8");
let changed = false;

function replaceOnce(search, replacement, label) {
  if (!source.includes(search)) {
    console.log(`[patch-wall-edge-anchored-rendering-2p5d] skipped ${label}`);
    return;
  }
  source = source.replace(search, replacement);
  changed = true;
  console.log(`[patch-wall-edge-anchored-rendering-2p5d] patched ${label}`);
}

function insertBefore(search, insertion, label) {
  if (source.includes(insertion.slice(0, 80))) return;
  replaceOnce(search, `${insertion}\n\n${search}`, label);
}

replaceOnce(
`    ctx.save();
    ctx.translate(x, visualY);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-x, -visualY);

    if (visual.shadow) this.drawSoftShadow(ctx, left, top, width, height, visual.renderHeightPx, preview);

    switch (definition.category) {
      case "floor":
        this.drawFloor(ctx, definition, left, top, width, height, preview, intensity, floorLevel);
        break;
      case "wall":
        this.drawWall(ctx, definition, left, top, width, height, preview, intensity);
        break;
      case "door":
        this.drawDoor(ctx, definition, left, top, width, height, preview, intensity);
        break;
      case "window":
        this.drawWindow(ctx, definition, left, top, width, height, preview, intensity);
        break;`,
`    ctx.save();
    const isEdgeAnchored = definition.category === "wall" || definition.category === "door" || definition.category === "window";
    if (!isEdgeAnchored) {
      ctx.translate(x, visualY);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-x, -visualY);
    }

    if (visual.shadow) this.drawSoftShadow(ctx, left, top, width, height, visual.renderHeightPx, preview);

    switch (definition.category) {
      case "floor":
        this.drawFloor(ctx, definition, left, top, width, height, preview, intensity, floorLevel);
        break;
      case "wall":
        this.drawWallEdgeAnchored(ctx, definition, x, visualY, width, height, rotation, preview, intensity);
        break;
      case "door":
        this.drawWallEdgeAnchored(ctx, definition, x, visualY, width, height, rotation, preview, intensity);
        this.drawDoorOnEdge(ctx, definition, x, visualY, width, height, rotation, preview, intensity);
        break;
      case "window":
        this.drawWallEdgeAnchored(ctx, definition, x, visualY, width, height, rotation, preview, intensity);
        this.drawWindowOnEdge(ctx, definition, x, visualY, width, height, rotation, preview, intensity);
        break;`,
"edge anchored switch",
);

insertBefore(
`  private drawEdgeGuide(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, rotation: BuildPartRotation, valid: boolean) {`,
`  private getEdgeWallRect(x: number, y: number, width: number, height: number, rotation: BuildPartRotation, wallHeight: number) {
    const thickness = 14;
    const overhang = 2;
    const left = x - width / 2;
    const top = y - height / 2;
    const right = x + width / 2;
    const bottom = y + height / 2;
    if (rotation === 90) return { left: right - thickness + overhang, top: top + 5, width: thickness, height: height - 10, wallTop: top + 5 - wallHeight + 12, horizontal: false };
    if (rotation === 180) return { left: left + 5, top: bottom - thickness + overhang, width: width - 10, height: thickness, wallTop: bottom - thickness + overhang - wallHeight + 12, horizontal: true };
    if (rotation === 270) return { left: left - overhang, top: top + 5, width: thickness, height: height - 10, wallTop: top + 5 - wallHeight + 12, horizontal: false };
    return { left: left + 5, top: top - overhang, width: width - 10, height: thickness, wallTop: top - overhang - wallHeight + 12, horizontal: true };
  }

  private drawWallEdgeAnchored(ctx: CanvasRenderingContext2D, definition: BuildPartDefinition, x: number, y: number, width: number, height: number, rotation: BuildPartRotation, preview: boolean, _intensity: number) {
    const color = getMaterialPalette(definition.material);
    const visual = getBuildPartVisual2p5d(definition);
    const wallHeight = visual.renderHeightPx;
    const lowWall = definition.id.includes("half") || definition.id.includes("railing") || definition.id.includes("fence");
    const rect = this.getEdgeWallRect(x, y, width, height, rotation, wallHeight);
    const postSize = 10;

    ctx.save();
    ctx.shadowColor = preview ? "rgba(0,0,0,0.10)" : "rgba(0,0,0,0.25)";
    ctx.shadowBlur = preview ? 1 : 4;
    ctx.shadowOffsetY = preview ? 1 : 3;

    ctx.fillStyle = color.dark;
    ctx.strokeStyle = "rgba(17, 24, 39, 0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(rect.left, rect.top, rect.width, rect.height, 4);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    const facePadding = 4;
    if (rect.horizontal) {
      const faceLeft = rect.left + postSize;
      const faceWidth = Math.max(8, rect.width - postSize * 2);
      ctx.fillStyle = color.face;
      ctx.strokeStyle = color.dark;
      ctx.beginPath();
      ctx.roundRect(faceLeft, rect.wallTop + 6, faceWidth, wallHeight, 5);
      ctx.fill();
      ctx.stroke();
      for (const px of [rect.left, rect.left + rect.width - postSize]) {
        this.drawWallPost(ctx, px, rect.wallTop, postSize, wallHeight + rect.height, color);
      }
      this.drawWallBeam(ctx, rect.left + facePadding, rect.wallTop + 2, rect.width - facePadding * 2, 8, color);
      this.drawWallBeam(ctx, rect.left + facePadding, rect.top + 2, rect.width - facePadding * 2, 8, color);
      if (!lowWall) this.drawWallPanelDetail(ctx, faceLeft, rect.wallTop + 12, faceWidth, wallHeight - 12);
    } else {
      const faceTop = rect.top + postSize;
      const faceHeight = Math.max(8, rect.height - postSize * 2);
      ctx.fillStyle = color.face;
      ctx.strokeStyle = color.dark;
      ctx.beginPath();
      ctx.roundRect(rect.left, faceTop - wallHeight + 10, rect.width, faceHeight + wallHeight - 10, 5);
      ctx.fill();
      ctx.stroke();
      for (const py of [rect.top, rect.top + rect.height - postSize]) {
        this.drawWallPost(ctx, rect.left - 1, py - wallHeight + 8, rect.width + 2, wallHeight + postSize, color);
      }
      this.drawWallBeam(ctx, rect.left - 1, rect.top - wallHeight + 10, rect.width + 2, 8, color);
      this.drawWallBeam(ctx, rect.left - 1, rect.top + rect.height - 8, rect.width + 2, 8, color);
    }

    if (preview) this.drawCenterMark(ctx, x - width / 2, y - height / 2, width, height);
    ctx.restore();
  }

  private drawWallPost(ctx: CanvasRenderingContext2D, left: number, top: number, width: number, height: number, color: ReturnType<typeof getMaterialPalette>) {
    ctx.fillStyle = color.side;
    ctx.strokeStyle = color.dark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(left, top, width, height, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = color.light;
    ctx.fillRect(left + 2, top + 3, Math.max(2, width - 4), 5);
  }

  private drawWallBeam(ctx: CanvasRenderingContext2D, left: number, top: number, width: number, height: number, color: ReturnType<typeof getMaterialPalette>) {
    ctx.fillStyle = color.side;
    ctx.strokeStyle = color.dark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(left, top, width, height, 4);
    ctx.fill();
    ctx.stroke();
  }

  private drawWallPanelDetail(ctx: CanvasRenderingContext2D, left: number, top: number, width: number, height: number) {
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(left + 5, top + 2);
    ctx.lineTo(left + width - 5, top + 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(0,0,0,0.14)";
    for (let offset = 10; offset < width - 8; offset += 13) {
      ctx.beginPath();
      ctx.moveTo(left + offset, top + 6);
      ctx.lineTo(left + offset - 4, top + height - 4);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawDoorOnEdge(ctx: CanvasRenderingContext2D, _definition: BuildPartDefinition, x: number, y: number, width: number, height: number, rotation: BuildPartRotation, _preview: boolean, _intensity: number) {
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
      const doorWidth = 12;
      const doorHeight = 32;
      const doorX = rect.left + rect.width / 2 - doorWidth / 2;
      const doorY = y - doorHeight / 2;
      ctx.beginPath();
      ctx.roundRect(doorX, doorY, doorWidth, doorHeight, 4);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawWindowOnEdge(ctx: CanvasRenderingContext2D, _definition: BuildPartDefinition, x: number, y: number, width: number, height: number, rotation: BuildPartRotation, _preview: boolean, _intensity: number) {
    const rect = this.getEdgeWallRect(x, y, width, height, rotation, BUILD_2P5D_WALL_HEIGHT);
    ctx.save();
    ctx.fillStyle = "rgba(125, 211, 252, 0.88)";
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2;
    const windowWidth = rect.horizontal ? 26 : 12;
    const windowHeight = rect.horizontal ? 18 : 26;
    const wx = rect.horizontal ? x - windowWidth / 2 : rect.left + rect.width / 2 - windowWidth / 2;
    const wy = rect.horizontal ? rect.top - 35 : y - windowHeight / 2;
    ctx.beginPath();
    ctx.roundRect(wx, wy, windowWidth, windowHeight, 4);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(wx + windowWidth / 2, wy + 2);
    ctx.lineTo(wx + windowWidth / 2, wy + windowHeight - 2);
    ctx.moveTo(wx + 2, wy + windowHeight / 2);
    ctx.lineTo(wx + windowWidth - 2, wy + windowHeight / 2);
    ctx.stroke();
    ctx.restore();
  }`,
"edge anchored helper methods",
);

if (changed) fs.writeFileSync(target, source);
