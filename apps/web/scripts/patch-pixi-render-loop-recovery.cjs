const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'features', 'game', 'pixi', 'PixiGameCanvas.tsx');
let source = fs.readFileSync(filePath, 'utf8');
let changed = false;

function replaceAll(search, replacement, label) {
  if (!source.includes(search)) {
    console.log(`[patch-pixi-render-loop-recovery] skipped ${label}`);
    return;
  }
  source = source.split(search).join(replacement);
  changed = true;
  console.log(`[patch-pixi-render-loop-recovery] patched ${label}`);
}

function replaceRegex(regex, replacement, label) {
  if (!regex.test(source)) {
    console.log(`[patch-pixi-render-loop-recovery] skipped ${label}`);
    return;
  }
  source = source.replace(regex, replacement);
  changed = true;
  console.log(`[patch-pixi-render-loop-recovery] patched ${label}`);
}

replaceAll('async function hashTerrainTile', 'function hashTerrainTile', 'hashTerrainTile sync');

const safePixiNight = `function drawPixiNightLighting(graphics: PixiGraphics, width: number, height: number, cameraX: number, cameraY: number, drawablePlayers: DrawablePlayer[]) {
  graphics.clear();
  if (!isNightModeActive()) return;

  // Pixi-only safe lighting layer. Do not reference canvas/nightMask variables here.
  // This is non-destructive, so it cannot stop the Pixi render loop or erase world objects.
  graphics.rect(0, 0, width, height);
  graphics.fill({ color: 0x01030a, alpha: 0.54 });

  for (const entry of drawablePlayers) {
    const screenX = entry.player.position.x - cameraX;
    const screenY = entry.player.position.y - cameraY + 2;
    const torch = hasTorchEquipped(entry.player);
    const outerRadius = torch ? 172 : entry.isLocal ? 54 : 0;
    const midRadius = torch ? 108 : entry.isLocal ? 34 : 0;
    const coreRadius = torch ? 44 : entry.isLocal ? 16 : 0;
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

// Replace any older broken night implementation, whether it starts at carvePixiNightLight
// or directly at drawPixiNightLighting.
const carveStart = source.indexOf('function carvePixiNightLight(');
const samePlayerAfterCarve = source.indexOf('\nfunction isSamePlayerTile', carveStart);
if (carveStart >= 0 && samePlayerAfterCarve > carveStart) {
  source = source.slice(0, carveStart) + safePixiNight + source.slice(samePlayerAfterCarve);
  changed = true;
  console.log('[patch-pixi-render-loop-recovery] replaced carve-based night helpers');
} else {
  const drawStart = source.indexOf('function drawPixiNightLighting(');
  const samePlayerAfterDraw = source.indexOf('\nfunction isSamePlayerTile', drawStart);
  if (drawStart >= 0 && samePlayerAfterDraw > drawStart && source.slice(drawStart, samePlayerAfterDraw).includes('nightMask')) {
    source = source.slice(0, drawStart) + safePixiNight + source.slice(samePlayerAfterDraw);
    changed = true;
    console.log('[patch-pixi-render-loop-recovery] replaced broken drawPixiNightLighting');
  }
}

replaceRegex(
  /\n\s*const lighting = nightMaskSprite as unknown as PixiTransformNode;\n\s*lighting\.position\.set\(0, 0\);\n\s*lighting\.scale\.set\(1\);\n\s*nightMaskSprite\.width = host\.clientWidth;\n\s*nightMaskSprite\.height = host\.clientHeight;/g,
  '\n        const lighting = lightingGraphics as unknown as PixiTransformNode;\n        lighting.position.set(0, 0);\n        lighting.scale.set(1);',
  'nightMaskSprite transform regex',
);

replaceAll(
  '        drawPixiNightLighting(nightMaskCanvas, nightMaskContext, nightMaskTexture, host.clientWidth, host.clientHeight, camera.x, camera.y, drawablePlayers);',
  '        drawPixiNightLighting(lightingGraphics, host.clientWidth, host.clientHeight, camera.x, camera.y, drawablePlayers);',
  'nightMask draw call to lightingGraphics',
);

replaceRegex(
  /drawPixiNightLighting\(nightMaskCanvas, nightMaskContext, nightMaskTexture, ([^;]+)\);/g,
  'drawPixiNightLighting(lightingGraphics, $1);',
  'nightMask draw call regex',
);

if (source.includes('nightMaskSprite') || source.includes('nightMaskCanvas') || source.includes('nightMaskContext') || source.includes('nightMaskTexture')) {
  throw new Error('[patch-pixi-render-loop-recovery] unresolved nightMask references remain after recovery');
}

if (changed) fs.writeFileSync(filePath, source);
else console.log('[patch-pixi-render-loop-recovery] no changes');
