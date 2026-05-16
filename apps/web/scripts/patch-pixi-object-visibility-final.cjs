const fs = require('fs');
const path = require('path');

const pixiPath = path.join(__dirname, '..', 'src', 'features', 'game', 'pixi', 'PixiGameCanvas.tsx');
let source = fs.readFileSync(pixiPath, 'utf8');
let changed = false;

function replaceOnce(search, replacement, label) {
  if (!source.includes(search)) {
    console.log(`[patch-pixi-object-visibility-final] skipped ${label}`);
    return;
  }
  source = source.replace(search, replacement);
  changed = true;
  console.log(`[patch-pixi-object-visibility-final] patched ${label}`);
}

function replaceRegex(regex, replacement, label) {
  if (!regex.test(source)) {
    console.log(`[patch-pixi-object-visibility-final] skipped ${label}`);
    return;
  }
  source = source.replace(regex, replacement);
  changed = true;
  console.log(`[patch-pixi-object-visibility-final] patched ${label}`);
}

// Keep terrain math synchronous.
source = source.replace(/async function hashTerrainTile/g, 'function hashTerrainTile');

// Remove the unstable nightMask references in the ticker. A separate Pixi Graphics
// night overlay is enough while renderer migration is being stabilized.
replaceRegex(
  /\n\s*const lighting = nightMaskSprite as unknown as PixiTransformNode;\n\s*lighting\.position\.set\(0, 0\);\n\s*lighting\.scale\.set\(1\);\n\s*nightMaskSprite\.width = host\.clientWidth;\n\s*nightMaskSprite\.height = host\.clientHeight;/g,
  '\n        const lighting = lightingGraphics as unknown as PixiTransformNode;\n        lighting.position.set(0, 0);\n        lighting.scale.set(1);',
  'replace nightMaskSprite transform',
);
replaceRegex(
  /drawPixiNightLighting\(nightMaskCanvas, nightMaskContext, nightMaskTexture, host\.clientWidth, host\.clientHeight, camera\.x, camera\.y, drawablePlayers\);/g,
  'drawPixiNightLighting(lightingGraphics, host.clientWidth, host.clientHeight, camera.x, camera.y, drawablePlayers);',
  'replace nightMask draw call',
);

// If drawPixiNightLighting still has the old Canvas signature, replace only that function.
const nightStart = source.indexOf('function carvePixiNightLight(');
const nightEnd = source.indexOf('\nfunction isSamePlayerTile', nightStart);
if (nightStart >= 0 && nightEnd > nightStart) {
  const safeNight = `function drawPixiNightLighting(graphics: PixiGraphics, width: number, height: number, cameraX: number, cameraY: number, drawablePlayers: DrawablePlayer[]) {
  graphics.clear();
  if (!isNightModeActive()) return;
  graphics.rect(0, 0, width, height);
  graphics.fill({ color: 0x01030a, alpha: 0.54 });
  for (const entry of drawablePlayers) {
    const screenX = entry.player.position.x - cameraX;
    const screenY = entry.player.position.y - cameraY + 2;
    const torch = hasTorchEquipped(entry.player);
    const outerRadius = torch ? 172 : entry.isLocal ? 54 : 0;
    if (outerRadius <= 0) continue;
    const flicker = torch ? 0.94 + Math.sin(Date.now() / 95 + screenX * 0.013) * 0.06 : 1;
    graphics.circle(screenX, screenY, outerRadius * flicker);
    graphics.fill({ color: torch ? 0xfacc15 : 0x93c5fd, alpha: torch ? 0.13 : 0.055 });
    graphics.circle(screenX, screenY, outerRadius * 0.62 * flicker);
    graphics.fill({ color: torch ? 0xffedd5 : 0xbfdbfe, alpha: torch ? 0.095 : 0.04 });
  }
}
`;
  source = source.slice(0, nightStart) + safeNight + source.slice(nightEnd);
  changed = true;
  console.log('[patch-pixi-object-visibility-final] replaced old canvas night helpers');
}

