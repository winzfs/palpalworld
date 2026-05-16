const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'features', 'game', 'pixi', 'PixiGameCanvas.tsx');
let source = fs.readFileSync(filePath, 'utf8');
let changed = false;

function replaceAll(search, replacement, label) {
  if (!source.includes(search)) {
    console.log(`[patch-pixi-visibility-recovery] skipped ${label}`);
    return;
  }
  source = source.split(search).join(replacement);
  changed = true;
  console.log(`[patch-pixi-visibility-recovery] patched ${label}`);
}

function replaceOnce(search, replacement, label) {
  if (!source.includes(search)) {
    console.log(`[patch-pixi-visibility-recovery] skipped ${label}`);
    return;
  }
  source = source.replace(search, replacement);
  changed = true;
  console.log(`[patch-pixi-visibility-recovery] patched ${label}`);
}

replaceAll('async function hashTerrainTile', 'function hashTerrainTile', 'hashTerrainTile sync');

const nightStart = source.indexOf('function carvePixiNightLight(');
const nightEnd = source.indexOf('\nfunction isSamePlayerTile', nightStart);
if (nightStart >= 0 && nightEnd > nightStart) {
  const safeNight = `function drawPixiNightLighting(graphics: PixiGraphics, width: number, height: number, cameraX: number, cameraY: number, drawablePlayers: DrawablePlayer[]) {
  graphics.clear();
  if (!isNightModeActive()) return;

  // Visibility recovery: keep night rendering non-destructive until the Pixi-only mask is rebuilt safely.
  graphics.rect(0, 0, width, height);
  graphics.fill({ color: 0x01030a, alpha: 0.56 });

  for (const entry of drawablePlayers) {
    const screenX = entry.player.position.x - cameraX;
    const screenY = entry.player.position.y - cameraY + 2;
    const torch = hasTorchEquipped(entry.player);
    const outerRadius = torch ? 166 : entry.isLocal ? 52 : 0;
    const midRadius = torch ? 104 : entry.isLocal ? 32 : 0;
    const coreRadius = torch ? 42 : entry.isLocal ? 16 : 0;
    if (outerRadius <= 0) continue;
    const flicker = torch ? 0.94 + Math.sin(Date.now() / 95 + screenX * 0.013) * 0.06 : 1;

    graphics.circle(screenX, screenY, outerRadius * flicker);
    graphics.fill({ color: torch ? 0xfacc15 : 0x93c5fd, alpha: torch ? 0.13 : 0.055 });
    graphics.circle(screenX, screenY, midRadius * flicker);
    graphics.fill({ color: torch ? 0xffedd5 : 0xbfdbfe, alpha: torch ? 0.095 : 0.04 });
    graphics.circle(screenX, screenY, coreRadius * flicker);
    graphics.fill({ color: 0xffffff, alpha: torch ? 0.055 : 0.025 });
  }
}
`;
  source = source.slice(0, nightStart) + safeNight + source.slice(nightEnd);
  changed = true;
  console.log('[patch-pixi-visibility-recovery] patched safe night function');
} else {
  console.log('[patch-pixi-visibility-recovery] skipped safe night function');
}

replaceOnce(
  `        const lighting = nightMaskSprite as unknown as PixiTransformNode;
        lighting.position.set(0, 0);
        lighting.scale.set(1);
        nightMaskSprite.width = host.clientWidth;
        nightMaskSprite.height = host.clientHeight;`,
  `        const lighting = lightingGraphics as unknown as PixiTransformNode;
        lighting.position.set(0, 0);
        lighting.scale.set(1);`,
  'nightMaskSprite transform -> lightingGraphics',
);

replaceOnce(
  '        drawPixiNightLighting(nightMaskCanvas, nightMaskContext, nightMaskTexture, host.clientWidth, host.clientHeight, camera.x, camera.y, drawablePlayers);',
  '        drawPixiNightLighting(lightingGraphics, host.clientWidth, host.clientHeight, camera.x, camera.y, drawablePlayers);',
  'night draw call -> lightingGraphics',
);

if (source.includes('nightMaskSprite') || source.includes('nightMaskCanvas') || source.includes('nightMaskContext') || source.includes('nightMaskTexture')) {
  console.log('[patch-pixi-visibility-recovery] warning: nightMask references remain');
}

if (changed) fs.writeFileSync(filePath, source);
else console.log('[patch-pixi-visibility-recovery] no changes');
