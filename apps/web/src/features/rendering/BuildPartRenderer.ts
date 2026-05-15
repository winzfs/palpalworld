import { BUILD_GRID_SIZE } from "../buildings/buildGrid";
import { BUILD_PARTS, type BuildPartDefinition, type BuildPartId, type BuildPartRotation, type PlacedBuildPart } from "../buildings/buildPartCatalog";
import {
  ISO_FOUNDATION_SLAB_DEPTH,
  ISO_LOW_WALL_HEIGHT,
  ISO_SLAB_DEPTH,
  ISO_WALL_HEIGHT,
  buildGridToIsoCenter,
  getIsoFloorSlab2p5d,
  getIsoRoofPlane2p5d,
  getIsoStairRamp2p5d,
  getIsoTilePoints2p5d,
  getIsoTilePolygon2p5d,
  getIsoWallPlane2p5d,
  type IsoPoint,
  type IsoWallPlane2p5d,
} from "../buildings/buildProjection2p5d";
import {
  BUILD_2P5D_FLOOR_HEIGHT,
  BUILD_2P5D_ROOF_RISE,
  BUILD_2P5D_WALL_HEIGHT,
  getBuildPartVisual2p5d,
  getMaterialPalette,
  type BuildMaterialPalette,
} from "../buildings/buildPartVisual2p5d";

const ISO_TILE_HEIGHT_RATIO = 0.62;
const WALL_FACE_HEIGHT = ISO_WALL_HEIGHT;
const HALF_WALL_FACE_HEIGHT = ISO_LOW_WALL_HEIGHT;

export class BuildPartRenderer {
  drawPlacedPart(ctx: CanvasRenderingContext2D, part: PlacedBuildPart, isoCamX: number, isoCamY: number) {
    const definition = BUILD_PARTS[part.partId];
    if (!definition) return;
    const iso = buildGridToIsoCenter(part.gridX, part.gridY);
    this.drawPart(ctx, definition, iso.x - isoCamX, iso.y - isoCamY, part.rotation, false, 1, part.floorLevel);
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
    const outline = getIsoTilePolygon2p5d({ x, y: visualY, width, height: this.getIsoTileHeight(height) });
    ctx.save();
    ctx.strokeStyle = valid ? "rgba(34, 197, 94, 0.95)" : "rgba(239, 68, 68, 0.95)";
    ctx.fillStyle = valid ? "rgba(34, 197, 94, 0.10)" : "rgba(239, 68, 68, 0.10)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    this.drawPolygon(ctx, outline, true, true);
    ctx.restore();

    if (this.isEdgeAnchored(definition)) this.drawEdgeGuide(ctx, x, visualY, width, height, rotation, valid);
  }

  drawPlacedPartOutline(ctx: CanvasRenderingContext2D, part: PlacedBuildPart, isoCamX: number, isoCamY: number, options: { strokeStyle: string; lineWidth?: number; alpha?: number; dashed?: boolean; fillStyle?: string | undefined }) {
    const definition = BUILD_PARTS[part.partId];
    if (!definition) return;
    const iso = buildGridToIsoCenter(part.gridX, part.gridY);
    const x = iso.x - isoCamX;
    const y = iso.y - isoCamY - part.floorLevel * BUILD_2P5D_FLOOR_HEIGHT;
    const width = definition.width * BUILD_GRID_SIZE;
    const height = definition.height * BUILD_GRID_SIZE;

    ctx.save();
    ctx.globalAlpha *= options.alpha ?? 1;
    ctx.strokeStyle = options.strokeStyle;
    ctx.fillStyle = options.fillStyle ?? "rgba(0,0,0,0)";
    ctx.lineWidth = options.lineWidth ?? 2;
    ctx.setLineDash(options.dashed ? [5, 5] : []);

    if (this.isEdgeAnchored(definition)) {
      const wallHeight = definition.id.includes("half") || definition.id.includes("railing") || definition.id.includes("fence") || definition.id.includes("gate") ? HALF_WALL_FACE_HEIGHT : BUILD_2P5D_WALL_HEIGHT;
      const plane = this.getWallPlane(x, y, width, height, part.rotation, wallHeight);
      this.drawPolygon(ctx, [plane.baseStart, plane.baseEnd, plane.topEnd, plane.topStart], false, true);
      this.strokePolyline(ctx, [plane.baseStart, plane.baseEnd]);
    } else {
      const outline = getIsoTilePolygon2p5d({ x, y, width, height: this.getIsoTileHeight(height) });
      this.drawPolygon(ctx, outline, Boolean(options.fillStyle), true);
    }
    ctx.restore();
  }

