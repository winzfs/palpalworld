import type { SpriteAsset } from "./assetTypes";

export class AssetLoader {
  private readonly imageCache = new Map<string, HTMLImageElement>();
  private readonly failedKeys = new Set<string>();

  getImage(asset: SpriteAsset | null): HTMLImageElement | null {
    if (!asset || this.failedKeys.has(asset.key)) return null;

    const cached = this.imageCache.get(asset.key);
    if (cached) return cached.complete ? cached : null;

    const image = new Image();
    image.src = asset.src;
    image.onerror = () => {
      this.failedKeys.add(asset.key);
      this.imageCache.delete(asset.key);
    };
    this.imageCache.set(asset.key, image);

    return image.complete ? image : null;
  }
}
