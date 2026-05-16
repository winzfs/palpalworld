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

replaceFunction('drawPixiNightLighting', 'isSamePlayerTile', `function drawPixiNightLighting(darknessGraphics: PixiGraphics, glowGraphics: PixiGraphics, eraseGraphics: PixiGraphics, width: number, height: number, cameraX: number, cameraY: number, drawablePlayers: DrawablePlayer[]) {
  darknessGraphics.clear();
  glowGraphics.clear();
  eraseGraphics.clear();
  if (!isNightModeActive()) return;

  // Real light mask: draw darkness first, then erase holes from the darkness layer.
  // Glow is only a subtle tint; visibility comes from the ERASE layer, not from bright paint.
  darknessGraphics.rect(0, 0, width, height);
  darknessGraphics.fill({ color: 0x01030a, alpha: 0.82 });

  for (const entry of drawablePlayers) {
    const screenX = entry.player.position.x - cameraX;
    const screenY = entry.player.position.y - cameraY + 2;
    const torch = hasTorchEquipped(entry.player);
    const outerRadius = torch ? 178 : entry.isLocal ? 58 : 0;
    const coreRadius = torch ? 58 : entry.isLocal ? 19 : 0;
    if (outerRadius <= 0) continue;

    const flicker = torch ? 0.92 + Math.sin(Date.now() / 90 + screenX * 0.013) * 0.08 : 1;
    const warmth = torch ? 0xfbbf24 : 0x93c5fd;

    // Soft visible glow around the cut-out. This is intentionally low-alpha.
    glowGraphics.circle(screenX, screenY, outerRadius * flicker);
    glowGraphics.fill({ color: warmth, alpha: torch ? 0.105 : 0.045 });
    glowGraphics.circle(screenX, screenY, Math.max(coreRadius, outerRadius * 0.52) * flicker);
    glowGraphics.fill({ color: torch ? 0xffedd5 : 0xbfdbfe, alpha: torch ? 0.075 : 0.035 });

    // Erase darkness in layered circles. Outer rings remove a little darkness,
    // inner rings remove much more, producing a fake radial falloff without a shader.
    const rings = torch
      ? [
          { r: outerRadius, a: 0.10 },
          { r: outerRadius * 0.82, a: 0.13 },
          { r: outerRadius * 0.66, a: 0.17 },
          { r: outerRadius * 0.50, a: 0.23 },
          { r: outerRadius * 0.34, a: 0.32 },
          { r: coreRadius, a: 0.46 },
        ]
      : [
          { r: outerRadius, a: 0.08 },
          { r: outerRadius * 0.72, a: 0.12 },
          { r: outerRadius * 0.48, a: 0.18 },
          { r: coreRadius, a: 0.24 },
        ];
    for (const ring of rings) {
      eraseGraphics.circle(screenX, screenY, Math.max(2, ring.r * flicker));
      eraseGraphics.fill({ color: 0xffffff, alpha: ring.a });
    }
  }
}`);

replaceOnce(
  '      const lightingGraphics = new PIXI.Graphics();\n      layers.lighting.addChild(lightingGraphics as unknown as PixiContainer);',
  '      const lightingContainer = new PIXI.Container();\n      const darknessGraphics = new PIXI.Graphics();\n      const glowGraphics = new PIXI.Graphics();\n      const lightEraseGraphics = new PIXI.Graphics();\n      (lightEraseGraphics as unknown as { blendMode: string }).blendMode = "erase";\n      lightingContainer.addChild(darknessGraphics as unknown as PixiContainer, glowGraphics as unknown as PixiContainer, lightEraseGraphics as unknown as PixiContainer);\n      app.stage.addChild(lightingContainer as unknown as PixiContainer);\n      layers.lighting.visible = false;',
  'move lighting to screen stage',
);

