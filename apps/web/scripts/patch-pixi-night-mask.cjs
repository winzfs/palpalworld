const fs = require('fs');
const path = require('path');

const pixiPath = path.join(__dirname, '..', 'src', 'features', 'game', 'pixi', 'PixiGameCanvas.tsx');
const cssPath = path.join(__dirname, '..', 'src', 'app', 'hud-menu.css');
let source = fs.readFileSync(pixiPath, 'utf8');
let css = fs.readFileSync(cssPath, 'utf8');
let changed = false;
let cssChanged = false;

function replaceOnce(search, replacement, label) {
  if (source.includes(replacement)) return true;
  if (!source.includes(search)) {
    console.log(`[patch-pixi-night-mask] skipped ${label}`);
    return false;
  }
  source = source.replace(search, replacement);
  changed = true;
  console.log(`[patch-pixi-night-mask] patched ${label}`);
  return true;
}

function replaceFunction(functionName, nextFunctionName, replacement) {
  if (source.includes(replacement.trim())) return;
  const start = source.indexOf(`function ${functionName}`);
  const end = source.indexOf(`\nfunction ${nextFunctionName}`, start + 1);
  if (start < 0 || end < 0) {
    console.log(`[patch-pixi-night-mask] skipped ${functionName}`);
    return;
  }
  source = source.slice(0, start) + replacement.trimEnd() + '\n' + source.slice(end);
  changed = true;
  console.log(`[patch-pixi-night-mask] patched ${functionName}`);
}

replaceOnce(
  '        stage: { addChild: (...children: unknown[]) => void };\n        ticker: { add: (callback: () => void) => void };',
  '        stage: { addChild: (...children: unknown[]) => void };\n        ticker: { add: (callback: () => void) => void };',
  'noop app typing anchor',
);

if (!source.includes('Texture: { from: (source: HTMLCanvasElement) =>')) {
  replaceOnce(
    '      Graphics: new () => {',
    '      Texture: { from: (source: HTMLCanvasElement) => { source?: { update?: () => void }; update?: () => void; destroy?: (destroySource?: boolean) => void } };\n      Sprite: new (texture: { source?: { update?: () => void }; update?: () => void; destroy?: (destroySource?: boolean) => void }) => PixiContainer & { texture: { source?: { update?: () => void }; update?: () => void; destroy?: (destroySource?: boolean) => void }; width: number; height: number; alpha: number; destroy?: (options?: { children?: boolean }) => void };\n      Graphics: new () => {',
    'pixi texture sprite typing',
  );
}

replaceFunction('drawPixiNightLighting', 'isSamePlayerTile', `function carvePixiNightLight(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, strength: number) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, \`rgba(0,0,0,\${Math.min(1, strength)})\`);
  gradient.addColorStop(0.42, \`rgba(0,0,0,\${Math.min(1, strength * 0.82)})\`);
  gradient.addColorStop(0.72, \`rgba(0,0,0,\${Math.min(1, strength * 0.34)})\`);
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawPixiNightGlow(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, torch: boolean) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  if (torch) {
    gradient.addColorStop(0, "rgba(255,218,145,0.16)");
    gradient.addColorStop(0.46, "rgba(255,156,74,0.055)");
    gradient.addColorStop(1, "rgba(255,156,74,0)");
  } else {
    gradient.addColorStop(0, "rgba(191,219,254,0.065)");
    gradient.addColorStop(0.56, "rgba(147,197,253,0.022)");
    gradient.addColorStop(1, "rgba(147,197,253,0)");
  }
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawPixiNightLighting(maskCanvas: HTMLCanvasElement, maskContext: CanvasRenderingContext2D, maskTexture: { source?: { update?: () => void }; update?: () => void }, width: number, height: number, cameraX: number, cameraY: number, drawablePlayers: DrawablePlayer[]) {
  const canvasWidth = Math.max(1, Math.ceil(width));
  const canvasHeight = Math.max(1, Math.ceil(height));
  if (maskCanvas.width !== canvasWidth || maskCanvas.height !== canvasHeight) {
    maskCanvas.width = canvasWidth;
    maskCanvas.height = canvasHeight;
  }

  maskContext.setTransform(1, 0, 0, 1, 0, 0);
  maskContext.clearRect(0, 0, canvasWidth, canvasHeight);
  if (!isNightModeActive()) {
    maskTexture.source?.update?.();
    maskTexture.update?.();
    return;
  }

  maskContext.globalCompositeOperation = "source-over";
  maskContext.fillStyle = "rgba(1, 3, 10, 0.88)";
  maskContext.fillRect(0, 0, canvasWidth, canvasHeight);

  const lights: { x: number; y: number; radius: number; strength: number; torch: boolean }[] = [];
  for (const entry of drawablePlayers) {
    const screenX = entry.player.position.x - cameraX;
    const screenY = entry.player.position.y - cameraY + 2;
    if (screenX < -320 || screenY < -320 || screenX > width + 320 || screenY > height + 320) continue;
    const torch = hasTorchEquipped(entry.player);
    const radius = torch ? 238 : entry.isLocal ? 66 : 0;
    if (radius <= 0) continue;
    const flicker = torch ? 0.94 + Math.sin(Date.now() / 90 + screenX * 0.013) * 0.06 : 1;
    lights.push({ x: screenX, y: screenY, radius: radius * flicker, strength: torch ? 0.96 : 0.56, torch });
  }

  maskContext.globalCompositeOperation = "destination-out";
  for (const light of lights) carvePixiNightLight(maskContext, light.x, light.y, light.radius, light.strength);

  maskContext.globalCompositeOperation = "source-over";
  for (const light of lights) drawPixiNightGlow(maskContext, light.x, light.y, light.radius * 0.78, light.torch);

  maskContext.globalCompositeOperation = "source-over";
  maskTexture.source?.update?.();
  maskTexture.update?.();
}`);

