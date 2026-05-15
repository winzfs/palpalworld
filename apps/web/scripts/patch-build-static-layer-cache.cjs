const fs = require("fs");
const path = require("path");

const target = path.join(__dirname, "..", "src", "features", "game", "GameScene.tsx");
let source = fs.readFileSync(target, "utf8");
let changed = false;

function once(search, replacement, label) {
  if (source.includes(replacement)) {
    console.log(`[patch-build-static-layer-cache] already-patched ${label}`);
    return;
  }
  if (!source.includes(search)) {
    console.log(`[patch-build-static-layer-cache] skipped ${label}`);
    return;
  }
  source = source.replace(search, replacement);
  changed = true;
  console.log(`[patch-build-static-layer-cache] patched ${label}`);
}

once(
  `      ctx.save();
      ctx.globalAlpha *= visibility.alpha;
      this.buildPartRenderer.drawPlacedPart(ctx, part, isoCamX, isoCamY);
      ctx.restore();
    }
  }

  private drawBuildPartsForeground`,
  `      ctx.save();
      ctx.globalAlpha *= visibility.alpha;
      this.buildPartRenderer.drawPlacedPart(ctx, part, isoCamX, isoCamY);
      ctx.restore();
    }
  }

  private drawBuildPartsCachedBase(ctx: CanvasRenderingContext2D, parts: PlacedBuildPart[], isoCamX: number, isoCamY: number, viewport: ViewportBounds) {
    if (parts.length <= 0) return false;
    const width = Math.ceil((this.cachedRootRectWidth || this.root.clientWidth) + 360);
    const height = Math.ceil((this.cachedRootRectHeight || this.root.clientHeight) + 360);
    if (width <= 0 || height <= 0) return false;
    const bucketX = Math.floor(isoCamX / 128) * 128;
    const bucketY = Math.floor(isoCamY / 128) * 128;
    const key = parts.length + ":" + bucketX + ":" + bucketY + ":" + parts.map((part) => [part.id, part.partId, part.gridX, part.gridY, part.rotation, part.floorLevel, part.isOpen === true ? 1 : 0].join("/")).join("|");
    let cache = (this as any).__buildStaticBaseLayerCache as { key: string; canvas: HTMLCanvasElement; width: number; height: number; bucketX: number; bucketY: number } | undefined;
    if (!cache || cache.key !== key || cache.width !== width || cache.height !== height) {
      const canvas = cache?.canvas ?? document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const cacheCtx = canvas.getContext("2d");
      if (!cacheCtx) return false;
      cacheCtx.clearRect(0, 0, width, height);
      cacheCtx.imageSmoothingEnabled = false;
      for (const part of parts) {
        const visibility = { hide: false, alpha: 0.94, outlineAlpha: 0 };
        if (visibility.hide) continue;
        cacheCtx.save();
        cacheCtx.globalAlpha *= visibility.alpha;
        this.buildPartRenderer.drawPlacedPart(cacheCtx, part, bucketX - 180, bucketY - 180);
        cacheCtx.restore();
      }
      cache = { key, canvas, width, height, bucketX, bucketY };
      (this as any).__buildStaticBaseLayerCache = cache;
    }
    ctx.drawImage(cache.canvas, Math.round(cache.bucketX - 180 - isoCamX), Math.round(cache.bucketY - 180 - isoCamY));
    return true;
  }

  private drawBuildPartsForeground`,
  "base cache helper",
);

once(
  `    const heavyScene = sourceParts.length > 90 || visibleParts.length > 50;
    for (const part of visibleParts) {`,
  `    const heavyScene = sourceParts.length > 90 || visibleParts.length > 50;
    if (heavyScene && this.drawBuildPartsCachedBase(ctx, visibleParts, isoCamX, isoCamY, viewport)) return;
    for (const part of visibleParts) {`,
  "use base cache in heavy scene",
);

if (changed) fs.writeFileSync(target, source);
