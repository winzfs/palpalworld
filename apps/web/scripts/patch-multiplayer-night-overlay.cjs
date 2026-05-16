const fs = require("fs");
const path = require("path");

const overlayPath = path.join(__dirname, "..", "src", "features", "multiplayer", "MultiplayerOverlay.tsx");
const cssPath = path.join(__dirname, "..", "src", "features", "multiplayer", "multiplayer-overlay.css");

let overlay = fs.readFileSync(overlayPath, "utf8");
let css = fs.readFileSync(cssPath, "utf8");
let overlayChanged = false;
let cssChanged = false;

function appendAfter(anchor, insertion, label) {
  if (overlay.includes(insertion)) return;
  if (!overlay.includes(anchor)) {
    console.log(`[patch-multiplayer-night-overlay] skipped ${label}`);
    return;
  }
  overlay = overlay.replace(anchor, `${anchor}\n${insertion}`);
  overlayChanged = true;
  console.log(`[patch-multiplayer-night-overlay] patched ${label}`);
}

function replaceOnce(search, replacement, label) {
  if (overlay.includes(replacement)) return;
  if (!overlay.includes(search)) {
    console.log(`[patch-multiplayer-night-overlay] skipped ${label}`);
    return;
  }
  overlay = overlay.replace(search, replacement);
  overlayChanged = true;
  console.log(`[patch-multiplayer-night-overlay] patched ${label}`);
}

function appendCss(marker, block) {
  if (css.includes(marker)) return;
  css = `${css.trimEnd()}\n\n${block}\n`;
  cssChanged = true;
  console.log(`[patch-multiplayer-night-overlay] appended css ${marker}`);
}

appendAfter(
  'const mountedPetStorageKey = "palpalworld.demo.mountedPetItemId";',
  'const equippedWeaponStorageKey = "palpalworld.demo.equippedWeaponItemId";',
  "equipped weapon storage key",
);

appendAfter(
  'function readMountedPetItemId() { if (typeof window === "undefined") return null; return window.localStorage.getItem(mountedPetStorageKey); }',
  'function readEquippedWeaponItemId() { if (typeof window === "undefined") return null; return window.localStorage.getItem(equippedWeaponStorageKey); }\nfunction isRemoteTorchEquipped(player: PlayerPublicState) { return (player as PlayerPublicState & { equippedWeaponItemId?: string | null }).equippedWeaponItemId === "torch"; }\nfunction readNightModeActive() { if (typeof document === "undefined") return false; return Boolean(document.querySelector(".game-shell--night")); }',
  "compact night/equipped helpers",
);

replaceOnce(
  '  const [pixiStageEnabled, setPixiStageEnabled] = useState(readPixiStageEnabled);',
  '  const [pixiStageEnabled, setPixiStageEnabled] = useState(readPixiStageEnabled);\n  const [nightModeActive, setNightModeActive] = useState(false);',
  "night mode state",
);

replaceOnce(
  'await upsertLocalPresence(client, { playerId, nickname: localPlayer.nickname, position: localPlayer.position, direction: localPlayer.direction, currentTile: localPlayer.currentTile as MapTileRef, mountedPetItemId: readMountedPetItemId() });',
  'await upsertLocalPresence(client, { playerId, nickname: localPlayer.nickname, position: localPlayer.position, direction: localPlayer.direction, currentTile: localPlayer.currentTile as MapTileRef, mountedPetItemId: readMountedPetItemId(), equippedWeaponItemId: readEquippedWeaponItemId() });',
  "publish equipped weapon presence compact",
);

replaceOnce(
  '  useEffect(() => { const sync = () => setPixiStageEnabled(readPixiStageEnabled()); sync(); const interval = window.setInterval(sync, 700); return () => window.clearInterval(interval); }, []);',
  '  useEffect(() => { const sync = () => setPixiStageEnabled(readPixiStageEnabled()); sync(); const interval = window.setInterval(sync, 700); return () => window.clearInterval(interval); }, []);\n  useEffect(() => { const syncNightMode = () => setNightModeActive(readNightModeActive()); syncNightMode(); const interval = window.setInterval(syncNightMode, 250); return () => window.clearInterval(interval); }, []);',
  "night mode polling compact",
);

