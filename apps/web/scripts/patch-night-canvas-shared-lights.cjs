const fs = require("fs");
const path = require("path");

const scenePath = path.join(__dirname, "..", "src", "features", "game", "GameScene.tsx");
const cssPath = path.join(__dirname, "..", "src", "app", "hud-menu.css");

let scene = fs.readFileSync(scenePath, "utf8");
let css = fs.readFileSync(cssPath, "utf8");
let sceneChanged = false;
let cssChanged = false;

function patchString(source, search, replacement, label) {
  if (source.includes(replacement)) return { text: source, changed: false };
  if (!source.includes(search)) {
    console.log(`[patch-night-canvas-shared-lights] skipped ${label}`);
    return { text: source, changed: false };
  }
  console.log(`[patch-night-canvas-shared-lights] patched ${label}`);
  return { text: source.replace(search, replacement), changed: true };
}

function patchRegex(source, regex, replacement, label) {
  regex.lastIndex = 0;
  if (!regex.test(source)) {
    console.log(`[patch-night-canvas-shared-lights] skipped ${label}`);
    return { text: source, changed: false };
  }
  regex.lastIndex = 0;
  const next = source.replace(regex, replacement);
  if (next === source) return { text: source, changed: false };
  console.log(`[patch-night-canvas-shared-lights] patched ${label}`);
  return { text: next, changed: true };
}

function applyScene(search, replacement, label) {
  const result = patchString(scene, search, replacement, label);
  scene = result.text;
  sceneChanged ||= result.changed;
}

function applyCssRegex(regex, replacement, label) {
  const result = patchRegex(css, regex, replacement, label);
  css = result.text;
  cssChanged ||= result.changed;
}

const helperBlock = `const equippedWeaponStorageKey = "palpalworld.demo.equippedWeaponItemId";
function isNightCanvasMaskActive() { return typeof document !== "undefined" && Boolean(document.querySelector(".game-shell--night")); }
function getPlayerSharedWeaponItemId(player: { equippedWeaponItemId?: string | null }, isLocal: boolean, localWeaponItemId: string | null) {
  return isLocal ? localWeaponItemId : player.equippedWeaponItemId ?? null;
}`;

const methodBlock = `  private carveNightLight(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) {
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, "rgba(0,0,0,1)");
    gradient.addColorStop(0.5, "rgba(0,0,0,0.9)");
    gradient.addColorStop(0.74, "rgba(0,0,0,0.4)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawTorchGlow(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) {
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, "rgba(255,213,128,0.12)");
    gradient.addColorStop(0.42, "rgba(255,154,64,0.04)");
    gradient.addColorStop(1, "rgba(255,154,64,0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawNightCanvasMask(ctx: CanvasRenderingContext2D, width: number, height: number, cameraX: number, cameraY: number, viewport: ViewportBounds) {
    if (!this.snapshot || !isNightCanvasMaskActive()) return;
    const currentTile = this.getCurrentTile();
    const lights: { x: number; y: number; radius: number; torch: boolean }[] = [];
    for (const player of this.snapshot.players) {
      if (!isSameTile(getTileRef(player), currentTile) || !isPositionInViewport(player.position, viewport, 280)) continue;
      const isLocal = player.id === this.localPlayerId;
      const weaponItemId = getPlayerSharedWeaponItemId(player, isLocal, this.localEquippedWeaponItemId);
      const torch = weaponItemId === "torch";
      const radius = torch ? 230 : isLocal ? 52 : 0;
      if (radius <= 0) continue;
      lights.push({ x: player.position.x - cameraX, y: player.position.y - cameraY + 4, radius, torch });
    }

    ctx.save();
    ctx.fillStyle = "rgba(2, 4, 13, 0.9)";
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = "destination-out";
    for (const light of lights) this.carveNightLight(ctx, light.x, light.y, light.radius);
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    for (const light of lights) if (light.torch) this.drawTorchGlow(ctx, light.x, light.y, light.radius * 0.72);
    ctx.restore();
  }
`;

applyScene(
  `const equippedWeaponStorageKey = "palpalworld.demo.equippedWeaponItemId";`,
  helperBlock,
  "night canvas helpers",
);

applyScene(
  `    this.drawPlayers(ctx, camera.x, camera.y, now, viewport);
    this.drawInteractionHint(ctx, camera.x, camera.y);`,
  `    this.drawPlayers(ctx, camera.x, camera.y, now, viewport);
    this.drawNightCanvasMask(ctx, rect.width, rect.height, camera.x, camera.y, viewport);
    this.drawInteractionHint(ctx, camera.x, camera.y);`,
  "draw canvas night mask",
);

