import type { BuildingState, CreaturePublicState, Direction, PlayerPublicState, ResourceNodeState } from "@palpalworld/shared";
import type { SpriteDirection, SpriteSheetAsset } from "../assets/assetTypes";
import { getBuildingSpriteSet, getCreatureSpriteSet, getPlayerSpriteSet, getResourceSpriteSet } from "../assets/assetCatalog";
import { AssetLoader } from "../assets/AssetLoader";
import { PrimitiveRenderer } from "./PrimitiveRenderer";

const mountedPetStorageKey = "palpalworld.demo.mountedPetItemId";

function toSpriteDirection(direction: Direction | undefined): SpriteDirection {
  if (direction === "up" || direction === "left" || direction === "right") return direction;
  return "down";
}

function isDrawableImage(image: HTMLImageElement | null | undefined) {
  return Boolean(image && image.complete && image.naturalWidth > 0 && image.naturalHeight > 0);
}

function readMountedPetItemId() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(mountedPetStorageKey);
}

function getMountedPetSpeciesId(itemId: string | null) {
  return itemId?.startsWith("pet_") ? itemId.slice(4) : null;
}

function getMountedPetStyle(speciesId: string | null) {
  if (speciesId === "sparkit") return { body: "#facc15", belly: "#fef3c7", accent: "#fde047", ear: "#f59e0b" };
  if (speciesId === "droplet") return { body: "#38bdf8", belly: "#dbeafe", accent: "#0ea5e9", ear: "#7dd3fc" };
  if (speciesId === "moleminer") return { body: "#92400e", belly: "#fde68a", accent: "#78350f", ear: "#a16207" };
  if (speciesId === "mossboar") return { body: "#4d7c0f", belly: "#d9f99d", accent: "#365314", ear: "#84cc16" };
  if (speciesId === "rockturtle") return { body: "#64748b", belly: "#cbd5e1", accent: "#334155", ear: "#94a3b8" };
  return { body: "#22c55e", belly: "#bbf7d0", accent: "#15803d", ear: "#86efac" };
}

