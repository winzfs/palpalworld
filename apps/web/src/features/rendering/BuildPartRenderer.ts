import { BUILD_GRID_SIZE, buildGridToWorld } from "../buildings/buildGrid";
import { BUILD_PARTS, type BuildPartDefinition, type BuildPartId, type BuildPartRotation, type PlacedBuildPart } from "../buildings/buildPartCatalog";

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
    ctx.save();
    ctx.strokeStyle = valid ? "rgba(34, 197, 94, 0.95)" : "rgba(239, 68, 68, 0.95)";
    ctx.fillStyle = valid ? "rgba(34, 197, 94, 0.12)" : "rgba(239, 68, 68, 0.12)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.roundRect(x - width / 2, y - height / 2, width, height, 6);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  private drawPart(ctx: CanvasRenderingContext2D, definition: BuildPartDefinition, x: number, y: number, rotation: BuildPartRotation, preview: boolean, intensity: number, floorLevel: number) {
    const width = definition.width * BUILD_GRID_SIZE;
    const height = definition.height * BUILD_GRID_SIZE;
    const left = x - width / 2;
    const top = y - height / 2 - floorLevel * 10;

    ctx.save();
    ctx.translate(x, y - floorLevel * 10);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-x, -(y - floorLevel * 10));

    switch (definition.category) {
      case "floor":
        this.drawFloor(ctx, definition, left, top, width, height, preview, intensity);
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
        this.drawRoof(ctx, definition, left, top, width, height, preview, intensity);
        break;
      case "decor":
        this.drawDecor(ctx, definition, left, top, width, height, preview, intensity);
        break;
      default:
        this.drawFloor(ctx, definition, left, top, width, height, preview, intensity);
        break;
    }

    ctx.restore();
  }

  private materialBase(definition: BuildPartDefinition) {
    if (definition.material === "stone") return { fill: "#6b7280", stroke: "#374151", hi: "#9ca3af" };
    if (definition.material === "cloth") return { fill: "#b45309", stroke: "#78350f", hi: "#fbbf24" };
    if (definition.material === "metal") return { fill: "#64748b", stroke: "#334155", hi: "#cbd5e1" };
    return { fill: "#8b5a2b", stroke: "#3b2413", hi: "#d19a55" };
  }

  private drawFloor(ctx: CanvasRenderingContext2D, definition: BuildPartDefinition, left: number, top: number, width: number, height: number, preview: boolean, intensity: number) {
    const color = this.materialBase(definition);
    ctx.fillStyle = color.fill;
    ctx.strokeStyle = color.stroke;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(left + 2, top + 2, width - 4, height - 4, 5);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = preview ? "rgba(255,255,255,0.26)" : "rgba(255,255,255,0.16)";
    ctx.lineWidth = 1;
    for (let offset = 10; offset < width; offset += 12) {
      ctx.beginPath();
      ctx.moveTo(left + offset, top + 6);
      ctx.lineTo(left + offset - 8, top + height - 6);
      ctx.stroke();
    }
    ctx.fillStyle = color.hi;
    ctx.globalAlpha *= 0.2 * intensity;
    ctx.fillRect(left + 6, top + 6, width - 12, 4);
    ctx.globalAlpha /= 0.2 * intensity || 1;
  }

  private drawWall(ctx: CanvasRenderingContext2D, definition: BuildPartDefinition, left: number, top: number, width: number, height: number, preview: boolean, _intensity: number) {
    const color = this.materialBase(definition);
    const wallHeight = definition.id.includes("half") || definition.id.includes("railing") || definition.id.includes("fence") ? 20 : 34;
    const y = top + height / 2 - wallHeight / 2;
    ctx.fillStyle = color.fill;
    ctx.strokeStyle = color.stroke;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(left + 4, y, width - 8, wallHeight, 6);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = color.hi;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(left + 9, y + 7);
    ctx.lineTo(left + width - 9, y + 7);
    ctx.stroke();
    if (preview) this.drawCenterMark(ctx, left, top, width, height);
  }

  private drawDoor(ctx: CanvasRenderingContext2D, definition: BuildPartDefinition, left: number, top: number, width: number, height: number, preview: boolean, intensity: number) {
    this.drawWall(ctx, definition, left, top, width, height, preview, intensity);
    ctx.fillStyle = "#4a2b16";
    ctx.strokeStyle = "#1f1308";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(left + width / 2 - 10, top + height / 2 - 17, 20, 34, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.arc(left + width / 2 + 5, top + height / 2, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawWindow(ctx: CanvasRenderingContext2D, definition: BuildPartDefinition, left: number, top: number, width: number, height: number, preview: boolean, intensity: number) {
    this.drawWall(ctx, definition, left, top, width, height, preview, intensity);
    ctx.fillStyle = "rgba(125, 211, 252, 0.82)";
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(left + width / 2 - 12, top + height / 2 - 11, 24, 22, 4);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(left + width / 2, top + height / 2 - 10);
    ctx.lineTo(left + width / 2, top + height / 2 + 10);
    ctx.moveTo(left + width / 2 - 11, top + height / 2);
    ctx.lineTo(left + width / 2 + 11, top + height / 2);
    ctx.stroke();
  }

  private drawStairs(ctx: CanvasRenderingContext2D, definition: BuildPartDefinition, left: number, top: number, width: number, height: number, _preview: boolean, _intensity: number) {
    const color = this.materialBase(definition);
    ctx.fillStyle = color.fill;
    ctx.strokeStyle = color.stroke;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(left + 6, top + 4, width - 12, height - 8, 6);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = color.hi;
    ctx.lineWidth = 3;
    const steps = 5;
    for (let step = 0; step < steps; step += 1) {
      const yy = top + 12 + step * ((height - 24) / Math.max(1, steps - 1));
      ctx.beginPath();
      ctx.moveTo(left + 10, yy);
      ctx.lineTo(left + width - 10, yy);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = "11px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("2F", left + width / 2, top + height / 2 + 4);
  }

  private drawRoof(ctx: CanvasRenderingContext2D, definition: BuildPartDefinition, left: number, top: number, width: number, height: number, _preview: boolean, _intensity: number) {
    const color = this.materialBase(definition);
    ctx.fillStyle = definition.material === "cloth" ? "#b45309" : "#7f1d1d";
    ctx.strokeStyle = color.stroke;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(left + width / 2, top + 5);
    ctx.lineTo(left + width - 5, top + height / 2);
    ctx.lineTo(left + width / 2, top + height - 5);
    ctx.lineTo(left + 5, top + height / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  private drawDecor(ctx: CanvasRenderingContext2D, definition: BuildPartDefinition, left: number, top: number, width: number, height: number, _preview: boolean, _intensity: number) {
    const color = this.materialBase(definition);
    ctx.fillStyle = color.fill;
    ctx.strokeStyle = color.stroke;
    ctx.lineWidth = 2;
    if (definition.id.includes("lamp")) {
      ctx.fillRect(left + width / 2 - 3, top + 12, 6, height - 18);
      ctx.fillStyle = "#facc15";
      ctx.beginPath();
      ctx.arc(left + width / 2, top + 12, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.roundRect(left + 10, top + 12, width - 20, height - 24, 5);
      ctx.fill();
      ctx.stroke();
    }
  }

  private drawCenterMark(ctx: CanvasRenderingContext2D, left: number, top: number, width: number, height: number) {
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.28)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(left + width / 2, top + 6);
    ctx.lineTo(left + width / 2, top + height - 6);
    ctx.stroke();
    ctx.restore();
  }
}
