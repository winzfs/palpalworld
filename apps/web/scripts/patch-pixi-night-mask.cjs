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

replaceFunction('drawPixiNightLighting', 'isSamePlayerTile', `function drawPixiNightLighting(graphics: PixiGraphics, width: number, height: number, cameraX: number, cameraY: number, drawablePlayers: DrawablePlayer[]) {
  graphics.clear();
  if (!isNightModeActive()) return;

  // Safe fallback: do not use ERASE blend mode on the main stage because it can erase players/objects.
  graphics.rect(0, 0, width, height);
  graphics.fill({ color: 0x01030a, alpha: 0.62 });

  for (const entry of drawablePlayers) {
    const screenX = entry.player.position.x - cameraX;
    const screenY = entry.player.position.y - cameraY + 2;
    const torch = hasTorchEquipped(entry.player);
    const outerRadius = torch ? 172 : entry.isLocal ? 56 : 0;
    const midRadius = torch ? 112 : entry.isLocal ? 36 : 0;
    const coreRadius = torch ? 50 : entry.isLocal ? 18 : 0;
    if (outerRadius <= 0) continue;
    const flicker = torch ? 0.92 + Math.sin(Date.now() / 95 + screenX * 0.013) * 0.08 : 1;

    graphics.circle(screenX, screenY, outerRadius * flicker);
    graphics.fill({ color: torch ? 0xfacc15 : 0x93c5fd, alpha: torch ? 0.14 : 0.065 });
    graphics.circle(screenX, screenY, midRadius * flicker);
    graphics.fill({ color: torch ? 0xffedd5 : 0xbfdbfe, alpha: torch ? 0.12 : 0.055 });
    graphics.circle(screenX, screenY, coreRadius * flicker);
    graphics.fill({ color: 0xffffff, alpha: torch ? 0.07 : 0.035 });
  }
}`);

replaceOnce(
  '      const lightingContainer = new PIXI.Container();\n      const darknessGraphics = new PIXI.Graphics();\n      const glowGraphics = new PIXI.Graphics();\n      const lightEraseGraphics = new PIXI.Graphics();\n      (lightEraseGraphics as unknown as { blendMode: string }).blendMode = "erase";\n      lightingContainer.addChild(darknessGraphics as unknown as PixiContainer, glowGraphics as unknown as PixiContainer, lightEraseGraphics as unknown as PixiContainer);\n      app.stage.addChild(lightingContainer as unknown as PixiContainer);\n      layers.lighting.visible = false;',
  '      const lightingGraphics = new PIXI.Graphics();\n      app.stage.addChild(lightingGraphics as unknown as PixiContainer);\n      layers.lighting.visible = false;',
  'downgrade erase lighting to safe graphics',
);

replaceOnce(
  '      const lightingContainer = new PIXI.Container();\n      const darknessGraphics = new PIXI.Graphics();\n      const glowGraphics = new PIXI.Graphics();\n      const lightEraseGraphics = new PIXI.Graphics();\n      (lightEraseGraphics as unknown as { blendMode: string }).blendMode = "erase";\n      lightingContainer.addChild(darknessGraphics as unknown as PixiContainer, glowGraphics as unknown as PixiContainer, lightEraseGraphics as unknown as PixiContainer);\n      const feedbackGraphics = new PIXI.Graphics();\n      layers.effects.addChild(feedbackGraphics as unknown as PixiContainer);\n      app.stage.addChild(lightingContainer as unknown as PixiContainer);\n      layers.lighting.visible = false;',
  '      const lightingGraphics = new PIXI.Graphics();\n      const feedbackGraphics = new PIXI.Graphics();\n      layers.effects.addChild(feedbackGraphics as unknown as PixiContainer);\n      app.stage.addChild(lightingGraphics as unknown as PixiContainer);\n      layers.lighting.visible = false;',
  'downgrade erase lighting with feedback to safe graphics',
);

replaceOnce(
  '        const lighting = lightingContainer as unknown as PixiTransformNode;\n        lighting.position.set(0, 0);\n        lighting.scale.set(1);',
  '        const lighting = lightingGraphics as unknown as PixiTransformNode;\n        lighting.position.set(0, 0);\n        lighting.scale.set(1);',
  'lighting transform safe graphics',
);

replaceOnce(
  '        drawPixiNightLighting(darknessGraphics, glowGraphics, lightEraseGraphics, host.clientWidth, host.clientHeight, camera.x, camera.y, drawablePlayers);',
  '        drawPixiNightLighting(lightingGraphics, host.clientWidth, host.clientHeight, camera.x, camera.y, drawablePlayers);',
  'lighting draw call safe graphics',
);

replaceOnce(
  '        lightingContainer.destroy?.({ children: true });',
  '        lightingGraphics.destroy?.();',
  'lighting cleanup safe graphics',
);

if (!css.includes('/* pixi night ownership */')) {
  css = `${css.trimEnd()}\n\n/* pixi night ownership */\n.game-shell--pixi-stage.game-shell--night .night-field-overlay,\n.game-shell--pixi-stage.game-shell--night .night-player-light {\n  display: none !important;\n}\n\n.game-shell--pixi-stage.game-shell--night .pixi-game-canvas {\n  filter: saturate(0.92) contrast(1.04);\n}\n`;
  cssChanged = true;
  console.log('[patch-pixi-night-mask] appended css pixi night ownership');
}

if (changed) fs.writeFileSync(pixiPath, source);
if (cssChanged) fs.writeFileSync(cssPath, css);
if (!changed && !cssChanged) console.log('[patch-pixi-night-mask] no changes');