function drawMountedPet(ctx: CanvasRenderingContext2D, x: number, y: number, speciesId: string | null, direction: SpriteDirection, isMoving: boolean, now: number) {
  if (!speciesId) return;
  const style = getMountedPetStyle(speciesId);
  const bob = isMoving ? Math.sin(now / 120) * 1.5 : 0;
  const baseY = y + 8 + bob;
  const facingLeft = direction === "left";
  const facingRight = direction === "right";
  const headX = x + (facingLeft ? -23 : facingRight ? 23 : 0);
  const tailX = x + (facingLeft ? 25 : facingRight ? -25 : 0);

  ctx.save();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(0,0,0,0.72)";
  ctx.fillStyle = "rgba(0,0,0,0.36)";
  ctx.beginPath();
  ctx.ellipse(x, baseY + 16, 35, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = style.body;
  ctx.beginPath();
  ctx.ellipse(x, baseY, 31, 17, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = style.belly;
  ctx.beginPath();
  ctx.ellipse(x, baseY + 3, 18, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = style.body;
  ctx.beginPath();
  ctx.ellipse(headX, baseY - 6, 14, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = style.ear;
  ctx.beginPath();
  ctx.ellipse(headX - 7, baseY - 17, 5, 9, -0.5, 0, Math.PI * 2);
  ctx.ellipse(headX + 7, baseY - 17, 5, 9, 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#111827";
  ctx.beginPath();
  ctx.arc(headX + (facingLeft ? -4 : 4), baseY - 8, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = style.accent;
  ctx.beginPath();
  ctx.ellipse(tailX, baseY - 2, 9, 5, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  for (const legX of [-18, -6, 10, 21]) {
    ctx.beginPath();
    ctx.roundRect(x + legX - 3, baseY + 11, 6, 10, 3);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawAnimatedFallbackPlayer(
  ctx: CanvasRenderingContext2D,
  player: PlayerPublicState,
  x: number,
  y: number,
  isLocal: boolean,
  direction: SpriteDirection,
  isMoving: boolean,
  now: number,
) {
  const fill = isLocal ? "#38bdf8" : "#a78bfa";
  const outline = "#0f172a";
  const skin = "#f8d7a4";
  const hair = "#1f1308";
  const run = isMoving ? Math.sin(now / 85) : 0;
  const runOpp = isMoving ? Math.sin(now / 85 + Math.PI) : 0;
  const bob = isMoving ? Math.abs(Math.sin(now / 85)) * -4 : 0;
  const bodyY = y + bob;
  const side = direction === "left" ? -1 : 1;
  const isSide = direction === "left" || direction === "right";
  const isBack = direction === "up";

  ctx.save();
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(x, y + 17, isMoving ? 17 : 14, isMoving ? 6 : 8, 0, 0, Math.PI * 2);
  ctx.fill();

  const leftLegSwing = isSide ? run * 7 * side : run * 5;
  const rightLegSwing = isSide ? runOpp * 7 * side : runOpp * 5;
  const leftArmSwing = isSide ? runOpp * 8 * side : runOpp * 5;
  const rightArmSwing = isSide ? run * 8 * side : run * 5;

  ctx.strokeStyle = outline;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x - 7, bodyY + 8);
  ctx.lineTo(x - 9 + leftLegSwing, bodyY + 19);
  ctx.moveTo(x + 7, bodyY + 8);
  ctx.lineTo(x + 9 + rightLegSwing, bodyY + 19);
  ctx.stroke();

  ctx.strokeStyle = "#1e40af";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - 7, bodyY + 8);
  ctx.lineTo(x - 9 + leftLegSwing, bodyY + 19);
  ctx.moveTo(x + 7, bodyY + 8);
  ctx.lineTo(x + 9 + rightLegSwing, bodyY + 19);
  ctx.stroke();

  ctx.fillStyle = fill;
  ctx.strokeStyle = outline;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(x - 12, bodyY - 14, 24, 29, 7);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = outline;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x - 11, bodyY - 8);
  ctx.lineTo(x - 17 + leftArmSwing, bodyY + 5);
  ctx.moveTo(x + 11, bodyY - 8);
  ctx.lineTo(x + 17 + rightArmSwing, bodyY + 5);
  ctx.stroke();
  ctx.strokeStyle = skin;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - 11, bodyY - 8);
  ctx.lineTo(x - 17 + leftArmSwing, bodyY + 5);
  ctx.moveTo(x + 11, bodyY - 8);
  ctx.lineTo(x + 17 + rightArmSwing, bodyY + 5);
  ctx.stroke();

  const headX = x + (isSide ? side * 3 : 0);
  const headY = bodyY - 20;
  ctx.fillStyle = skin;
  ctx.strokeStyle = outline;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(headX, headY, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = hair;
  if (isBack) {
    ctx.beginPath();
    ctx.arc(headX, headY - 2, 10, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(headX - 8, headY - 5, 16, 5);
  } else if (isSide) {
    ctx.beginPath();
    ctx.arc(headX - side * 2, headY - 4, 9, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(headX - 8, headY - 9, 14, 5);
  } else {
    ctx.beginPath();
    ctx.arc(headX, headY - 5, 9, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(headX - 8, headY - 10, 16, 5);
  }

  if (!isBack) {
    ctx.fillStyle = hair;
    if (isSide) {
      ctx.fillRect(headX + side * 3, headY - 2, 3, 3);
    } else {
      ctx.fillRect(headX - 5, headY - 2, 3, 3);
      ctx.fillRect(headX + 3, headY - 2, 3, 3);
    }
  } else {
    ctx.strokeStyle = "#60a5fa";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(headX - 5, headY + 2);
    ctx.lineTo(headX + 5, headY + 2);
    ctx.stroke();
  }

  ctx.font = "13px system-ui";
  ctx.textAlign = "center";
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(0,0,0,0.75)";
  ctx.strokeText(player.nickname, x, bodyY - 35);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(player.nickname, x, bodyY - 35);

  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(x - 22, y + 24, 44, 5);
  ctx.fillStyle = "#22c55e";
  ctx.fillRect(x - 22, y + 24, 44 * (player.hp / player.maxHp), 5);
  ctx.restore();
}

function drawSpriteSheetFrame(ctx: CanvasRenderingContext2D, image: HTMLImageElement, sheet: SpriteSheetAsset, direction: SpriteDirection, frameIndex: number, x: number, y: number, scale = 1) {
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
    ctx.beginPath(); ctx.ellipse(style.length + 2, -4, 6, 9, 0.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  } else if (style.kind === "pickaxe") {
    ctx.beginPath(); ctx.moveTo(style.length - 7, -7); ctx.lineTo(style.length + 10, -2); ctx.lineTo(style.length - 7, 6); ctx.stroke();
  } else if (style.kind === "sickle") {
    ctx.beginPath(); ctx.arc(style.length, -4, 9, -1.6, 1.0); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.moveTo(style.length + 10, 0); ctx.lineTo(style.length - 2, -5); ctx.lineTo(style.length, 5); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}

export class SpriteRenderer {
  private readonly loader = new AssetLoader();
  private readonly fallback = new PrimitiveRenderer();

  drawResource(ctx: CanvasRenderingContext2D, resource: ResourceNodeState, x: number, y: number) {
    const spriteSet = getResourceSpriteSet(resource.resourceType);
    const image = this.loader.getImage(spriteSet?.idle ?? null);
    if (!spriteSet || !isDrawableImage(image)) { this.fallback.drawResource(ctx, resource, x, y); return; }
    ctx.drawImage(image, x - spriteSet.idle.width / 2, y - spriteSet.idle.height / 2, spriteSet.idle.width, spriteSet.idle.height);
  }

  drawCreature(ctx: CanvasRenderingContext2D, creature: CreaturePublicState, x: number, y: number) {
    const spriteSet = getCreatureSpriteSet(creature.speciesId);
    const asset = spriteSet?.idle.down ?? null;
    const image = this.loader.getImage(asset);
    if (!asset || !isDrawableImage(image)) { this.fallback.drawCreature(ctx, creature, x, y); return; }
    ctx.drawImage(image, x - asset.width / 2, y - asset.height / 2, asset.width, asset.height);
  }

  drawBuilding(ctx: CanvasRenderingContext2D, building: BuildingState, x: number, y: number) {
    const spriteSet = getBuildingSpriteSet(building.type);
    const image = this.loader.getImage(spriteSet?.idle ?? null);
    if (!spriteSet || !isDrawableImage(image)) { this.fallback.drawBuilding(ctx, building, x, y); return; }
    ctx.drawImage(image, x - spriteSet.idle.width / 2, y - spriteSet.idle.height / 2, spriteSet.idle.width, spriteSet.idle.height);
  }

  drawPlayer(ctx: CanvasRenderingContext2D, player: PlayerPublicState, x: number, y: number, isLocal: boolean, isMoving = false, now = performance.now(), equippedWeaponItemId?: string | null) {
    const spriteSet = getPlayerSpriteSet();
    const sheet = isMoving ? spriteSet.walk ?? spriteSet.idle : spriteSet.idle;
    const image = this.loader.getImage(sheet ?? null);
    const direction = toSpriteDirection(player.direction);
    const mountedPetSpeciesId = isLocal ? getMountedPetSpeciesId(readMountedPetItemId()) : null;
    const playerDrawY = mountedPetSpeciesId ? y - 18 : y;

    if (mountedPetSpeciesId) drawMountedPet(ctx, x, y, mountedPetSpeciesId, direction, isMoving, now);

    if (!sheet || !isDrawableImage(image)) {
      drawAnimatedFallbackPlayer(ctx, player, x, playerDrawY, isLocal, direction, isMoving, now);
      drawEquippedWeapon(ctx, x, playerDrawY, direction, equippedWeaponItemId);
      return;
    }

    try {
      const frameIndex = sheet.frameCount <= 1 ? 0 : Math.floor(now / sheet.frameDurationMs) % sheet.frameCount;
      drawSpriteSheetFrame(ctx, image, sheet, direction, frameIndex, x, playerDrawY, 1);
    } catch {
      drawAnimatedFallbackPlayer(ctx, player, x, playerDrawY, isLocal, direction, isMoving, now);
      drawEquippedWeapon(ctx, x, playerDrawY, direction, equippedWeaponItemId);
      return;
    }

    drawEquippedWeapon(ctx, x, playerDrawY, direction, equippedWeaponItemId);
    if (isLocal) {
      ctx.strokeStyle = mountedPetSpeciesId ? "rgba(125, 211, 252, 0.85)" : "rgba(250, 204, 21, 0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(x, y + 17, mountedPetSpeciesId ? 32 : 18, mountedPetSpeciesId ? 10 : 7, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.font = "13px system-ui";
    ctx.textAlign = "center";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(0,0,0,0.75)";
    ctx.strokeText(player.nickname, x, playerDrawY - 48);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(player.nickname, x, playerDrawY - 48);
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(x - 22, y + 24, 44, 5);
    ctx.fillStyle = "#22c55e";
    ctx.fillRect(x - 22, y + 24, 44 * (player.hp / player.maxHp), 5);
  }
}