replaceOnce(
  '<div className={pixiStageEnabled ? "multiplayer-overlay multiplayer-overlay--pixi-players" : "multiplayer-overlay"} aria-label="멀티플레이어 오버레이">',
  '<div className={`${pixiStageEnabled ? "multiplayer-overlay multiplayer-overlay--pixi-players" : "multiplayer-overlay"} ${nightModeActive ? "multiplayer-overlay--night" : ""}`} aria-label="멀티플레이어 오버레이">',
  "night overlay class compact",
);

replaceOnce(
  'const mountedPet = getMountedPetInfo(player);\n        const left = player.position.x - camera.cameraX;',
  'const mountedPet = getMountedPetInfo(player);\n        const hasTorch = isRemoteTorchEquipped(player);\n        const left = player.position.x - camera.cameraX;',
  "remote torch flag compact",
);

replaceOnce(
  'className={`multiplayer-player ${mountedPet ? "multiplayer-player--mounted" : ""} ${mountedPet?.flying ? "multiplayer-player--flying-mounted" : ""}`}',
  'className={`multiplayer-player ${mountedPet ? "multiplayer-player--mounted" : ""} ${mountedPet?.flying ? "multiplayer-player--flying-mounted" : ""} ${hasTorch ? "multiplayer-player--torch" : ""}`}',
  "remote torch class compact",
);

replaceOnce(
  '{mountedPet ? (',
  '{hasTorch ? <span className="multiplayer-player__torch-light" aria-hidden="true" /> : null}\n            {mountedPet ? (',
  "remote torch light element compact",
);

appendCss("multiplayer night visibility fix", `/* multiplayer night visibility fix */
.multiplayer-overlay--night .multiplayer-player {
  filter: brightness(0.28) saturate(0.72) drop-shadow(0 8px 10px rgb(0 0 0 / 0.72));
  opacity: 0.52;
}

.multiplayer-overlay--night .multiplayer-player--torch {
  filter: brightness(0.92) saturate(1.06) drop-shadow(0 8px 10px rgb(0 0 0 / 0.48));
  opacity: 0.96;
}

.multiplayer-player__torch-light {
  pointer-events: none;
  position: absolute;
  left: 50%;
  top: 52%;
  z-index: -1;
  width: 260px;
  height: 260px;
  border-radius: 999px;
  transform: translate(-50%, -50%);
  background: radial-gradient(circle, rgb(255 224 145 / 0.32) 0%, rgb(255 174 68 / 0.12) 42%, rgb(255 174 68 / 0) 72%);
  opacity: 0;
}

.multiplayer-overlay--night .multiplayer-player--torch .multiplayer-player__torch-light {
  opacity: 1;
}

.multiplayer-overlay--night .multiplayer-player--torch::after {
  content: "";
  position: absolute;
  right: 9px;
  top: 31px;
  width: 9px;
  height: 20px;
  border-radius: 999px;
  background: #7c2d12;
  box-shadow: 0 -10px 10px rgb(251 146 60 / 0.8), 0 -16px 16px rgb(250 204 21 / 0.45);
  transform: rotate(-24deg);
}

.multiplayer-overlay--night .world-chat-bubble,
.multiplayer-overlay--night .world-chat-panel,
.multiplayer-overlay--night .multiplayer-status {
  filter: none;
  opacity: 1;
}`);

if (overlayChanged) fs.writeFileSync(overlayPath, overlay);
if (cssChanged) fs.writeFileSync(cssPath, css);
if (!overlayChanged && !cssChanged) console.log("[patch-multiplayer-night-overlay] no changes");