// Add a direct fallback drawable player from the latest snapshot event. This prevents
// a terrain-only frame from staying terrain-only if React state delivery is delayed.
if (!source.includes('const latestPixiSnapshotRef = useRef<WorldSnapshot | null>(snapshot);')) {
  replaceOnce(
    '  const snapshotRef = useRef<WorldSnapshot | null>(snapshot);',
    '  const snapshotRef = useRef<WorldSnapshot | null>(snapshot);\n  const latestPixiSnapshotRef = useRef<WorldSnapshot | null>(snapshot);',
    'latest snapshot ref',
  );
}

replaceOnce(
  '  useEffect(() => { snapshotRef.current = snapshot; }, [snapshot]);',
  '  useEffect(() => { snapshotRef.current = snapshot; latestPixiSnapshotRef.current = snapshot; }, [snapshot]);',
  'sync latest snapshot ref from prop',
);

if (!source.includes('palpalworld:pixi-snapshot-final')) {
  replaceOnce(
    '    window.addEventListener("palpalworld:pixi-build-parts", handlePixiBuildParts);',
    '    const handlePixiSnapshotFinal = (event: Event) => {\n      const customEvent = event as CustomEvent<WorldSnapshot>;\n      if (customEvent.detail) {\n        snapshotRef.current = customEvent.detail;\n        latestPixiSnapshotRef.current = customEvent.detail;\n      }\n    };\n    window.addEventListener("palpalworld:pixi-snapshot", handlePixiSnapshotFinal);\n    window.addEventListener("palpalworld:pixi-snapshot-final", handlePixiSnapshotFinal);\n    window.addEventListener("palpalworld:pixi-build-parts", handlePixiBuildParts);',
    'final snapshot listeners add',
  );
  replaceOnce(
    '    return () => window.removeEventListener("palpalworld:pixi-build-parts", handlePixiBuildParts);',
    '    return () => {\n      window.removeEventListener("palpalworld:pixi-snapshot", handlePixiSnapshotFinal);\n      window.removeEventListener("palpalworld:pixi-snapshot-final", handlePixiSnapshotFinal);\n      window.removeEventListener("palpalworld:pixi-build-parts", handlePixiBuildParts);\n    };',
    'final snapshot listeners remove',
  );
}

replaceOnce(
  '        const currentSnapshot = snapshotRef.current;',
  '        const currentSnapshot = snapshotRef.current ?? latestPixiSnapshotRef.current;',
  'snapshot fallback in ticker',
);

// Debug marker: always draw a bright cross at local player position if a local player exists.
// If this appears but character does not, character draw failed; if not, snapshot is still empty.
if (!source.includes('drawPixiDebugLocalMarker')) {
  const markerFunction = `
function drawPixiDebugLocalMarker(graphics: PixiGraphics) {
  graphics.moveTo(-18, 0);
  graphics.lineTo(18, 0);
  graphics.moveTo(0, -18);
  graphics.lineTo(0, 18);
  graphics.stroke({ width: 4, color: 0xffff00, alpha: 0.95 });
  graphics.circle(0, 0, 7);
  graphics.fill({ color: 0xff00ff, alpha: 0.9 });
}
`;
  const anchor = 'function drawPixiCharacterAtOrigin(graphics: PixiGraphics, player: PlayerPublicState, isLocal: boolean) {';
  if (source.includes(anchor)) {
    source = source.replace(anchor, markerFunction + anchor);
    changed = true;
    console.log('[patch-pixi-object-visibility-final] inserted debug marker helper');
  }
}

if (!source.includes('drawPixiDebugLocalMarker(node.graphics);')) {
  replaceOnce(
    '          drawPixiCharacterAtOrigin(node.graphics, entry.player, entry.isLocal);',
    '          drawPixiCharacterAtOrigin(node.graphics, entry.player, entry.isLocal);\n          if (entry.isLocal) drawPixiDebugLocalMarker(node.graphics);',
    'draw local debug marker',
  );
}

if (source.includes('nightMaskSprite') || source.includes('nightMaskCanvas') || source.includes('nightMaskContext') || source.includes('nightMaskTexture')) {
  throw new Error('[patch-pixi-object-visibility-final] unresolved nightMask references remain');
}

if (changed) fs.writeFileSync(pixiPath, source);
else console.log('[patch-pixi-object-visibility-final] no changes');
