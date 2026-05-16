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

if (!source.includes('RenderTexture: { create:')) {
  replaceOnce(
    '        stage: { addChild: (...children: unknown[]) => void };\n        ticker: { add: (callback: () => void) => void };',
    '        stage: { addChild: (...children: unknown[]) => void };\n        renderer: { render: (options: { container: unknown; target: unknown; clear?: boolean }) => void };\n        ticker: { add: (callback: () => void) => void };',
    'app renderer typing',
  );
  replaceOnce(
    '      Container: new () => PixiContainer;\n      Graphics: new () => {',
    '      Container: new () => PixiContainer;\n      RenderTexture: { create: (options: { width: number; height: number; resolution?: number }) => { resize?: (width: number, height: number) => void; destroy?: (destroyBase?: boolean) => void } };\n      Sprite: new (texture: { resize?: (width: number, height: number) => void; destroy?: (destroyBase?: boolean) => void }) => PixiContainer & { texture: unknown; width: number; height: number; alpha: number; destroy?: (options?: { children?: boolean }) => void };\n      Graphics: new () => {',
    'render texture sprite typing',
  );
}

replaceFunction('drawPixiNightLighting', 'isSamePlayerTile', `function drawPixiNightLighting(PIXI: NonNullable<Window["PIXI"]>, app: InstanceType<NonNullable<Window["PIXI"]>["Application"]>, darknessGraphics: PixiGraphics, glowGraphics: PixiGraphics, cutoutGraphics: PixiGraphics, renderContainer: PixiContainer, renderTexture: { resize?: (width: number, height: number) => void }, nightSprite: PixiContainer & { width: number; height: number; alpha: number }, width: number, height: number, cameraX: number, cameraY: number, drawablePlayers: DrawablePlayer[]) {
  const screenWidth = Math.max(1, Math.ceil(width));
  const screenHeight = Math.max(1, Math.ceil(height));
  nightSprite.width = screenWidth;
  nightSprite.height = screenHeight;
  renderTexture.resize?.(screenWidth, screenHeight);

  darknessGraphics.clear();
  glowGraphics.clear();
  cutoutGraphics.clear();
  if (!isNightModeActive()) {
    nightSprite.alpha = 0;
    app.renderer.render({ container: renderContainer, target: renderTexture, clear: true });
    return;
  }

  nightSprite.alpha = 1;
  darknessGraphics.rect(0, 0, screenWidth, screenHeight);
  darknessGraphics.fill({ color: 0x01030a, alpha: 0.88 });

  for (const entry of drawablePlayers) {
    const screenX = entry.player.position.x - cameraX;
    const screenY = entry.player.position.y - cameraY + 2;
    if (screenX < -360 || screenY < -360 || screenX > screenWidth + 360 || screenY > screenHeight + 360) continue;
    const torch = hasTorchEquipped(entry.player);
    const outerRadius = torch ? 238 : entry.isLocal ? 68 : 0;
    if (outerRadius <= 0) continue;
    const flicker = torch ? 0.94 + Math.sin(Date.now() / 90 + screenX * 0.013) * 0.06 : 1;
    const r1 = outerRadius * flicker;
    const r2 = r1 * 0.74;
    const r3 = r1 * 0.48;
    const r4 = torch ? r1 * 0.25 : r1 * 0.30;

    // Soft glow tint lives inside the isolated render texture, never erasing the main stage.
    glowGraphics.circle(screenX, screenY, r1);
    glowGraphics.fill({ color: torch ? 0xfbbf24 : 0x93c5fd, alpha: torch ? 0.09 : 0.035 });
    glowGraphics.circle(screenX, screenY, r2);
    glowGraphics.fill({ color: torch ? 0xffedd5 : 0xbfdbfe, alpha: torch ? 0.065 : 0.025 });

    // Erase only the isolated darkness texture. This is safe because cutoutGraphics is not on app.stage.
    cutoutGraphics.circle(screenX, screenY, r1);
    cutoutGraphics.fill({ color: 0xffffff, alpha: torch ? 0.20 : 0.12 });
    cutoutGraphics.circle(screenX, screenY, r2);
    cutoutGraphics.fill({ color: 0xffffff, alpha: torch ? 0.28 : 0.18 });
    cutoutGraphics.circle(screenX, screenY, r3);
    cutoutGraphics.fill({ color: 0xffffff, alpha: torch ? 0.42 : 0.26 });
    cutoutGraphics.circle(screenX, screenY, r4);
    cutoutGraphics.fill({ color: 0xffffff, alpha: torch ? 0.74 : 0.36 });
  }

  app.renderer.render({ container: renderContainer, target: renderTexture, clear: true });
}`);

