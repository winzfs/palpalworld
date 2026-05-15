import { BUILD_GRID_SIZE, buildGridToWorld } from "../buildings/buildGrid";
import { BUILD_PARTS, type BuildPartDefinition, type BuildPartId, type BuildPartRotation, type PlacedBuildPart } from "../buildings/buildPartCatalog";
import {
  BUILD_2P5D_FLOOR_HEIGHT,
  BUILD_2P5D_ROOF_RISE,
  BUILD_2P5D_WALL_HEIGHT,
  getBuildPartVisual2p5d,
  getMaterialPalette,
} from "../buildings/buildPartVisual2p5d";

export class BuildPartRenderer {
  drawPlacedPart(ctx: CanvasRenderingContext2D, part: PlacedBuildPart, cameraX: number, cameraY: number) {
    const definition = BUILD_PARTS[part.partId];
    if (!definition) return;
    const world = buildGridToWorld(part);
    this.drawPart(ctx, definition, world.x - cameraX, world.y - cameraY, part.rotation, false, 1, part.floorLevel);
  }

  drawPreview(ctx: CanvasRenderingContext2D, partId: BuildPartId, x: number, y: number, rotation: BuildPartRotation, valid: boolean, alpha = 0.48, floorLevel = 0) {
    const definition = BUILD_PARTS[partId];
    if (!definition) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    this.drawPart(ctx, definition, x, y, rotation, true, valid ? 1 : 0.75, floorLevel);
    ctx.restore();

    const width = definition.width * BUILD_GRID_SIZE;
    const height = definition.height * BUILD_GRID_SIZE;
    const visualY = y - floorLevel * BUILD_2P5D_FLOOR_HEIGHT;
    ctx.save();
    ctx.strokeStyle = valid ? "rgba(34, 197, 94, 0.95)" : "rgba(239, 68, 68, 0.95)";
    ctx.fillStyle = valid ? "rgba(34, 197, 94, 0.12)" : "rgba(239, 68, 68, 0.12)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.roundRect(x - width / 2, visualY - height / 2, width, height, 6);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    if (definition.category === "wall" || definition.category === "door" || definition.category === "window") {
      this.drawEdgeGuide(ctx, x, visualY, width, height, rotation, valid);
    }
  }

  private drawPart(ctx: CanvasRenderingContext2D, definition: BuildPartDefinition, x: number, y: number, rotation: BuildPartRotation, preview: boolean, intensity: number, floorLevel: number) {
    const width = definition.width * BUILD_GRID_SIZE;
    const height = definition.height * BUILD_GRID_SIZE;
    const visual = getBuildPartVisual2p5d(definition);
    const visualY = y - floorLevel * BUILD_2P5D_FLOOR_HEIGHT;
    const left = x - width / 2;
    const top = visualY - height / 2;

    ctx.save();
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
        break;
      case "stairs":
        this.drawStairs(ctx, definition, left, top, width, height, preview, intensity);
        break;
      case "roof":
        this.drawRoof(ctx, definition, left, top, width, height, preview, intensity, floorLevel);
        break;
      case "decor":
        this.drawDecor(ctx, definition, left, top, width, height, preview, intensity);
        break;
      default:
        this.drawFloor(ctx, definition, left, top, width, height, preview, intensity, floorLevel);
        break;
    }

    ctx.restore();
  }

  private drawEdgeGuide(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, rotation: BuildPartRotation, valid: boolean) {
    const edgeColor = valid ? "rgba(74, 222, 128, 0.96)" : "rgba(248, 113, 113, 0.96)";
    const label = rotation === 90 ? "E" : rotation === 180 ? "S" : rotation === 270 ? "W" : "N";
    const left = x - width / 2;
    const right = x + width / 2;
    const top = y - height / 2;
    const bottom = y + height / 2;
    let x1 = left;
    let y1 = top;
    let x2 = right;
    let y2 = top;
    let labelX = x;
    let labelY = top - 8;

    if (rotation === 90) {
      x1 = right; y1 = top; x2 = right; y2 = bottom; labelX = right + 10; labelY = y;
    } else if (rotation === 180) {
      x1 = left; y1 = bottom; x2 = right; y2 = bottom; labelX = x; labelY = bottom + 15;
    } else if (rotation === 270) {
      x1 = left; y1 = top; x2 = left; y2 = bottom; labelX = left - 10; labelY = y;
    }

    ctx.save();
    ctx.strokeStyle = edgeColor;
    ctx.fillStyle = edgeColor;
    ctx.lineWidth = 4;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.font = "bold 11px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, labelX, labelY);
    ctx.restore();
  }

  private drawSoftShadow(ctx: CanvasRenderingContext2D, left: number, top: number, width: number, height: number, renderHeight: number, preview: boolean) {
    ctx.save();
    ctx.fillStyle = preview ? "rgba(0, 0, 0, 0.16)" : "rgba(0, 0, 0, 0.28)";
    ctx.beginPath();
    ctx.ellipse(left + width / 2 + 8, top + height / 2 + 12, width * 0.46, Math.max(9, height * 0.18 + renderHeight * 0.06), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawFloor(ctx: CanvasRenderingContext2D, definition: BuildPartDefinition, left: number, top: number, width: number, height: number, preview: boolean, intensity: number, floorLevel: number) {
    const color = getMaterialPalette(definition.material);
    const slabDepth = definition.layer === "foundation" ? 12 : 7;
    const isUpperFloor = floorLevel > 0 || definition.id.includes("second_floor");

    ctx.fillStyle = color.side;
    ctx.strokeStyle = color.dark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(left + 4, top + 7, width - 8, height - 6 + slabDepth, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isUpperFloor ? color.light : color.base;
    ctx.strokeStyle = color.dark;
    ctx.beginPath();
    ctx.roundRect(left + 3, top + 2, width - 6, height - 7, 6);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = preview ? "rgba(255,255,255,0.32)" : "rgba(255,255,255,0.18)";
    ctx.lineWidth = 1;
    for (let offset = 9; offset < width - 4; offset += 12) {
      ctx.beginPath();
      ctx.moveTo(left + offset, top + 6);
      ctx.lineTo(left + offset - 7, top + height - 11);
      ctx.stroke();
    }

    if (isUpperFloor) {
      ctx.save();
      ctx.globalAlpha *= 0.38 * intensity;
      ctx.fillStyle = "rgba(255,255,255,0.16)";
      ctx.fillRect(left + 8, top + 7, width - 16, 5);
      ctx.restore();
    }
  }

  private drawWall(ctx: CanvasRenderingContext2D, definition: BuildPartDefinition, left: number, top: number, width: number, height: number, preview: boolean, _intensity: number) {
    const color = getMaterialPalette(definition.material);
    const visual = getBuildPartVisual2p5d(definition);
    const wallHeight = visual.renderHeightPx;
    const wallTop = top + height / 2 - wallHeight;
    const wallBottom = top + height / 2 + 8;
    const faceLeft = left + 6;
    const faceWidth = width - 12;

    ctx.fillStyle = color.side;
    ctx.strokeStyle = color.dark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(faceLeft, wallTop + 8);
    ctx.lineTo(faceLeft + faceWidth, wallTop + 2);
    ctx.lineTo(faceLeft + faceWidth, wallBottom);
    ctx.lineTo(faceLeft, wallBottom + 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = color.face;
    ctx.beginPath();
    ctx.roundRect(faceLeft + 2, wallTop, faceWidth - 4, wallHeight, 5);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = color.light;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(faceLeft + 7, wallTop + 8);
    ctx.lineTo(faceLeft + faceWidth - 7, wallTop + 8);
    ctx.stroke();

    ctx.strokeStyle = "rgba(0,0,0,0.2)";
    ctx.lineWidth = 1;
    for (let offset = 12; offset < faceWidth - 6; offset += 14) {
      ctx.beginPath();
      ctx.moveTo(faceLeft + offset, wallTop + 8);
      ctx.lineTo(faceLeft + offset - 4, wallBottom - 6);
      ctx.stroke();
    }

    if (preview) this.drawCenterMark(ctx, left, top, width, height);
  }

  private drawDoor(ctx: CanvasRenderingContext2D, definition: BuildPartDefinition, left: number, top: number, width: number, height: number, preview: boolean, intensity: number) {
    this.drawWall(ctx, definition, left, top, width, height, preview, intensity);
    const wallTop = top + height / 2 - BUILD_2P5D_WALL_HEIGHT;
    const doorHeight = 38;
    const doorWidth = 20;
    const doorX = left + width / 2 - doorWidth / 2;
    const doorY = wallTop + BUILD_2P5D_WALL_HEIGHT - doorHeight;

    ctx.fillStyle = "#4a2b16";
    ctx.strokeStyle = "#1f1308";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(doorX, doorY, doorWidth, doorHeight, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.arc(doorX + doorWidth - 6, doorY + doorHeight / 2, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawWindow(ctx: CanvasRenderingContext2D, definition: BuildPartDefinition, left: number, top: number, width: number, height: number, preview: boolean, intensity: number) {
    this.drawWall(ctx, definition, left, top, width, height, preview, intensity);
    const wallTop = top + height / 2 - BUILD_2P5D_WALL_HEIGHT;
    const windowWidth = 26;
    const windowHeight = 20;
    const wx = left + width / 2 - windowWidth / 2;
    const wy = wallTop + 17;

    ctx.fillStyle = "rgba(125, 211, 252, 0.88)";
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2;
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
  }

  private drawStairs(ctx: CanvasRenderingContext2D, definition: BuildPartDefinition, left: number, top: number, width: number, height: number, _preview: boolean, _intensity: number) {
    const color = getMaterialPalette(definition.material);
    const rise = Math.min(44, BUILD_2P5D_WALL_HEIGHT);

    ctx.fillStyle = color.side;
    ctx.strokeStyle = color.dark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(left + 8, top + 7, width - 16, height - 10, 6);
    ctx.fill();
    ctx.stroke();

    const steps = 6;
    for (let step = 0; step < steps; step += 1) {
      const t = step / Math.max(1, steps - 1);
      const y = top + height - 9 - t * (height - 20);
      const stepRise = t * rise;
      ctx.fillStyle = step % 2 === 0 ? color.base : color.face;
      ctx.strokeStyle = color.dark;
      ctx.beginPath();
      ctx.roundRect(left + 12, y - stepRise * 0.18, width - 24, 7, 3);
      ctx.fill();
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "10px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("UP", left + width / 2, top + height / 2 - 8);
  }

  private drawRoof(ctx: CanvasRenderingContext2D, definition: BuildPartDefinition, left: number, top: number, width: number, height: number, _preview: boolean, _intensity: number, floorLevel: number) {
    const color = getMaterialPalette(definition.material);
    const roofTop = top - BUILD_2P5D_ROOF_RISE - Math.max(0, floorLevel - 1) * 4;
    const roofMidY = top + height / 2 - 8;

    ctx.fillStyle = definition.material === "cloth" ? color.face : color.roof;
    ctx.strokeStyle = color.dark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(left + width / 2, roofTop);
    ctx.lineTo(left + width - 3, roofMidY);
    ctx.lineTo(left + width - 8, roofMidY + 20);
    ctx.lineTo(left + width / 2, roofTop + 12);
    ctx.lineTo(left + 8, roofMidY + 20);
    ctx.lineTo(left + 3, roofMidY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.beginPath();
    ctx.moveTo(left + width / 2, roofTop + 4);
    ctx.lineTo(left + width / 2, roofMidY + 18);
    ctx.stroke();
  }

  private drawDecor(ctx: CanvasRenderingContext2D, definition: BuildPartDefinition, left: number, top: number, width: number, height: number, _preview: boolean, _intensity: number) {
    const color = getMaterialPalette(definition.material);
    ctx.fillStyle = color.fill;
    ctx.strokeStyle = color.dark;
    ctx.lineWidth = 2;
    if (definition.id.includes("lamp")) {
      ctx.fillRect(left + width / 2 - 3, top + 5, 6, height - 12);
      ctx.fillStyle = "#facc15";
      ctx.beginPath();
      ctx.arc(left + width / 2, top + 5, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.roundRect(left + 10, top + 12, width - 20, height - 22, 5);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.fillRect(left + 14, top + 16, width - 28, 4);
    }
  }

  private drawCenterMark(ctx: CanvasRenderingContext2D, left: number, top: number, width: number, height: number) {
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.32)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(left + width / 2, top + 6);
    ctx.lineTo(left + width / 2, top + height - 6);
    ctx.stroke();
    ctx.restore();
  }
}
