import type { BuildingState, CreaturePublicState, PlayerPublicState, ResourceNodeState } from "@palpalworld/shared";
import { EnhancedPrimitiveRenderer } from "./EnhancedPrimitiveRenderer";

const BUFFER_SIZE = 160;
const SCALE_DOWN = 0.42;
const DRAW_CENTER = BUFFER_SIZE / 2;

export class PixelArtPrimitiveRenderer extends EnhancedPrimitiveRenderer {
  private readonly buffer: HTMLCanvasElement;
  private readonly bufferCtx: CanvasRenderingContext2D;

  constructor() {
    super();
    this.buffer = document.createElement("canvas");
    this.buffer.width = BUFFER_SIZE;
    this.buffer.height = BUFFER_SIZE;
    this.bufferCtx = this.buffer.getContext("2d") as CanvasRenderingContext2D;
    this.bufferCtx.imageSmoothingEnabled = false;
  }

  override drawResource(ctx: CanvasRenderingContext2D, resource: ResourceNodeState, x: number, y: number) {
    this.drawPixelated(ctx, x, y, () => super.drawResource(this.bufferCtx, resource, DRAW_CENTER, DRAW_CENTER));
  }

  override drawCreature(ctx: CanvasRenderingContext2D, creature: CreaturePublicState, x: number, y: number) {
    this.drawPixelated(ctx, x, y, () => super.drawCreature(this.bufferCtx, creature, DRAW_CENTER, DRAW_CENTER));
  }

  override drawBuilding(ctx: CanvasRenderingContext2D, building: BuildingState, x: number, y: number) {
    this.drawPixelated(ctx, x, y, () => super.drawBuilding(this.bufferCtx, building, DRAW_CENTER, DRAW_CENTER));
  }

  override drawPlayer(ctx: CanvasRenderingContext2D, player: PlayerPublicState, x: number, y: number, isLocal: boolean) {
    super.drawPlayer(ctx, player, x, y, isLocal);
  }

  private drawPixelated(ctx: CanvasRenderingContext2D, x: number, y: number, draw: () => void) {
    this.bufferCtx.save();
    this.bufferCtx.setTransform(1, 0, 0, 1, 0, 0);
    this.bufferCtx.clearRect(0, 0, BUFFER_SIZE, BUFFER_SIZE);
    this.bufferCtx.imageSmoothingEnabled = false;
    this.bufferCtx.translate(DRAW_CENTER, DRAW_CENTER);
    this.bufferCtx.scale(SCALE_DOWN, SCALE_DOWN);
    this.bufferCtx.translate(-DRAW_CENTER, -DRAW_CENTER);
    draw();
    this.bufferCtx.restore();

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.buffer, Math.round(x - DRAW_CENTER), Math.round(y - DRAW_CENTER), BUFFER_SIZE, BUFFER_SIZE);
    ctx.restore();
  }
}