replaceOnce(
  '      const lightingGraphics = new PIXI.Graphics();\n      layers.lighting.addChild(lightingGraphics as unknown as PixiContainer);',
  '      const nightRenderContainer = new PIXI.Container();\n      const nightDarknessGraphics = new PIXI.Graphics();\n      const nightGlowGraphics = new PIXI.Graphics();\n      const nightCutoutGraphics = new PIXI.Graphics();\n      (nightCutoutGraphics as unknown as { blendMode: string }).blendMode = "erase";\n      nightRenderContainer.addChild(nightDarknessGraphics as unknown as PixiContainer, nightGlowGraphics as unknown as PixiContainer, nightCutoutGraphics as unknown as PixiContainer);\n      let nightRenderTexture = PIXI.RenderTexture.create({ width: Math.max(1, host.clientWidth), height: Math.max(1, host.clientHeight), resolution: Math.min(window.devicePixelRatio || 1, 2) });\n      const nightMaskSprite = new PIXI.Sprite(nightRenderTexture);\n      nightMaskSprite.alpha = 0;\n      app.stage.addChild(nightMaskSprite as unknown as PixiContainer);\n      layers.lighting.visible = false;',
  'create isolated pixi night render texture from layer lighting',
);

replaceOnce(
  '      const lightingGraphics = new PIXI.Graphics();\n      app.stage.addChild(lightingGraphics as unknown as PixiContainer);\n      layers.lighting.visible = false;',
  '      const nightRenderContainer = new PIXI.Container();\n      const nightDarknessGraphics = new PIXI.Graphics();\n      const nightGlowGraphics = new PIXI.Graphics();\n      const nightCutoutGraphics = new PIXI.Graphics();\n      (nightCutoutGraphics as unknown as { blendMode: string }).blendMode = "erase";\n      nightRenderContainer.addChild(nightDarknessGraphics as unknown as PixiContainer, nightGlowGraphics as unknown as PixiContainer, nightCutoutGraphics as unknown as PixiContainer);\n      let nightRenderTexture = PIXI.RenderTexture.create({ width: Math.max(1, host.clientWidth), height: Math.max(1, host.clientHeight), resolution: Math.min(window.devicePixelRatio || 1, 2) });\n      const nightMaskSprite = new PIXI.Sprite(nightRenderTexture);\n      nightMaskSprite.alpha = 0;\n      app.stage.addChild(nightMaskSprite as unknown as PixiContainer);\n      layers.lighting.visible = false;',
  'create isolated pixi night render texture from screen lighting',
);

replaceOnce(
  '      const lightingGraphics = new PIXI.Graphics();\n      const feedbackGraphics = new PIXI.Graphics();\n      layers.effects.addChild(feedbackGraphics as unknown as PixiContainer);\n      app.stage.addChild(lightingGraphics as unknown as PixiContainer);\n      layers.lighting.visible = false;',
  '      const nightRenderContainer = new PIXI.Container();\n      const nightDarknessGraphics = new PIXI.Graphics();\n      const nightGlowGraphics = new PIXI.Graphics();\n      const nightCutoutGraphics = new PIXI.Graphics();\n      (nightCutoutGraphics as unknown as { blendMode: string }).blendMode = "erase";\n      nightRenderContainer.addChild(nightDarknessGraphics as unknown as PixiContainer, nightGlowGraphics as unknown as PixiContainer, nightCutoutGraphics as unknown as PixiContainer);\n      let nightRenderTexture = PIXI.RenderTexture.create({ width: Math.max(1, host.clientWidth), height: Math.max(1, host.clientHeight), resolution: Math.min(window.devicePixelRatio || 1, 2) });\n      const nightMaskSprite = new PIXI.Sprite(nightRenderTexture);\n      nightMaskSprite.alpha = 0;\n      const feedbackGraphics = new PIXI.Graphics();\n      layers.effects.addChild(feedbackGraphics as unknown as PixiContainer);\n      app.stage.addChild(nightMaskSprite as unknown as PixiContainer);\n      layers.lighting.visible = false;',
  'create isolated pixi night render texture with feedback',
);

