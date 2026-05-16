const fs = require('fs');
const path = require('path');

const pixiPath = path.join(__dirname, '..', 'src', 'features', 'game', 'pixi', 'PixiGameCanvas.tsx');
const cssPath = path.join(__dirname, '..', 'src', 'app', 'hud-menu.css');
let source = fs.readFileSync(pixiPath, 'utf8');
let css = fs.readFileSync(cssPath, 'utf8');
let changed = false;
let cssChanged = false;

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

  // Base darkness. Keep this on the Pixi layer so pointer/click handling stays on the original game canvas.
  graphics.rect(0, 0, width, height);
  graphics.fill({ color: 0x01030a, alpha: 0.72 });

  for (const entry of drawablePlayers) {
    const screenX = entry.player.position.x - cameraX;
    const screenY = entry.player.position.y - cameraY + 2;
    const torch = hasTorchEquipped(entry.player);
    const outerRadius = torch ? 168 : entry.isLocal ? 54 : 0;
    const midRadius = torch ? 118 : entry.isLocal ? 38 : 0;
    const innerRadius = torch ? 62 : entry.isLocal ? 20 : 0;
    if (outerRadius <= 0) continue;

    // Fake radial light: large low-alpha bloom + smaller bright core.
    // It does not erase the dark layer, but visually preserves darkness outside the radius.
    graphics.circle(screenX, screenY, outerRadius);
    graphics.fill({ color: torch ? 0xfacc15 : 0x93c5fd, alpha: torch ? 0.16 : 0.075 });
    graphics.circle(screenX, screenY, midRadius);
    graphics.fill({ color: torch ? 0xffedd5 : 0xbfdbfe, alpha: torch ? 0.15 : 0.07 });
    graphics.circle(screenX, screenY, innerRadius);
    graphics.fill({ color: torch ? 0xffffff : 0xdbeafe, alpha: torch ? 0.09 : 0.05 });

    if (torch) {
      const flicker = 0.75 + Math.sin(Date.now() / 95 + screenX * 0.01) * 0.18;
      graphics.circle(screenX, screenY - 8, 24);
      graphics.fill({ color: 0xfb923c, alpha: 0.12 * flicker });
    }
  }
}`);

if (!css.includes('/* pixi night ownership */')) {
  css = `${css.trimEnd()}\n\n/* pixi night ownership */\n.game-shell--pixi-stage.game-shell--night .night-field-overlay,\n.game-shell--pixi-stage.game-shell--night .night-player-light {\n  display: none !important;\n}\n\n.game-shell--pixi-stage.game-shell--night .pixi-game-canvas {\n  filter: saturate(0.92) contrast(1.04);\n}\n`;
  cssChanged = true;
  console.log('[patch-pixi-night-mask] appended css pixi night ownership');
}

if (changed) fs.writeFileSync(pixiPath, source);
if (cssChanged) fs.writeFileSync(cssPath, css);
if (!changed && !cssChanged) console.log('[patch-pixi-night-mask] no changes');
