import type { TerrainTileId, TileSetAsset } from "../assets/assetTypes";
import { getTileSet } from "../assets/assetCatalog";
import { AssetLoader } from "../assets/AssetLoader";

const tileSize = 32;

type TileSample = {
  tileId: TerrainTileId;
  variantSeed: number;
};

function hashTile(x: number, y: number) {
  let value = x * 374761393 + y * 668265263;
  value = (value ^ (value >> 13)) * 1274126177;
  return (value ^ (value >> 16)) >>> 0;
}

function sampleTile(worldTileX: number, worldTileY: number): TileSample {
  const noise = hashTile(worldTileX, worldTileY);
  const riverCenter = Math.sin(worldTileY * 0.11) * 9 + Math.cos(worldTileY * 0.035) * 5;
  const riverDistance = Math.abs(worldTileX - riverCenter);

  if (riverDistance < 2.2) return { tileId: "water", variantSeed: noise };
  if (riverDistance < 3.2) return { tileId: "dirt", variantSeed: noise };

  const dirtPath = Math.abs(worldTileY - Math.sin(worldTileX * 0.12) * 6 - 7);
  if (dirtPath < 1.2 && worldTileX > -18 && worldTileX < 42) return { tileId: "dirt", variantSeed: noise };

  const roll = noise % 100;
  if (roll < 8) return { tileId: "grass_dark", variantSeed: noise };
  if (roll < 15) return { tileId: "grass_light", variantSeed: noise };
  if (roll < 20) return { tileId: "flower", variantSeed: noise };
  return { tileId: "grass", variantSeed: noise };
}

function drawTileFromSet(ctx: CanvasRenderingContext2D, image: HTMLImageElement, tileset: TileSetAsset, tileId: TerrainTileId, x: number, y: number) {
  const tileIndex = tileset.tileIds[tileId] ?? 0;
  const sx = (tileIndex % tileset.columns) * tileset.tileWidth;
  const sy = Math.floor(tileIndex / tileset.columns) * tileset.tileHeight;
  ctx.drawImage(image, sx, sy, tileset.tileWidth, tileset.tileHeight, Math.floor(x), Math.floor(y), tileSize, tileSize);
}

export class TileMapRenderer {
  private readonly loader = new AssetLoader();

  draw(ctx: CanvasRenderingContext2D, width: number, height: number, cameraX: number, cameraY: number) {
    const tileset = getTileSet("meadow");
    const image = this.loader.getImage(tileset);

    if (!image) {
      this.drawFallback(ctx, width, height, cameraX, cameraY);
      return;
    }

    const startTileX = Math.floor(cameraX / tileSize) - 1;
    const startTileY = Math.floor(cameraY / tileSize) - 1;
    const endTileX = Math.floor((cameraX + width) / tileSize) + 1;
    const endTileY = Math.floor((cameraY + height) / tileSize) + 1;

    for (let tileY = startTileY; tileY <= endTileY; tileY += 1) {
      for (let tileX = startTileX; tileX <= endTileX; tileX += 1) {
        const screenX = tileX * tileSize - cameraX;
        const screenY = tileY * tileSize - cameraY;
        const sample = sampleTile(tileX, tileY);
        drawTileFromSet(ctx, image, tileset, sample.tileId, screenX, screenY);
      }
    }

    this.drawSoftVignette(ctx, width, height);
  }

  private drawFallback(ctx: CanvasRenderingContext2D, width: number, height: number, cameraX: number, cameraY: number) {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#166534");
    gradient.addColorStop(0.55, "#14532d");
    gradient.addColorStop(1, "#064e3b");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    const startX = -((cameraX % tileSize) + tileSize);
    const startY = -((cameraY % tileSize) + tileSize);

    for (let x = startX; x < width + tileSize; x += tileSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    for (let y = startY; y < height + tileSize; y += tileSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }

  private drawSoftVignette(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const gradient = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.2, width / 2, height / 2, Math.max(width, height) * 0.75);
    gradient.addColorStop(0, "rgba(0,0,0,0)");
    gradient.addColorStop(1, "rgba(0,0,0,0.2)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }
}