replaceOnce(
  '      const nightMaskCanvas = document.createElement("canvas");\n      const nightMaskContext = nightMaskCanvas.getContext("2d", { alpha: true });\n      if (!nightMaskContext) throw new Error("Failed to create Pixi night mask context.");\n      const nightMaskTexture = PIXI.Texture.from(nightMaskCanvas);\n      const nightMaskSprite = new PIXI.Sprite(nightMaskTexture);\n      nightMaskSprite.alpha = 1;\n      app.stage.addChild(nightMaskSprite as unknown as PixiContainer);\n      layers.lighting.visible = false;',
  '      const nightRenderContainer = new PIXI.Container();\n      const nightDarknessGraphics = new PIXI.Graphics();\n      const nightGlowGraphics = new PIXI.Graphics();\n      const nightCutoutGraphics = new PIXI.Graphics();\n      (nightCutoutGraphics as unknown as { blendMode: string }).blendMode = "erase";\n      nightRenderContainer.addChild(nightDarknessGraphics as unknown as PixiContainer, nightGlowGraphics as unknown as PixiContainer, nightCutoutGraphics as unknown as PixiContainer);\n      let nightRenderTexture = PIXI.RenderTexture.create({ width: Math.max(1, host.clientWidth), height: Math.max(1, host.clientHeight), resolution: Math.min(window.devicePixelRatio || 1, 2) });\n      const nightMaskSprite = new PIXI.Sprite(nightRenderTexture);\n      nightMaskSprite.alpha = 0;\n      app.stage.addChild(nightMaskSprite as unknown as PixiContainer);\n      layers.lighting.visible = false;',
  'replace canvas night mask with isolated render texture',
);

replaceOnce(
  '      const nightMaskCanvas = document.createElement("canvas");\n      const nightMaskContext = nightMaskCanvas.getContext("2d", { alpha: true });\n      if (!nightMaskContext) throw new Error("Failed to create Pixi night mask context.");\n      const nightMaskTexture = PIXI.Texture.from(nightMaskCanvas);\n      const nightMaskSprite = new PIXI.Sprite(nightMaskTexture);\n      nightMaskSprite.alpha = 1;\n      const feedbackGraphics = new PIXI.Graphics();\n      layers.effects.addChild(feedbackGraphics as unknown as PixiContainer);\n      app.stage.addChild(nightMaskSprite as unknown as PixiContainer);\n      layers.lighting.visible = false;',
  '      const nightRenderContainer = new PIXI.Container();\n      const nightDarknessGraphics = new PIXI.Graphics();\n      const nightGlowGraphics = new PIXI.Graphics();\n      const nightCutoutGraphics = new PIXI.Graphics();\n      (nightCutoutGraphics as unknown as { blendMode: string }).blendMode = "erase";\n      nightRenderContainer.addChild(nightDarknessGraphics as unknown as PixiContainer, nightGlowGraphics as unknown as PixiContainer, nightCutoutGraphics as unknown as PixiContainer);\n      let nightRenderTexture = PIXI.RenderTexture.create({ width: Math.max(1, host.clientWidth), height: Math.max(1, host.clientHeight), resolution: Math.min(window.devicePixelRatio || 1, 2) });\n      const nightMaskSprite = new PIXI.Sprite(nightRenderTexture);\n      nightMaskSprite.alpha = 0;\n      const feedbackGraphics = new PIXI.Graphics();\n      layers.effects.addChild(feedbackGraphics as unknown as PixiContainer);\n      app.stage.addChild(nightMaskSprite as unknown as PixiContainer);\n      layers.lighting.visible = false;',
  'replace canvas night mask with isolated render texture and feedback',
);

