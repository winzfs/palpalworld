const fs = require("fs");
const path = require("path");

const target = path.join(__dirname, "..", "src", "features", "game", "GameScene.tsx");
let source = fs.readFileSync(target, "utf8");
let changed = false;

function replace(search, replacement, label) {
  if (source.includes(replacement)) {
    console.log(`[patch-game-perf-hud] already-patched ${label}`);
    return;
  }
  if (!source.includes(search)) {
    console.log(`[patch-game-perf-hud] skipped ${label}`);
    return;
  }
  source = source.replace(search, replacement);
  changed = true;
  console.log(`[patch-game-perf-hud] patched ${label}`);
}

replace(
  `  private onWorldClick: (target: WorldClickTarget) => void;`,
  `  private onWorldClick: (target: WorldClickTarget) => void;
  private perfHudEnabled = typeof window !== "undefined" && window.localStorage.getItem("palpalworld.demo.perfHud") === "1";
  private perfHudEl: HTMLDivElement | null = null;
  private perfToggleEl: HTMLButtonElement | null = null;
  private perfLastFrameAt = performance.now();
  private perfFrameMs = 0;
  private perfDrawMs = 0;
  private perfBuildBaseMs = 0;
  private perfBuildForegroundMs = 0;
  private perfBuildBaseCount = 0;
  private perfBuildForegroundCount = 0;`,
  "perf fields",
);

replace(
  `    this.root.appendChild(this.canvas);`,
  `    this.root.appendChild(this.canvas);
    this.installPerfHud();`,
  "install perf hud",
);

replace(
  `    this.canvas.remove();`,
  `    this.perfHudEl?.remove();
    this.perfToggleEl?.remove();
    this.canvas.remove();`,
  "destroy perf hud",
);

replace(
  `  private handleEquipmentChanged = (event: EquipmentChangedEvent) => { this.localEquippedWeaponItemId = event.detail?.weaponItemId ?? readStoredWeaponItemId(); };`,
  `  private installPerfHud() {
    this.perfHudEl = document.createElement("div");
    this.perfHudEl.style.cssText = "position:absolute;right:8px;top:42px;z-index:30;max-width:260px;padding:7px 9px;border-radius:8px;background:rgba(2,6,23,.78);color:#dbeafe;font:11px/1.35 monospace;white-space:pre;pointer-events:none;display:none";
    this.root.appendChild(this.perfHudEl);
    this.perfToggleEl = document.createElement("button");
    this.perfToggleEl.type = "button";
    this.perfToggleEl.textContent = "PERF";
    this.perfToggleEl.style.cssText = "position:absolute;right:8px;top:8px;z-index:31;padding:5px 8px;border-radius:999px;border:1px solid rgba(147,197,253,.55);background:rgba(15,23,42,.72);color:#bfdbfe;font:11px system-ui";
    this.perfToggleEl.addEventListener("click", () => this.togglePerfHud());
    this.root.appendChild(this.perfToggleEl);
    this.updatePerfHudVisibility();
  }

  private togglePerfHud() {
    this.perfHudEnabled = !this.perfHudEnabled;
    try { window.localStorage.setItem("palpalworld.demo.perfHud", this.perfHudEnabled ? "1" : "0"); } catch {}
    this.updatePerfHudVisibility();
  }

  private updatePerfHudVisibility() {
    if (this.perfHudEl) this.perfHudEl.style.display = this.perfHudEnabled ? "block" : "none";
    if (this.perfToggleEl) this.perfToggleEl.style.opacity = this.perfHudEnabled ? "1" : ".55";
  }

  private updatePerfHud() {
    if (!this.perfHudEnabled || !this.perfHudEl) return;
    const fps = this.perfFrameMs > 0 ? Math.round(1000 / this.perfFrameMs) : 0;
    const buildTotal = this.perfBuildBaseMs + this.perfBuildForegroundMs;
    this.perfHudEl.textContent = [
      `FPS ${fps}  frame ${this.perfFrameMs.toFixed(1)}ms`,
      `draw ${this.perfDrawMs.toFixed(1)}ms`,
      `build total ${buildTotal.toFixed(1)}ms`,
      `base ${this.perfBuildBaseMs.toFixed(1)}ms / ${this.perfBuildBaseCount}`,
      `front ${this.perfBuildForegroundMs.toFixed(1)}ms / ${this.perfBuildForegroundCount}`,
      `parts ${(this as any).placedBuildParts?.length ?? 0}`,
    ].join("\\n");
  }

  private handleEquipmentChanged = (event: EquipmentChangedEvent) => { this.localEquippedWeaponItemId = event.detail?.weaponItemId ?? readStoredWeaponItemId(); };`,
  "perf hud methods",
);

replace(
  `    if (event.key.toLowerCase() === "e") this.onInteract();`,
  `    if (event.key.toLowerCase() === "e") this.onInteract();
    if (event.key.toLowerCase() === "p") this.togglePerfHud();`,
  "perf keyboard toggle",
);

replace(
  `  private loop = () => {
    this.draw();
    this.animationFrame = requestAnimationFrame(this.loop);
  };`,
  `  private loop = () => {
    const now = performance.now();
    this.perfFrameMs = now - this.perfLastFrameAt;
    this.perfLastFrameAt = now;
    const drawStart = performance.now();
    this.draw();
    this.perfDrawMs = performance.now() - drawStart;
    this.updatePerfHud();
    this.animationFrame = requestAnimationFrame(this.loop);
  };`,
  "perf loop timing",
);

replace(
  `    this.drawBuildParts(ctx, camera.x, camera.y, viewport, isoCamera.x, isoCamera.y);`,
  `    const __perfBuildBaseStart = performance.now();
    this.drawBuildParts(ctx, camera.x, camera.y, viewport, isoCamera.x, isoCamera.y);
    this.perfBuildBaseMs = performance.now() - __perfBuildBaseStart;`,
  "base timing call",
);

replace(
  `    this.drawBuildPartsForeground(ctx, camera.x, camera.y, viewport, isoCamera.x, isoCamera.y);`,
  `    const __perfBuildFgStart = performance.now();
    this.drawBuildPartsForeground(ctx, camera.x, camera.y, viewport, isoCamera.x, isoCamera.y);
    this.perfBuildForegroundMs = performance.now() - __perfBuildFgStart;`,
  "foreground timing call",
);

replace(
  `    if (visibleParts.length <= 0) return;

    visibleParts.sort((a, b) => {`,
  `    this.perfBuildBaseCount = visibleParts.length;
    if (visibleParts.length <= 0) return;

    visibleParts.sort((a, b) => {`,
  "base count",
);

replace(
  `    if (visibleParts.length <= 0) return;

    visibleParts.sort((a, b) => {`,
  `    this.perfBuildForegroundCount = visibleParts.length;
    if (visibleParts.length <= 0) return;

    visibleParts.sort((a, b) => {`,
  "foreground count",
);

if (changed) fs.writeFileSync(target, source);
