import { BUILD_GRID_SIZE, buildGridToWorld } from "../buildings/buildGrid";
import { BUILD_PARTS, type BuildPartDefinition, type BuildPartId, type BuildPartRotation, type PlacedBuildPart } from "../buildings/buildPartCatalog";
import { getEdgeWallRect2p5d, getTileBounds2p5d, type EdgeWallRect2p5d } from "../buildings/buildProjection2p5d";
import {
  BUILD_2P5D_FLOOR_HEIGHT,
  BUILD_2P5D_ROOF_RISE,
  BUILD_2P5D_WALL_HEIGHT,
  getBuildPartVisual2p5d,
  getMaterialPalette,
  type BuildMaterialPalette,
} from "../buildings/buildPartVisual2p5d";

const FLOOR_INSET = 1;
const FLOOR_SLAB_DEPTH = 6;
const FOUNDATION_SLAB_DEPTH = 10;
const FRONT_WALL_INSET = 1;
const SIDE_WALL_WIDTH = 8;

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
    ctx.fillStyle = valid ? "rgba(34, 197, 94, 0.10)" : "rgba(239, 68, 68, 0.10)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.roundRect(x - width / 2, visualY - height / 2, width, height, 5);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    if (this.isEdgeAnchored(definition)) this.drawEdgeGuide(ctx, x, visualY, width, height, rotation, valid);
  }

  private drawPart(ctx: CanvasRenderingContext2D, definition: BuildPartDefinition, x: number, y: number, rotation: BuildPartRotation, preview: boolean, intensity: number, floorLevel: number) {
    const width = definition.width * BUILD_GRID_SIZE;
    const height = definition.height * BUILD_GRID_SIZE;
    const visual = getBuildPartVisual2p5d(definition);
    const visualY = y - floorLevel * BUILD_2P5D_FLOOR_HEIGHT;
    const left = x - width / 2;
    const top = visualY - height / 2;
    const edgeAnchored = this.isEdgeAnchored(definition);

    ctx.save();
    if (!edgeAnchored) {
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
        this.drawWall(ctx, definition, x, visualY, width, height, rotation, preview);
        break;
      case "door":
        this.drawWall(ctx, definition, x, visualY, width, height, rotation, preview);
        this.drawDoorOnWall(ctx, x, visualY, width, height, rotation);
        break;
      case "window":
        this.drawWall(ctx, definition, x, visualY, width, height, rotation, preview);
        this.drawWindowOnWall(ctx, x, visualY, width, height, rotation);
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

  private isEdgeAnchored(definition: BuildPartDefinition) {
    return definition.category === "wall" || definition.category === "door" || definition.category === "window";
  }

  private getWallRect(x: number, y: number, width: number, height: number, rotation: BuildPartRotation, wallHeight: number) {
    const rect = getEdgeWallRect2p5d({ x, y, width, height, rotation, wallHeight });
    if (rect.horizontal) {
      return {
        ...rect,
        left: x - width / 2 + FRONT_WALL_INSET,
        width: width - FRONT_WALL_INSET * 2,
      };
    }
    const centerX = rect.edge === "east" ? x + width / 2 - SIDE_WALL_WIDTH / 2 : x - width / 2 + SIDE_WALL_WIDTH / 2;
    return {
      ...rect,
      left: centerX - SIDE_WALL_WIDTH / 2,
      width: SIDE_WALL_WIDTH,
      top: y - height / 2 + FRONT_WALL_INSET,
      height: height - FRONT_WALL_INSET * 2,
    };
  }

  private drawEdgeGuide(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, rotation: BuildPartRotation, valid: boolean) {
    const rect = this.getWallRect(x, y, width, height, rotation, BUILD_2P5D_WALL_HEIGHT);
    const edgeColor = valid ? "rgba(250, 204, 21, 0.95)" : "rgba(248, 113, 113, 0.95)";
    ctx.save();
    ctx.strokeStyle = edgeColor;
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.beginPath();
    if (rect.horizontal) {
      ctx.moveTo(rect.left, rect.top);
      ctx.lineTo(rect.left + rect.width, rect.top);
    } else {
      const cx = rect.left + rect.width / 2;
      ctx.moveTo(cx, rect.top);
      ctx.lineTo(cx, rect.top + rect.height);
    }
    ctx.stroke();
    ctx.restore();
  }

  private drawSoftShadow(ctx: CanvasRenderingContext2D, left: number, top: number, width: number, height: number, renderHeight: number, preview: boolean) {
    ctx.save();
    ctx.fillStyle = preview ? "rgba(0, 0, 0, 0.12)" : "rgba(0, 0, 0, 0.22)";
    ctx.beginPath();
    ctx.ellipse(left + width / 2 + 6, top + height / 2 + 10, width * 0.43, Math.max(7, height * 0.15 + renderHeight * 0.04), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawFloor(ctx: CanvasRenderingContext2D, definition: BuildPartDefinition, left: number, top: number, width: number, height: number, preview: boolean, intensity: number, floorLevel: number) {
    const color = getMaterialPalette(definition.material);
    const slabDepth = definition.layer === "foundation" ? FOUNDATION_SLAB_DEPTH : FLOOR_SLAB_DEPTH;
    const isUpperFloor = floorLevel > 0 || definition.id.includes("second_floor");
    const x = left + FLOOR_INSET;
    const y = top + FLOOR_INSET;
    const w = width - FLOOR_INSET * 2;
    const h = height - FLOOR_INSET * 2 - slabDepth;

    ctx.save();
    ctx.shadowColor = preview ? "rgba(0,0,0,0.08)" : "rgba(0,0,0,0.18)";
    ctx.shadowBlur = preview ? 1 : 3;
    ctx.shadowOffsetY = 2;

    ctx.fillStyle = color.dark;
    ctx.strokeStyle = "rgba(15,23,42,0.88)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y + slabDepth, w, h, 4);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = isUpperFloor ? color.light : color.base;
    ctx.strokeStyle = color.dark;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = color.side;
    ctx.globalAlpha *= 0.95;
    ctx.fillRect(x, y, w, 5);
    ctx.fillRect(x, y + h - 5, w, 5);
    ctx.fillRect(x, y, 5, h);
    ctx.fillRect(x + w - 5, y, 5, h);

    ctx.globalAlpha *= 0.85;
    ctx.strokeStyle = definition.material === "stone" ? "rgba(30,41,59,0.32)" : "rgba(255,255,255,0.17)";
    ctx.lineWidth = 1;
    if (definition.material === "stone") {
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
  }

  private drawWall(ctx: CanvasRenderingContext2D, definition: BuildPartDefinition, x: number, y: number, width: number, height: number, rotation: BuildPartRotation, preview: boolean) {
    const color = getMaterialPalette(definition.material);
    const visual = getBuildPartVisual2p5d(definition);
    const wallHeight = definition.id.includes("half") || definition.id.includes("railing") || definition.id.includes("fence") ? Math.min(26, visual.renderHeightPx) : visual.renderHeightPx;
    const rect = this.getWallRect(x, y, width, height, rotation, wallHeight);
    ctx.save();
    ctx.shadowColor = preview ? "rgba(0,0,0,0.08)" : "rgba(0,0,0,0.18)";
    ctx.shadowBlur = preview ? 1 : 3;
    ctx.shadowOffsetY = 2;
    if (rect.horizontal) this.drawFrontWallPlane(ctx, rect, color, wallHeight);
    else this.drawSideWallPlane(ctx, rect, color, wallHeight);
    ctx.restore();
  }

  private drawFrontWallPlane(ctx: CanvasRenderingContext2D, rect: EdgeWallRect2p5d, color: BuildMaterialPalette, wallHeight: number) {
    const bottom = rect.top + 1;
    const top = bottom - wallHeight;
    const postW = 5;

    ctx.fillStyle = color.dark;
    ctx.strokeStyle = "rgba(15,23,42,0.9)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(rect.left, bottom - 4, rect.width, 8, 3);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = color.face;
    ctx.strokeStyle = color.dark;
    ctx.beginPath();
    ctx.roundRect(rect.left, top, rect.width, wallHeight, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = color.side;
    ctx.fillRect(rect.left, top, postW, wallHeight + 4);
    ctx.fillRect(rect.left + rect.width - postW, top, postW, wallHeight + 4);
    ctx.fillRect(rect.left, top, rect.width, 5);
    ctx.fillRect(rect.left, bottom - 5, rect.width, 5);

    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(rect.left + postW + 4, top + 10);
    ctx.lineTo(rect.left + rect.width - postW - 4, top + 10);
    ctx.stroke();
  }

  private drawSideWallPlane(ctx: CanvasRenderingContext2D, rect: EdgeWallRect2p5d, color: BuildMaterialPalette, wallHeight: number) {
    const centerX = rect.left + rect.width / 2;
    const wallW = Math.min(SIDE_WALL_WIDTH, rect.width);
    const top = rect.top - wallHeight + 10;
    const bottom = rect.top + rect.height;
    const lean = rect.edge === "east" ? -2 : 2;

    ctx.fillStyle = color.dark;
    ctx.strokeStyle = "rgba(15,23,42,0.9)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(centerX - wallW / 2, rect.top, wallW, rect.height, 3);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = color.side;
    ctx.strokeStyle = color.dark;
    ctx.beginPath();
    ctx.moveTo(centerX - wallW / 2, top);
    ctx.lineTo(centerX + wallW / 2, top + lean);
    ctx.lineTo(centerX + wallW / 2, bottom - 3);
    ctx.lineTo(centerX - wallW / 2, bottom - 3 - lean);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.fillRect(centerX - wallW / 2 + 2, top + 8, Math.max(2, wallW - 4), wallHeight + rect.height - 18);
    ctx.fillStyle = color.light;
    ctx.fillRect(centerX - wallW / 2, top, wallW, 5);
    ctx.fillRect(centerX - wallW / 2, bottom - 7, wallW, 5);
  }

  private drawDoorOnWall(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, rotation: BuildPartRotation) {
    const rect = this.getWallRect(x, y, width, height, rotation, BUILD_2P5D_WALL_HEIGHT);
    ctx.save();
    ctx.fillStyle = "#4a2b16";
    ctx.strokeStyle = "#1f1308";
    ctx.lineWidth = 1.5;
    if (rect.horizontal) {
      const doorW = 18;
      const doorH = 31;
      const doorX = x - doorW / 2;
      const doorY = rect.top - doorH + 1;
      ctx.beginPath();
      ctx.roundRect(doorX, doorY, doorW, doorH, 3);
      ctx.fill();
      ctx.stroke();
    } else {
      const doorW = 5;
      const doorH = 28;
      const doorX = rect.left + rect.width / 2 - doorW / 2;
      const doorY = y - doorH / 2 - 2;
      ctx.beginPath();
      ctx.roundRect(doorX, doorY, doorW, doorH, 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawWindowOnWall(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, rotation: BuildPartRotation) {
    const rect = this.getWallRect(x, y, width, height, rotation, BUILD_2P5D_WALL_HEIGHT);
    ctx.save();
    ctx.fillStyle = "rgba(125,211,252,0.84)";
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 1.5;
    const windowW = rect.horizontal ? 22 : 5;
    const windowH = rect.horizontal ? 15 : 20;
    const wx = rect.horizontal ? x - windowW / 2 : rect.left + rect.width / 2 - windowW / 2;
    const wy = rect.horizontal ? rect.top - 32 : y - windowH / 2 - 4;
    ctx.beginPath();
    ctx.roundRect(wx, wy, windowW, windowH, 3);
    ctx.fill();
    ctx.stroke();
    if (rect.horizontal) {
      ctx.beginPath();
      ctx.moveTo(wx + windowW / 2, wy + 2);
      ctx.lineTo(wx + windowW / 2, wy + windowH - 2);
      ctx.moveTo(wx + 2, wy + windowH / 2);
      ctx.lineTo(wx + windowW - 2, wy + windowH / 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawStairs(ctx: CanvasRenderingContext2D, definition: BuildPartDefinition, left: number, top: number, width: number, height: number, _preview: boolean, _intensity: number) {
    const color = getMaterialPalette(definition.material);
    const x = left + 4;
    const y = top + 4;
    const w = width - 8;
    const h = height - 8;
    const rise = Math.min(42, BUILD_2P5D_WALL_HEIGHT);

    ctx.fillStyle = color.dark;
    ctx.strokeStyle = color.dark;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y + 8, w, h - 2, 5);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = color.side;
    ctx.beginPath();
    ctx.moveTo(x + 5, y + h - 5);
    ctx.lineTo(x + w - 5, y + h - 7);
    ctx.lineTo(x + w - 13, y + 12 - rise * 0.22);
    ctx.lineTo(x + 13, y + 16 - rise * 0.22);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    const steps = 6;
    for (let step = 0; step < steps; step += 1) {
      const t = step / Math.max(1, steps - 1);
      const yy = y + h - 9 - t * (h - 22);
      const inset = 11 + t * 3;
      ctx.fillStyle = step % 2 === 0 ? color.base : color.face;
      ctx.beginPath();
      ctx.roundRect(x + inset, yy - t * 10, w - inset * 2, 6, 3);
      ctx.fill();
      ctx.stroke();
    }
  }

  private drawRoof(ctx: CanvasRenderingContext2D, definition: BuildPartDefinition, left: number, top: number, width: number, height: number, _preview: boolean, _intensity: number, floorLevel: number) {
    const color = getMaterialPalette(definition.material);
    const bounds = getTileBounds2p5d(left + width / 2, top + height / 2, width - 2, height - 2);
    const roofTop = top - BUILD_2P5D_ROOF_RISE - Math.max(0, floorLevel - 1) * 4;
    const roofMidY = top + height / 2 - 8;

    ctx.fillStyle = definition.material === "cloth" ? color.face : color.roof;
    ctx.strokeStyle = color.dark;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(bounds.centerX, roofTop);
    ctx.lineTo(bounds.right, roofMidY);
    ctx.lineTo(bounds.right - 5, roofMidY + 18);
    ctx.lineTo(bounds.centerX, roofTop + 12);
    ctx.lineTo(bounds.left + 5, roofMidY + 18);
    ctx.lineTo(bounds.left, roofMidY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.beginPath();
    ctx.moveTo(bounds.centerX, roofTop + 4);
    ctx.lineTo(bounds.centerX, roofMidY + 15);
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
}