replaceOnce(
  '      const lightingGraphics = new PIXI.Graphics();\n      const feedbackGraphics = new PIXI.Graphics();\n      layers.effects.addChild(feedbackGraphics as unknown as PixiContainer);\n      layers.lighting.addChild(lightingGraphics as unknown as PixiContainer);',
  '      const lightingContainer = new PIXI.Container();\n      const darknessGraphics = new PIXI.Graphics();\n      const glowGraphics = new PIXI.Graphics();\n      const lightEraseGraphics = new PIXI.Graphics();\n      (lightEraseGraphics as unknown as { blendMode: string }).blendMode = "erase";\n      lightingContainer.addChild(darknessGraphics as unknown as PixiContainer, glowGraphics as unknown as PixiContainer, lightEraseGraphics as unknown as PixiContainer);\n      const feedbackGraphics = new PIXI.Graphics();\n      layers.effects.addChild(feedbackGraphics as unknown as PixiContainer);\n      app.stage.addChild(lightingContainer as unknown as PixiContainer);\n      layers.lighting.visible = false;',
  'move lighting to screen stage with feedback',
);

replaceOnce(
  '      const lightingGraphics = new PIXI.Graphics();\n      app.stage.addChild(lightingGraphics as unknown as PixiContainer);\n      layers.lighting.visible = false;',
  '      const lightingContainer = new PIXI.Container();\n      const darknessGraphics = new PIXI.Graphics();\n      const glowGraphics = new PIXI.Graphics();\n      const lightEraseGraphics = new PIXI.Graphics();\n      (lightEraseGraphics as unknown as { blendMode: string }).blendMode = "erase";\n      lightingContainer.addChild(darknessGraphics as unknown as PixiContainer, glowGraphics as unknown as PixiContainer, lightEraseGraphics as unknown as PixiContainer);\n      app.stage.addChild(lightingContainer as unknown as PixiContainer);\n      layers.lighting.visible = false;',
  'upgrade existing screen lighting to erase mask',
);

replaceOnce(
  '      const lightingGraphics = new PIXI.Graphics();\n      const feedbackGraphics = new PIXI.Graphics();\n      layers.effects.addChild(feedbackGraphics as unknown as PixiContainer);\n      app.stage.addChild(lightingGraphics as unknown as PixiContainer);\n      layers.lighting.visible = false;',
  '      const lightingContainer = new PIXI.Container();\n      const darknessGraphics = new PIXI.Graphics();\n      const glowGraphics = new PIXI.Graphics();\n      const lightEraseGraphics = new PIXI.Graphics();\n      (lightEraseGraphics as unknown as { blendMode: string }).blendMode = "erase";\n      lightingContainer.addChild(darknessGraphics as unknown as PixiContainer, glowGraphics as unknown as PixiContainer, lightEraseGraphics as unknown as PixiContainer);\n      const feedbackGraphics = new PIXI.Graphics();\n      layers.effects.addChild(feedbackGraphics as unknown as PixiContainer);\n      app.stage.addChild(lightingContainer as unknown as PixiContainer);\n      layers.lighting.visible = false;',
  'upgrade existing screen lighting with feedback to erase mask',
);

replaceOnce(
  '        const lighting = lightingGraphics as unknown as PixiTransformNode;\n        lighting.position.set(0, 0);\n        lighting.scale.set(1);',
  '        const lighting = lightingContainer as unknown as PixiTransformNode;\n        lighting.position.set(0, 0);\n        lighting.scale.set(1);',
  'lighting transform container',
);

replaceOnce(
  '        drawPixiNightLighting(lightingGraphics, host.clientWidth, host.clientHeight, camera.x, camera.y, drawablePlayers);',
  '        drawPixiNightLighting(darknessGraphics, glowGraphics, lightEraseGraphics, host.clientWidth, host.clientHeight, camera.x, camera.y, drawablePlayers);',
  'lighting draw call erase mask',
);

replaceOnce(
  '        lightingGraphics.destroy?.();',
  '        lightingContainer.destroy?.({ children: true });',
  'lighting cleanup container',
);

if (!css.includes('/* pixi night ownership */')) {
  css = `${css.trimEnd()}\n\n/* pixi night ownership */\n.game-shell--pixi-stage.game-shell--night .night-field-overlay,\n.game-shell--pixi-stage.game-shell--night .night-player-light {\n  display: none !important;\n}\n\n.game-shell--pixi-stage.game-shell--night .pixi-game-canvas {\n  filter: saturate(0.92) contrast(1.04);\n}\n`;
  cssChanged = true;
  console.log('[patch-pixi-night-mask] appended css pixi night ownership');
}

if (changed) fs.writeFileSync(pixiPath, source);
if (cssChanged) fs.writeFileSync(cssPath, css);
if (!changed && !cssChanged) console.log('[patch-pixi-night-mask] no changes');
