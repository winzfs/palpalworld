import type { BuildingState, CreaturePublicState, Direction, PlayerPublicState, ResourceNodeState } from "@palpalworld/shared";
import type { SpriteDirection, SpriteSheetAsset } from "../assets/assetTypes";
import { getBuildingSpriteSet, getCreatureSpriteSet, getPlayerSpriteSet, getResourceSpriteSet } from "../assets/assetCatalog";
import { AssetLoader } from "../assets/AssetLoader";
import { PrimitiveRenderer } from "./PrimitiveRenderer";

function toSpriteDirection(direction: Direction | undefined): SpriteDirection {
  if (direction === "up" || direction === "left" || direction === "right") return direction;
  return "down";
}

function isDrawableImage(image: HTMLImageElement | null | undefined) {
  return Boolean(image && image.complete && image.naturalWidth > 0 && image.naturalHeight > 0);
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

function getWeaponStyle(weaponItemId: string | null | undefined) {
  if (!weaponItemId) return null;
  if (weaponItemId.includes("pickaxe")) return { length: 30, handle: "#92400e", blade: "#cbd5e1", kind: "pickaxe" as const };
  if (weaponItemId.includes("axe")) return { length: 28, handle: "#92400e", blade: "#e5e7eb", kind: "axe" as const };
  if (weaponItemId.includes("sickle")) return { length: 25, handle: "#166534", blade: "#ecfccb", kind: "sickle" as const };
  if (weaponItemId.includes("iron")) return { length: 34, handle: "#475569", blade: "#f8fafc", kind: "sword" as const };
  return { length: 31, handle: "#92400e", blade: "#fde68a", kind: "sword" as const };
}

function drawEquippedWeapon(ctx: CanvasRenderingContext2D, x: number, y: number, direction: SpriteDirection, weaponItemId?: string | null) {
  const style = getWeaponStyle(weaponItemId);
  if (!style) return;

  const facingLeft = direction === "left";
  const facingUp = direction === "up";
  const facingDown = direction === "down";
  const handX = x + (facingLeft ? -13 : 13);
  const handY = y - (facingUp ? 31 : facingDown ? 18 : 22);
  const angle = facingUp ? -1.15 : facingLeft ? -0.68 : 0.68;
  const flip = facingLeft ? -1 : 1;

  ctx.save();
  ctx.translate(handX, handY);
  ctx.scale(flip, 1);
  ctx.rotate(angle * flip);
  ctx.lineCap = "round";

  ctx.strokeStyle = "rgba(0,0,0,0.72)";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(style.length, 0);
  ctx.stroke();

  ctx.strokeStyle = style.handle;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(style.length, 0);
  ctx.stroke();

  ctx.fillStyle = style.blade;
  ctx.strokeStyle = "rgba(0,0,0,0.72)";
  ctx.lineWidth = 1.5;
  if (style.kind === "axe") {
    ctx.beginPath();
    ctx.ellipse(style.length + 2, -4, 6, 9, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (style.kind === "pickaxe") {
    ctx.beginPath();
    ctx.moveTo(style.length - 7, -7);
    ctx.lineTo(style.length + 10, -2);
    ctx.lineTo(style.length - 7, 6);
    ctx.stroke();
  } else if (style.kind === "sickle") {
    ctx.beginPath();
    ctx.arc(style.length, -4, 9, -1.6, 1.0);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(style.length + 10, 0);
    ctx.lineTo(style.length - 2, -5);
    ctx.lineTo(style.length, 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

export class SpriteRenderer {
  private readonly loader = new AssetLoader();
  private readonly fallback = new PrimitiveRenderer();

  drawResource(ctx: CanvasRenderingContext2D, resource: ResourceNodeState, x: number, y: number) {
    const spriteSet = getResourceSpriteSet(resource.resourceType);
    const image = this.loader.getImage(spriteSet?.idle ?? null);
    if (!spriteSet || !isDrawableImage(image)) {
      this.fallback.drawResource(ctx, resource, x, y);
      return;
    }

    ctx.drawImage(image, x - spriteSet.idle.width / 2, y - spriteSet.idle.height / 2, spriteSet.idle.width, spriteSet.idle.height);
  }

  drawCreature(ctx: CanvasRenderingContext2D, creature: CreaturePublicState, x: number, y: number) {
    const spriteSet = getCreatureSpriteSet(creature.speciesId);
    const asset = spriteSet?.idle.down ?? null;
    const image = this.loader.getImage(asset);
    if (!asset || !isDrawableImage(image)) {
      this.fallback.drawCreature(ctx, creature, x, y);
      return;
    }

    ctx.drawImage(image, x - asset.width / 2, y - asset.height / 2, asset.width, asset.height);
  }

  drawBuilding(ctx: CanvasRenderingContext2D, building: BuildingState, x: number, y: number) {
    const spriteSet = getBuildingSpriteSet(building.type);
    const image = this.loader.getImage(spriteSet?.idle ?? null);
    if (!spriteSet || !isDrawableImage(image)) {
      this.fallback.drawBuilding(ctx, building, x, y);
      return;
    }

    ctx.drawImage(image, x - spriteSet.idle.width / 2, y - spriteSet.idle.height / 2, spriteSet.idle.width, spriteSet.idle.height);
  }

  drawPlayer(ctx: CanvasRenderingContext2D, player: PlayerPublicState, x: number, y: number, isLocal: boolean, isMoving = false, now = performance.now(), equippedWeaponItemId?: string | null) {
    const spriteSet = getPlayerSpriteSet();
    const sheet = isMoving ? spriteSet.walk ?? spriteSet.idle : spriteSet.idle;
    const image = this.loader.getImage(sheet ?? null);
    const direction = toSpriteDirection(player.direction);

    if (!sheet || !isDrawableImage(image)) {
      this.fallback.drawPlayer(ctx, player, x, y, isLocal);
      drawEquippedWeapon(ctx, x, y, direction, equippedWeaponItemId);
      return;
    }

    try {
      const frameIndex = sheet.frameCount <= 1 ? 0 : Math.floor(now / sheet.frameDurationMs) % sheet.frameCount;
      drawSpriteSheetFrame(ctx, image, sheet, direction, frameIndex, x, y, 1);
    } catch {
      this.fallback.drawPlayer(ctx, player, x, y, isLocal);
      drawEquippedWeapon(ctx, x, y, direction, equippedWeaponItemId);
      return;
    }

    drawEquippedWeapon(ctx, x, y, direction, equippedWeaponItemId);

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