replaceOnce(
  '      const lightingGraphics = new PIXI.Graphics();\n      layers.lighting.addChild(lightingGraphics as unknown as PixiContainer);',
  '      const nightMaskCanvas = document.createElement("canvas");\n      const nightMaskContext = nightMaskCanvas.getContext("2d", { alpha: true });\n      if (!nightMaskContext) throw new Error("Failed to create Pixi night mask context.");\n      const nightMaskTexture = PIXI.Texture.from(nightMaskCanvas);\n      const nightMaskSprite = new PIXI.Sprite(nightMaskTexture);\n      nightMaskSprite.alpha = 1;\n      app.stage.addChild(nightMaskSprite as unknown as PixiContainer);\n      layers.lighting.visible = false;',
  'create pixi night sprite from layer lighting',
);

replaceOnce(
  '      const lightingGraphics = new PIXI.Graphics();\n      app.stage.addChild(lightingGraphics as unknown as PixiContainer);\n      layers.lighting.visible = false;',
  '      const nightMaskCanvas = document.createElement("canvas");\n      const nightMaskContext = nightMaskCanvas.getContext("2d", { alpha: true });\n      if (!nightMaskContext) throw new Error("Failed to create Pixi night mask context.");\n      const nightMaskTexture = PIXI.Texture.from(nightMaskCanvas);\n      const nightMaskSprite = new PIXI.Sprite(nightMaskTexture);\n      nightMaskSprite.alpha = 1;\n      app.stage.addChild(nightMaskSprite as unknown as PixiContainer);\n      layers.lighting.visible = false;',
  'create pixi night sprite from screen lighting',
);

replaceOnce(
  '      const lightingGraphics = new PIXI.Graphics();\n      const feedbackGraphics = new PIXI.Graphics();\n      layers.effects.addChild(feedbackGraphics as unknown as PixiContainer);\n      app.stage.addChild(lightingGraphics as unknown as PixiContainer);\n      layers.lighting.visible = false;',
  '      const nightMaskCanvas = document.createElement("canvas");\n      const nightMaskContext = nightMaskCanvas.getContext("2d", { alpha: true });\n      if (!nightMaskContext) throw new Error("Failed to create Pixi night mask context.");\n      const nightMaskTexture = PIXI.Texture.from(nightMaskCanvas);\n      const nightMaskSprite = new PIXI.Sprite(nightMaskTexture);\n      nightMaskSprite.alpha = 1;\n      const feedbackGraphics = new PIXI.Graphics();\n      layers.effects.addChild(feedbackGraphics as unknown as PixiContainer);\n      app.stage.addChild(nightMaskSprite as unknown as PixiContainer);\n      layers.lighting.visible = false;',
  'create pixi night sprite with feedback',
);

replaceOnce(
  '        const lighting = lightingGraphics as unknown as PixiTransformNode;\n        lighting.position.set(0, 0);\n        lighting.scale.set(1);',
  '        const lighting = nightMaskSprite as unknown as PixiTransformNode;\n        lighting.position.set(0, 0);\n        lighting.scale.set(1);\n        nightMaskSprite.width = host.clientWidth;\n        nightMaskSprite.height = host.clientHeight;',
  'night sprite transform',
);

replaceOnce(
  '        drawPixiNightLighting(lightingGraphics, host.clientWidth, host.clientHeight, camera.x, camera.y, drawablePlayers);',
  '        drawPixiNightLighting(nightMaskCanvas, nightMaskContext, nightMaskTexture, host.clientWidth, host.clientHeight, camera.x, camera.y, drawablePlayers);',
  'night sprite draw call',
);

replaceOnce(
  '        lightingGraphics.destroy?.();',
  '        nightMaskSprite.destroy?.({ children: true });\n        nightMaskTexture.destroy?.(true);',
  'night sprite cleanup',
);

const hideBlock = `.game-shell--pixi-stage.game-shell--night .night-field-overlay,
.game-shell--pixi-stage.game-shell--night .night-player-light {
  display: none !important;
}

`;
if (!css.includes(hideBlock)) {
  css = css.replace('/* pixi night dom fallback */\n.game-shell--pixi-stage.game-shell--night .night-field-overlay,\n.game-shell--pixi-stage.game-shell--night .night-player-light {\n  display: block;\n}\n', '');
  css = `${css.trimEnd()}\n\n/* pixi night ownership */\n${hideBlock}.game-shell--pixi-stage.game-shell--night .pixi-game-canvas {\n  filter: saturate(0.92) contrast(1.04);\n}\n`;
  cssChanged = true;
  console.log('[patch-pixi-night-mask] restored Pixi ownership and hid DOM night fallback');
}

if (changed) fs.writeFileSync(pixiPath, source);
if (cssChanged) fs.writeFileSync(cssPath, css);
if (!changed && !cssChanged) console.log('[patch-pixi-night-mask] no changes');