  private drawPart(ctx: CanvasRenderingContext2D, definition: BuildPartDefinition, x: number, y: number, rotation: BuildPartRotation, preview: boolean, intensity: number, floorLevel: number) {
    const width = definition.width * BUILD_GRID_SIZE;
    const height = definition.height * BUILD_GRID_SIZE;
    const visual = getBuildPartVisual2p5d(definition);
    const visualY = y - floorLevel * BUILD_2P5D_FLOOR_HEIGHT;
    const left = x - width / 2;
    const top = visualY - height / 2;
    const edgeAnchored = this.isEdgeAnchored(definition);
    const directlyProjected = edgeAnchored || definition.category === "stairs" || definition.category === "floor";

    ctx.save();
    if (!directlyProjected) {
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
        this.drawStairs(ctx, definition, left, top, width, height, rotation, preview, intensity);
        break;
      case "roof":
        this.drawRoof(ctx, definition, left, top, width, height, rotation, preview, intensity, floorLevel);
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

  private getIsoTileHeight(height: number) {
    return height * ISO_TILE_HEIGHT_RATIO;
  }

  private getIsoTileForPart(x: number, y: number, width: number, height: number) {
    return getIsoTilePoints2p5d({ x, y, width, height: this.getIsoTileHeight(height) });
  }

  private getWallPlane(x: number, y: number, width: number, height: number, rotation: BuildPartRotation, wallHeight: number) {
    return getIsoWallPlane2p5d({ x, y, width, height, rotation, wallHeight });
  }

  private drawPolygon(ctx: CanvasRenderingContext2D, points: IsoPoint[], fill = true, stroke = true) {
    if (points.length === 0) return;
    const [first, ...rest] = points;
    if (!first) return;
    ctx.beginPath();
    ctx.moveTo(first.x, first.y);
    for (const point of rest) ctx.lineTo(point.x, point.y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  private strokePolyline(ctx: CanvasRenderingContext2D, points: IsoPoint[]) {
    if (points.length === 0) return;
    const [first, ...rest] = points;
    if (!first) return;
    ctx.beginPath();
    ctx.moveTo(first.x, first.y);
    for (const point of rest) ctx.lineTo(point.x, point.y);
    ctx.stroke();
  }

  private pointOnSegment(start: IsoPoint, end: IsoPoint, amount: number): IsoPoint {
    return {
      x: start.x + (end.x - start.x) * amount,
      y: start.y + (end.y - start.y) * amount,
    };
  }

  private pointOnWallPlane(plane: IsoWallPlane2p5d, along: number, up: number): IsoPoint {
    const base = this.pointOnSegment(plane.baseStart, plane.baseEnd, along);
    const top = this.pointOnSegment(plane.topStart, plane.topEnd, along);
    return this.pointOnSegment(base, top, up);
  }

  private drawEdgeGuide(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, rotation: BuildPartRotation, valid: boolean) {
    const plane = this.getWallPlane(x, y, width, height, rotation, BUILD_2P5D_WALL_HEIGHT);
    const edgeColor = valid ? "rgba(250, 204, 21, 0.95)" : "rgba(248, 113, 113, 0.95)";
    ctx.save();
    ctx.strokeStyle = edgeColor;
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    this.strokePolyline(ctx, [plane.baseStart, plane.baseEnd]);
    ctx.restore();
  }

  private drawSoftShadow(ctx: CanvasRenderingContext2D, left: number, top: number, width: number, height: number, renderHeight: number, preview: boolean) {
    ctx.save();
    ctx.fillStyle = preview ? "rgba(0, 0, 0, 0.10)" : "rgba(0, 0, 0, 0.18)";
    ctx.beginPath();
    ctx.ellipse(left + width / 2 + 4, top + height / 2 + 9, width * 0.42, Math.max(6, height * 0.14 + renderHeight * 0.03), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawFloor(ctx: CanvasRenderingContext2D, definition: BuildPartDefinition, left: number, top: number, width: number, height: number, preview: boolean, intensity: number, floorLevel: number) {
    const color = getMaterialPalette(definition.material);
    const slabDepth = definition.layer === "foundation" ? ISO_FOUNDATION_SLAB_DEPTH : ISO_SLAB_DEPTH;
    const isUpperFloor = floorLevel > 0 || definition.id.includes("second_floor");
    const tile = this.getIsoTileForPart(left + width / 2, top + height / 2, width, height);
    const slab = getIsoFloorSlab2p5d({ tilePoints: tile, slabDepth });

    ctx.save();
    ctx.shadowColor = preview ? "rgba(0,0,0,0.07)" : "rgba(0,0,0,0.16)";
    ctx.shadowBlur = preview ? 1 : 3;
    ctx.shadowOffsetY = 2;

    ctx.fillStyle = color.dark;
    ctx.strokeStyle = "rgba(15,23,42,0.54)";
    ctx.lineWidth = 1;
    this.drawPolygon(ctx, slab.bottomFace, true, true);

    ctx.shadowBlur = 0;
    ctx.fillStyle = color.side;
    this.drawPolygon(ctx, slab.rightFace, true, true);
    ctx.fillStyle = "rgba(15,23,42,0.18)";
    this.drawPolygon(ctx, slab.leftFace, true, false);

    ctx.fillStyle = isUpperFloor ? color.light : color.base;
    ctx.strokeStyle = color.dark;
    ctx.lineWidth = 1.25;
    this.drawPolygon(ctx, slab.topFace, true, true);

    ctx.globalAlpha *= 0.78 * intensity;
    ctx.strokeStyle = definition.material === "stone" ? "rgba(30,41,59,0.30)" : "rgba(255,255,255,0.18)";
    ctx.lineWidth = 1;
    if (definition.material === "stone") {
      for (const t of [0.28, 0.5, 0.72]) {
        const start = this.pointOnSegment(tile.left, tile.bottom, t);
        const end = this.pointOnSegment(tile.top, tile.right, t);
        this.strokePolyline(ctx, [start, end]);
      }
      for (const t of [0.36, 0.64]) {
        const start = this.pointOnSegment(tile.left, tile.top, t);
        const end = this.pointOnSegment(tile.bottom, tile.right, t);
        this.strokePolyline(ctx, [start, end]);
      }
    } else {
      for (const t of [0.22, 0.38, 0.54, 0.7]) {
        const start = this.pointOnSegment(tile.left, tile.top, t);
        const end = this.pointOnSegment(tile.bottom, tile.right, t);
        this.strokePolyline(ctx, [start, end]);
      }
    }

    if (isUpperFloor) {
      ctx.globalAlpha *= 0.42;
      ctx.strokeStyle = "rgba(255,255,255,0.26)";
      this.strokePolyline(ctx, [this.pointOnSegment(tile.left, tile.top, 0.2), this.pointOnSegment(tile.bottom, tile.right, 0.2)]);
    }
    ctx.restore();
  }

  private drawWall(ctx: CanvasRenderingContext2D, definition: BuildPartDefinition, x: number, y: number, width: number, height: number, rotation: BuildPartRotation, preview: boolean) {
    const color = getMaterialPalette(definition.material);
    const isLowWall = definition.id.includes("half") || definition.id.includes("railing") || definition.id.includes("fence") || definition.id.includes("gate");
    const wallHeight = isLowWall ? HALF_WALL_FACE_HEIGHT : Math.min(WALL_FACE_HEIGHT, getBuildPartVisual2p5d(definition).renderHeightPx);
    const plane = this.getWallPlane(x, y, width, height, rotation, wallHeight);
    ctx.save();
    ctx.shadowColor = preview ? "rgba(0,0,0,0.07)" : "rgba(0,0,0,0.16)";
    ctx.shadowBlur = preview ? 1 : 3;
    ctx.shadowOffsetY = 2;
    this.drawIsoWallPlane(ctx, plane, color, isLowWall);
    ctx.restore();
  }

  private drawIsoWallPlane(ctx: CanvasRenderingContext2D, plane: IsoWallPlane2p5d, color: BuildMaterialPalette, lowWall: boolean) {
    const wallFace = [plane.baseStart, plane.baseEnd, plane.topEnd, plane.topStart];
    const facingWall = plane.edge === "north" || plane.edge === "south";

    ctx.fillStyle = facingWall ? color.face : color.side;
    ctx.strokeStyle = color.dark;
    ctx.lineWidth = facingWall ? 1.4 : 1.15;
    this.drawPolygon(ctx, wallFace, true, true);

    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255,255,255,0.16)";
    ctx.lineWidth = 1;
    this.strokePolyline(ctx, [plane.topStart, plane.topEnd]);

    ctx.strokeStyle = lowWall ? "rgba(15,23,42,0.24)" : "rgba(15,23,42,0.30)";
    this.strokePolyline(ctx, [this.pointOnWallPlane(plane, 0.08, 0.16), this.pointOnWallPlane(plane, 0.92, 0.16)]);

    ctx.strokeStyle = "rgba(15,23,42,0.36)";
    ctx.lineWidth = 2;
    this.strokePolyline(ctx, [plane.baseStart, plane.baseEnd]);
  }

  private drawDoorOnWall(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, rotation: BuildPartRotation) {
    const plane = this.getWallPlane(x, y, width, height, rotation, BUILD_2P5D_WALL_HEIGHT);
    const sideWall = plane.edge === "east" || plane.edge === "west";
    const start = sideWall ? 0.42 : 0.34;
    const end = sideWall ? 0.58 : 0.66;
    const top = sideWall ? 0.58 : 0.64;
    const door = [
      this.pointOnWallPlane(plane, start, 0),
      this.pointOnWallPlane(plane, end, 0),
      this.pointOnWallPlane(plane, end, top),
      this.pointOnWallPlane(plane, start, top),
    ];

    ctx.save();
    ctx.fillStyle = "#4a2b16";
    ctx.strokeStyle = "#1f1308";
    ctx.lineWidth = 1.4;
    this.drawPolygon(ctx, door, true, true);
    ctx.fillStyle = "rgba(255,255,255,0.13)";
    const glintA = this.pointOnWallPlane(plane, end - 0.04, 0.08);
    const glintB = this.pointOnWallPlane(plane, end - 0.04, top - 0.08);
    this.strokePolyline(ctx, [glintA, glintB]);
    ctx.restore();
  }

  private drawWindowOnWall(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, rotation: BuildPartRotation) {
    const plane = this.getWallPlane(x, y, width, height, rotation, BUILD_2P5D_WALL_HEIGHT);
    const sideWall = plane.edge === "east" || plane.edge === "west";
    const start = sideWall ? 0.42 : 0.32;
    const end = sideWall ? 0.58 : 0.68;
    const bottom = 0.34;
    const top = sideWall ? 0.62 : 0.68;
    const windowPane = [
      this.pointOnWallPlane(plane, start, bottom),
      this.pointOnWallPlane(plane, end, bottom),
      this.pointOnWallPlane(plane, end, top),
      this.pointOnWallPlane(plane, start, top),
    ];

    ctx.save();
    ctx.fillStyle = "rgba(125,211,252,0.82)";
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 1.35;
    this.drawPolygon(ctx, windowPane, true, true);
    if (!sideWall) {
      ctx.strokeStyle = "rgba(15,23,42,0.62)";
      ctx.lineWidth = 1;
      this.strokePolyline(ctx, [this.pointOnWallPlane(plane, 0.5, bottom + 0.03), this.pointOnWallPlane(plane, 0.5, top - 0.03)]);
      this.strokePolyline(ctx, [this.pointOnWallPlane(plane, start + 0.03, (bottom + top) / 2), this.pointOnWallPlane(plane, end - 0.03, (bottom + top) / 2)]);
    }
    ctx.restore();
  }

  private drawStairs(ctx: CanvasRenderingContext2D, definition: BuildPartDefinition, left: number, top: number, width: number, height: number, rotation: BuildPartRotation, _preview: boolean, _intensity: number) {
    const color = getMaterialPalette(definition.material);
    const tile = this.getIsoTileForPart(left + width / 2, top + height / 2, width, height);
    const stairRise = BUILD_2P5D_FLOOR_HEIGHT * 0.42;
    const ramp = getIsoStairRamp2p5d({ tilePoints: tile, rotation, floorHeight: stairRise });
    const sideWall = rotation === 90 || rotation === 270;
    const steps = 6;

    ctx.save();
    ctx.fillStyle = color.dark;
    ctx.strokeStyle = "rgba(15,23,42,0.72)";
    ctx.lineWidth = 1.25;
    this.drawPolygon(ctx, [tile.top, tile.right, tile.bottom, tile.left], true, true);

    ctx.fillStyle = sideWall ? color.side : color.face;
    ctx.strokeStyle = color.dark;
    ctx.lineWidth = 1.4;
    this.drawPolygon(ctx, ramp.ramp, true, true);

    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.lineWidth = 1;
    for (let step = 1; step <= steps; step += 1) {
      const t = step / (steps + 1);
      const lower = this.pointOnSegment(ramp.startEdge.start, ramp.startEdge.end, t);
      const upper = this.pointOnSegment(ramp.endEdge.start, ramp.endEdge.end, t);
      upper.y -= stairRise;
      const lineStart = this.pointOnSegment(lower, upper, 0.34);
      const lineEnd = this.pointOnSegment(lower, upper, 0.66);
      this.strokePolyline(ctx, [lineStart, lineEnd]);
    }

    ctx.strokeStyle = "rgba(15,23,42,0.52)";
    ctx.lineWidth = 1.2;
    this.strokePolyline(ctx, [ramp.startEdge.start, ramp.startEdge.end]);
    this.strokePolyline(ctx, [ramp.endEdge.start, { x: ramp.endEdge.start.x, y: ramp.endEdge.start.y - stairRise }]);
    this.strokePolyline(ctx, [ramp.endEdge.end, { x: ramp.endEdge.end.x, y: ramp.endEdge.end.y - stairRise }]);
    ctx.restore();
  }

  private drawRoof(ctx: CanvasRenderingContext2D, definition: BuildPartDefinition, left: number, top: number, width: number, height: number, rotation: BuildPartRotation, _preview: boolean, _intensity: number, floorLevel: number) {
    const color = getMaterialPalette(definition.material);
    const centerX = left + width / 2;
    const centerY = top + height / 2 - Math.max(0, floorLevel - 1) * 4;
    const tile = this.getIsoTileForPart(centerX, centerY, width, height);
    const roof = getIsoRoofPlane2p5d({ tilePoints: tile, rotation, roofRise: BUILD_2P5D_ROOF_RISE });
    const ridgeStart = roof.ridgeStart;
    const ridgeEnd = roof.ridgeEnd;
    const leftPlane = [tile.left, tile.top, ridgeStart, ridgeEnd, tile.bottom];
    const rightPlane = [tile.top, tile.right, tile.bottom, ridgeEnd, ridgeStart];

    ctx.save();
    ctx.fillStyle = definition.material === "cloth" ? color.face : color.roof;
    ctx.strokeStyle = color.dark;
    ctx.lineWidth = 1.4;
    this.drawPolygon(ctx, leftPlane, true, true);

    ctx.fillStyle = definition.material === "cloth" ? color.light : color.side;
    this.drawPolygon(ctx, rightPlane, true, true);

    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.lineWidth = 1;
    this.strokePolyline(ctx, [ridgeStart, ridgeEnd]);

    ctx.globalAlpha *= 0.58;
    ctx.strokeStyle = "rgba(15,23,42,0.24)";
    for (const t of [0.3, 0.55, 0.8]) {
      this.strokePolyline(ctx, [this.pointOnSegment(tile.left, tile.bottom, t), this.pointOnSegment(ridgeStart, ridgeEnd, t)]);
      this.strokePolyline(ctx, [this.pointOnSegment(tile.top, tile.right, t), this.pointOnSegment(ridgeStart, ridgeEnd, t)]);
    }
    ctx.restore();
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