applyScene(
  `      const weaponItemId = isLocal ? this.localEquippedWeaponItemId : null;`,
  `      const weaponItemId = getPlayerSharedWeaponItemId(player, isLocal, this.localEquippedWeaponItemId);`,
  "remote player weapon rendering",
);

applyScene(
  `  private drawMapBoundaryAndPortals(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {`,
  `${methodBlock}
  private drawMapBoundaryAndPortals(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {`,
  "night canvas methods",
);

applyCssRegex(
  /\/\* temporary day night field lighting \*\/[\s\S]*$/,
  `/* temporary day night field lighting */
.game-hud { z-index: 20; isolation: isolate; }
.hud-day-night-toggle { pointer-events: auto; position: absolute; left: calc(104px + var(--safe-left)); top: calc(12px + var(--safe-top)); z-index: 17; min-height: 42px; padding: 8px 12px; border: 2px solid rgb(125 211 252 / 0.45); border-radius: 999px; background: rgb(8 47 73 / 0.58); color: #e0f2fe; font-size: 12px; font-weight: 950; box-shadow: 0 8px 22px rgb(0 0 0 / 0.28), inset 0 0 0 1px rgb(255 255 255 / 0.08); backdrop-filter: blur(8px); cursor: pointer; }
.hud-day-night-toggle--night { border-color: rgb(250 204 21 / 0.48); background: rgb(83 56 19 / 0.58); color: #fff7df; }
.hud-day-night-toggle:active { transform: translateY(1px) scale(0.98); }
.night-field-overlay { pointer-events: none; position: fixed; inset: 0; z-index: 8; background: radial-gradient(circle at 50% 52%, rgb(5 8 20 / 0) 0 42px, rgb(5 8 20 / 0.58) 76px, rgb(5 8 20 / 0.9) 122px, rgb(2 4 13 / 0.95) 100%), linear-gradient(rgb(4 8 22 / 0.42), rgb(2 4 13 / 0.54)); }
.palpalworld-torch-equipped .night-field-overlay { background: radial-gradient(circle at 50% 52%, rgb(5 8 20 / 0) 0 132px, rgb(5 8 20 / 0.3) 176px, rgb(5 8 20 / 0.86) 272px, rgb(2 4 13 / 0.95) 100%), linear-gradient(rgb(4 8 22 / 0.38), rgb(2 4 13 / 0.5)); }
.night-player-light { position: fixed; left: 50%; top: 52%; width: 86px; height: 86px; border-radius: 999px; transform: translate(-50%, -50%); background: radial-gradient(circle, rgb(255 217 128 / 0.035) 0%, rgb(255 170 64 / 0.012) 48%, rgb(255 170 64 / 0) 74%); opacity: 0.28; filter: none; mix-blend-mode: screen; }
.palpalworld-torch-equipped .night-player-light { width: 250px; height: 250px; background: radial-gradient(circle, rgb(255 224 145 / 0.095) 0%, rgb(255 174 68 / 0.04) 48%, rgb(255 174 68 / 0) 76%); opacity: 0.46; }
@media (max-width: 720px) { .hud-day-night-toggle { left: calc(88px + var(--safe-left)); top: calc(8px + var(--safe-top)); min-height: 34px; padding: 5px 9px; border-width: 1px; font-size: 10px; } .night-field-overlay { background: radial-gradient(circle at 50% 52%, rgb(5 8 20 / 0) 0 34px, rgb(5 8 20 / 0.6) 64px, rgb(5 8 20 / 0.9) 104px, rgb(2 4 13 / 0.96) 100%), linear-gradient(rgb(4 8 22 / 0.42), rgb(2 4 13 / 0.54)); } .palpalworld-torch-equipped .night-field-overlay { background: radial-gradient(circle at 50% 52%, rgb(5 8 20 / 0) 0 106px, rgb(5 8 20 / 0.32) 146px, rgb(5 8 20 / 0.86) 222px, rgb(2 4 13 / 0.96) 100%), linear-gradient(rgb(4 8 22 / 0.38), rgb(2 4 13 / 0.5)); } .night-player-light { width: 68px; height: 68px; } .palpalworld-torch-equipped .night-player-light { width: 206px; height: 206px; } }
.game-canvas-root { z-index: 0; }
.hud-minimap, .hud-quick-button, .hud-menu-button, .hud-menu-panel, .quick-slot-bar, .inventory-overlay-panel, .station-overlay-panel, .pet-dismount-button { z-index: 12; }
.quick-slot-bar { z-index: 28; }
.inventory-overlay-panel, .station-overlay-panel { z-index: 22; }`,
  "restore dom night fallback mask",
);

if (sceneChanged) fs.writeFileSync(scenePath, scene);
if (cssChanged) fs.writeFileSync(cssPath, css);
