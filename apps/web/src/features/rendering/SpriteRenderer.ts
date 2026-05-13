import type { BuildingState, CreaturePublicState, PlayerDirection, PlayerPublicState, ResourceNodeState } from "@palpalworld/shared";
import type { SpriteDirection, SpriteSheetAsset } from "../assets/assetTypes";
import { getBuildingSpriteSet, getCreatureSpriteSet, getPlayerSpriteSet, getResourceSpriteSet } from "../assets/assetCatalog";
import { AssetLoader } from "../assets/AssetLoader";
import { PrimitiveRenderer } from "./PrimitiveRenderer";

function toSpriteDirection(direction: PlayerDirection | undefined): SpriteDirection {
  if (direction === "up" || direction === "left" || direction === "right") return direction;
  return "down";
}

function drawSpriteSheetFrame(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  sheet: SpriteSheetAsset,
  direction: SpriteDirection,
  frameIndex: number,
  x: number,
  y: number,
  scale = 1,
) {
  const row = sheet.rowByDirection[direction] ?? 0;
  const frame = Math.max(0, Math.min(sheet.frameCount - 1, frameIndex));
  const sx = (frame % sheet.columns) * sheet.frameWidth;
  const sy = row * sheet.frameHeight;
  const width = sheet.frameWidth * scale;
  const height = sheet.frameHeight * scale;

  ctx.drawImage(image, sx, sy, sheet.frameWidth, sheet.frameHeight, Math.round(x - width / 2), Math.round(y - height + 18), width, height);
}

export class SpriteRenderer {
  private readonly loader = new AssetLoader();
  private readonly fallback = new PrimitiveRenderer();

  drawResource(ctx: CanvasRenderingContext2D, resource: ResourceNodeState, x: number, y: number) {
    const spriteSet = getResourceSpriteSet(resource.resourceType);
    const image = this.loader.getImage(spriteSet?.idle ?? null);
    if (!image || !spriteSet) {
      this.fallback.drawResource(ctx, resource, x, y);
      return;
    }

    ctx.drawImage(image, x - spriteSet.idle.width / 2, y - spriteSet.idle.height / 2, spriteSet.idle.width, spriteSet.idle.height);
  }

  drawCreature(ctx: CanvasRenderingContext2D, creature: CreaturePublicState, x: number, y: number) {
    const spriteSet = getCreatureSpriteSet(creature.speciesId);
    const asset = spriteSet?.idle.down ?? null;
    const image = this.loader.getImage(asset);
    if (!image || !asset) {
      this.fallback.drawCreature(ctx, creature, x, y);
      return;
    }

    ctx.drawImage(image, x - asset.width / 2, y - asset.height / 2, asset.width, asset.height);
  }

  drawBuilding(ctx: CanvasRenderingContext2D, building: BuildingState, x: number, y: number) {
    const spriteSet = getBuildingSpriteSet(building.type);
    const image = this.loader.getImage(spriteSet?.idle ?? null);
    if (!image || !spriteSet) {
      this.fallback.drawBuilding(ctx, building, x, y);
      return;
    }

    ctx.drawImage(image, x - spriteSet.idle.width / 2, y - spriteSet.idle.height / 2, spriteSet.idle.width, spriteSet.idle.height);
  }

  drawPlayer(ctx: CanvasRenderingContext2D, player: PlayerPublicState, x: number, y: number, isLocal: boolean, isMoving = false, now = performance.now()) {
    const spriteSet = getPlayerSpriteSet();
    const sheet = isMoving ? spriteSet.walk ?? spriteSet.idle : spriteSet.idle;
    const image = this.loader.getImage(sheet ?? null);

    if (!image || !sheet) {
      this.fallback.drawPlayer(ctx, player, x, y, isLocal);
      return;
    }

    const frameIndex = sheet.frameCount <= 1 ? 0 : Math.floor(now / sheet.frameDurationMs) % sheet.frameCount;
    const direction = toSpriteDirection(player.direction);
    drawSpriteSheetFrame(ctx, image, sheet, direction, frameIndex, x, y, 1);

    if (isLocal) {
      ctx.strokeStyle = "rgba(250, 204, 21, 0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(x, y + 17, 18, 7, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.font = "13px system-ui";
    ctx.textAlign = "center";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(0,0,0,0.75)";
    ctx.strokeText(player.nickname, x, y - 48);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(player.nickname, x, y - 48);

    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(x - 22, y + 24, 44, 5);
    ctx.fillStyle = "#22c55e";
    ctx.fillRect(x - 22, y + 24, 44 * (player.hp / player.maxHp), 5);
  }
}
