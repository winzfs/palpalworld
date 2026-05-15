import type { TerrainTileId, TileSetAsset } from "../assets/assetTypes";
import { getTileSet } from "../assets/assetCatalog";
import { AssetLoader } from "../assets/AssetLoader";

const tileSize = 32;
const cacheBufferTiles = 8;
const rerenderThresholdTiles = 4;

function hashTile(x: number, y: number) {
  let value = x * 374761393 + y * 668265263;
  value = (value ^ (value >> 13)) * 1274126177;
  return (value ^ (value >> 16)) >>> 0;
}

function sampleTileId(worldTileX: number, worldTileY: number): TerrainTileId {
  const riverCenter = Math.sin(worldTileY * 0.11) * 9 + Math.cos(worldTileY * 0.035) * 5;
  const riverDistance = Math.abs(worldTileX - riverCenter);

  if (riverDistance < 2.2) return "water";
  if (riverDistance < 3.2) return "dirt";

  const dirtPath = Math.abs(worldTileY - Math.sin(worldTileX * 0.12) * 6 - 7);
  if (dirtPath < 1.2 && worldTileX > -18 && worldTileX < 42) return "dirt";

  const roll = hashTile(worldTileX, worldTileY) % 100;
  if (roll < 8) return "grass_dark";
  if (roll < 15) return "grass_light";
  if (roll < 20) return "flower";
  return "grass";
}

function drawTileFromSet(ctx: CanvasRenderingContext2D, image: HTMLImageElement, tileset: TileSetAsset, tileId: TerrainTileId, x: number, y: number) {
  const tileIndex = tileset.tileIds[tileId] ?? 0;
  const sx = (tileIndex % tileset.columns) * tileset.tileWidth;
  const sy = Math.floor(tileIndex / tileset.columns) * tileset.tileHeight;
  ctx.drawImage(image, sx, sy, tileset.tileWidth, tileset.tileHeight, x, y, tileSize, tileSize);
}

export class TileMapRenderer {
  private readonly loader = new AssetLoader();
  private cacheCanvas: HTMLCanvasElement | null = null;
  private cacheCtx: CanvasRenderingContext2D | null = null;
  private cacheTileOriginX = 0;
  private cacheTileOriginY = 0;
  private cacheTileWidth = 0;
  private cacheTileHeight = 0;
  private cacheTilesetVersion: TileSetAsset | null = null;
  private cacheImage: HTMLImageElement | null = null;

  draw(ctx: CanvasRenderingContext2D, width: number, height: number, cameraX: number, cameraY: number) {
    const tileset = getTileSet("meadow");
    const image = this.loader.getImage(tileset);

    if (!image) {
      this.drawFallback(ctx, width, height, cameraX, cameraY);
      return;
    }

    const viewTileX = Math.floor(cameraX / tileSize) - 1;
    const viewTileY = Math.floor(cameraY / tileSize) - 1;
    const viewTileWidth = Math.ceil(width / tileSize) + 3;
    const viewTileHeight = Math.ceil(height / tileSize) + 3;

    const needRebuild = !this.cacheCanvas
      || this.cacheTilesetVersion !== tileset
      || this.cacheImage !== image
      || this.cacheTileWidth < viewTileWidth + cacheBufferTiles
      || this.cacheTileHeight < viewTileHeight + cacheBufferTiles
      || viewTileX < this.cacheTileOriginX + rerenderThresholdTiles
      || viewTileY < this.cacheTileOriginY + rerenderThresholdTiles
      || viewTileX + viewTileWidth > this.cacheTileOriginX + this.cacheTileWidth - rerenderThresholdTiles
      || viewTileY + viewTileHeight > this.cacheTileOriginY + this.cacheTileHeight - rerenderThresholdTiles;

    if (needRebuild) {
      this.rebuildCache(tileset, image, viewTileX, viewTileY, viewTileWidth, viewTileHeight);
    }

    if (this.cacheCanvas) {
      const offsetX = this.cacheTileOriginX * tileSize - cameraX;
      const offsetY = this.cacheTileOriginY * tileSize - cameraY;
      ctx.drawImage(this.cacheCanvas, Math.floor(offsetX), Math.floor(offsetY));
    }

    this.drawSoftVignette(ctx, width, height);
  }

  private rebuildCache(tileset: TileSetAsset, image: HTMLImageElement, viewTileX: number, viewTileY: number, viewTileWidth: number, viewTileHeight: number) {
    const tileWidth = viewTileWidth + cacheBufferTiles * 2;
    const tileHeight = viewTileHeight + cacheBufferTiles * 2;
    const originX = viewTileX - cacheBufferTiles;
    const originY = viewTileY - cacheBufferTiles;

    if (!this.cacheCanvas || this.cacheTileWidth !== tileWidth || this.cacheTileHeight !== tileHeight) {
      const canvas = this.cacheCanvas ?? document.createElement("canvas");
      canvas.width = tileWidth * tileSize;
      canvas.height = tileHeight * tileSize;
      const cacheCtx = canvas.getContext("2d");
      if (!cacheCtx) return;
      cacheCtx.imageSmoothingEnabled = false;
      this.cacheCanvas = canvas;
      this.cacheCtx = cacheCtx;
    }

    const cacheCtx = this.cacheCtx;
    if (!cacheCtx) return;
    cacheCtx.clearRect(0, 0, tileWidth * tileSize, tileHeight * tileSize);
    for (let row = 0; row < tileHeight; row += 1) {
      for (let col = 0; col < tileWidth; col += 1) {
        const worldTileX = originX + col;
        const worldTileY = originY + row;
        const tileId = sampleTileId(worldTileX, worldTileY);
        drawTileFromSet(cacheCtx, image, tileset, tileId, col * tileSize, row * tileSize);
      }
    }

    this.cacheTileOriginX = originX;
    this.cacheTileOriginY = originY;
    this.cacheTileWidth = tileWidth;
    this.cacheTileHeight = tileHeight;
    this.cacheTilesetVersion = tileset;
    this.cacheImage = image;
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
