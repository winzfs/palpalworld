const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'src', 'features', 'game', 'pixi', 'PixiGameCanvas.tsx');
let source = fs.readFileSync(target, 'utf8');
let changed = false;

function replaceOnce(search, replacement, label) {
  if (source.includes(replacement)) return;
  if (!source.includes(search)) {
    console.log(`[patch-pixi-night-light-cache] skipped ${label}`);
    return;
  }
  source = source.replace(search, replacement);
  changed = true;
  console.log(`[patch-pixi-night-light-cache] patched ${label}`);
}

replaceOnce(
  'type BuildPartsState = { parts: PlacedBuildPart[]; selectedPartId?: string | null; selectedHouseId?: string | null; preview?: BuildPartPreviewState | null };',
  'type BuildPartsState = { parts: PlacedBuildPart[]; selectedPartId?: string | null; selectedHouseId?: string | null; preview?: BuildPartPreviewState | null };\ntype NightLightCache = { signature: string; lastUpdatedAt: number };',
  'night cache type',
);

const oldDrawNight = 'function drawNight(g: G, w: number, h: number, cx: number, cy: number, players: Array<{ player: PlayerPublicState; isLocal: boolean }>) { g.clear(); if (typeof document === "undefined" || !document.querySelector(".game-shell--night")) return; g.rect(0, 0, w, h).fill({ color: 0x01030a, alpha: 0.54 }); for (const e of players) { const r = hasTorch(e.player) ? 172 : e.isLocal ? 54 : 0; if (!r) continue; const x = e.player.position.x - cx, y = e.player.position.y - cy; g.circle(x, y, r).fill({ color: hasTorch(e.player) ? 0xfacc15 : 0x93c5fd, alpha: hasTorch(e.player) ? 0.13 : 0.055 }); g.circle(x, y, r * 0.62).fill({ color: hasTorch(e.player) ? 0xffedd5 : 0xbfdbfe, alpha: hasTorch(e.player) ? 0.095 : 0.04 }); } }';
const newDrawNight = 'function nightSignature(w: number, h: number, cx: number, cy: number, players: Array<{ player: PlayerPublicState; isLocal: boolean }>) { const active = typeof document !== "undefined" && Boolean(document.querySelector(".game-shell--night")); if (!active) return "day"; const lightSig = players.map((e) => `${e.player.id}:${Math.round((e.player.position.x - cx) / 8)}:${Math.round((e.player.position.y - cy) / 8)}:${hasTorch(e.player) ? 1 : 0}:${e.isLocal ? 1 : 0}`).join("|"); return `night:${Math.round(w / 16)}:${Math.round(h / 16)}:${Math.round(cx / 8)}:${Math.round(cy / 8)}:${lightSig}`; }\nfunction drawNight(g: G, cache: NightLightCache, w: number, h: number, cx: number, cy: number, players: Array<{ player: PlayerPublicState; isLocal: boolean }>) { const sig = nightSignature(w, h, cx, cy, players); const now = Date.now(); if (sig === cache.signature && now - cache.lastUpdatedAt < 84) return; cache.signature = sig; cache.lastUpdatedAt = now; g.clear(); if (sig === "day") return; g.rect(0, 0, w, h).fill({ color: 0x01030a, alpha: 0.54 }); for (const e of players) { const torch = hasTorch(e.player); const r = torch ? 172 : e.isLocal ? 54 : 0; if (!r) continue; const x = e.player.position.x - cx, y = e.player.position.y - cy; g.circle(x, y, r).fill({ color: torch ? 0xfacc15 : 0x93c5fd, alpha: torch ? 0.13 : 0.055 }); g.circle(x, y, r * 0.62).fill({ color: torch ? 0xffedd5 : 0xbfdbfe, alpha: torch ? 0.095 : 0.04 }); } }';
replaceOnce(oldDrawNight, newDrawNight, 'drawNight cache implementation');

replaceOnce(
  'const lightingGraphics = new PIXI.Graphics(); const debugText = new PIXI.Text({ text: "", style: { fill: 0xffffff, fontSize: 12, fontFamily: "monospace", stroke: { color: 0x000000, width: 3 } } });',
  'const lightingGraphics = new PIXI.Graphics(); const nightLightCache: NightLightCache = { signature: "", lastUpdatedAt: 0 }; const debugText = new PIXI.Text({ text: "", style: { fill: 0xffffff, fontSize: 12, fontFamily: "monospace", stroke: { color: 0x000000, width: 3 } } });',
  'night cache instance',
);

replaceOnce(
  'drawNight(lightingGraphics, host.clientWidth || 1, host.clientHeight || 1, camera.x, camera.y, players);',
  'drawNight(lightingGraphics, nightLightCache, host.clientWidth || 1, host.clientHeight || 1, camera.x, camera.y, players);',
  'drawNight call',
);

if (changed) fs.writeFileSync(target, source);
else console.log('[patch-pixi-night-light-cache] no changes');