replaceOnce(
  '        const lighting = lightingGraphics as unknown as PixiTransformNode;\n        lighting.position.set(0, 0);\n        lighting.scale.set(1);',
  '        const lighting = nightMaskSprite as unknown as PixiTransformNode;\n        lighting.position.set(0, 0);\n        lighting.scale.set(1);',
  'night render texture sprite transform from graphics',
);

replaceOnce(
  '        const lighting = nightMaskSprite as unknown as PixiTransformNode;\n        lighting.position.set(0, 0);\n        lighting.scale.set(1);\n        nightMaskSprite.width = host.clientWidth;\n        nightMaskSprite.height = host.clientHeight;',
  '        const lighting = nightMaskSprite as unknown as PixiTransformNode;\n        lighting.position.set(0, 0);\n        lighting.scale.set(1);',
  'remove canvas night sprite sizing transform',
);

replaceOnce(
  '        drawPixiNightLighting(lightingGraphics, host.clientWidth, host.clientHeight, camera.x, camera.y, drawablePlayers);',
  '        drawPixiNightLighting(PIXI, app, nightDarknessGraphics, nightGlowGraphics, nightCutoutGraphics, nightRenderContainer, nightRenderTexture, nightMaskSprite, host.clientWidth, host.clientHeight, camera.x, camera.y, drawablePlayers);',
  'night render texture draw call from graphics',
);

replaceOnce(
  '        drawPixiNightLighting(nightMaskCanvas, nightMaskContext, nightMaskTexture, host.clientWidth, host.clientHeight, camera.x, camera.y, drawablePlayers);',
  '        drawPixiNightLighting(PIXI, app, nightDarknessGraphics, nightGlowGraphics, nightCutoutGraphics, nightRenderContainer, nightRenderTexture, nightMaskSprite, host.clientWidth, host.clientHeight, camera.x, camera.y, drawablePlayers);',
  'night render texture draw call from canvas',
);

replaceOnce(
  '        lightingGraphics.destroy?.();',
  '        nightMaskSprite.destroy?.({ children: true });\n        nightRenderTexture.destroy?.(true);\n        nightRenderContainer.destroy?.({ children: true });',
  'night render texture cleanup from graphics',
);

replaceOnce(
  '        nightMaskSprite.destroy?.({ children: true });\n        nightMaskTexture.destroy?.(true);',
  '        nightMaskSprite.destroy?.({ children: true });\n        nightRenderTexture.destroy?.(true);\n        nightRenderContainer.destroy?.({ children: true });',
  'night render texture cleanup from canvas',
);

const fallbackBlock = `/* pixi night dom fallback */
.game-shell--pixi-stage.game-shell--night .night-field-overlay,
.game-shell--pixi-stage.game-shell--night .night-player-light {
  display: block;
}
`;
if (css.includes(fallbackBlock)) {
  css = css.replace(fallbackBlock, '');
  cssChanged = true;
  console.log('[patch-pixi-night-mask] removed DOM fallback block');
}

const hideBlock = `.game-shell--pixi-stage.game-shell--night .night-field-overlay,
.game-shell--pixi-stage.game-shell--night .night-player-light {
  display: none !important;
}

`;
if (!css.includes(hideBlock)) {
  css = `${css.trimEnd()}\n\n/* pixi night ownership */\n${hideBlock}.game-shell--pixi-stage.game-shell--night .pixi-game-canvas {\n  filter: saturate(0.92) contrast(1.04);\n}\n`;
  cssChanged = true;
  console.log('[patch-pixi-night-mask] hid DOM night fallback for Pixi night ownership');
}

if (changed) fs.writeFileSync(pixiPath, source);
if (cssChanged) fs.writeFileSync(cssPath, css);
if (!changed && !cssChanged) console.log('[patch-pixi-night-mask] no changes');
