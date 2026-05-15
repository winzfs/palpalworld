const fs = require("fs");
const path = require("path");

const target = path.join(__dirname, "..", "src", "features", "game", "GameScene.tsx");
let source = fs.readFileSync(target, "utf8");
let changed = false;

function replace(search, replacement, label) {
  if (source.includes(replacement)) {
    console.log(`[patch-game-fullscreen-button] already-patched ${label}`);
    return;
  }
  if (!source.includes(search)) {
    console.log(`[patch-game-fullscreen-button] skipped ${label}`);
    return;
  }
  source = source.replace(search, replacement);
  changed = true;
  console.log(`[patch-game-fullscreen-button] patched ${label}`);
}

function replaceAll(search, replacement, label) {
  if (!source.includes(search)) {
    console.log(`[patch-game-fullscreen-button] skipped ${label}`);
    return;
  }
  source = source.split(search).join(replacement);
  changed = true;
  console.log(`[patch-game-fullscreen-button] patched ${label}`);
}

const fullscreenButtonStyle = "position:absolute;left:50%;top:10px;transform:translateX(-50%);z-index:82;width:92px;height:32px;min-width:92px;min-height:32px;display:flex;align-items:center;justify-content:center;padding:0;border-radius:999px;border:1px solid rgba(253,224,71,.82);background:rgba(15,23,42,.92);color:#fef9c3;font:800 12px/1 system-ui;letter-spacing:.2px;pointer-events:auto;box-sizing:border-box;box-shadow:0 4px 14px rgba(0,0,0,.28);touch-action:manipulation;user-select:none";

// Remove older PERF HUD insertions from generated GameScene, if the patch chain already added them.
source = source.replace(/\n  private perfHudEnabled =[^;]+;\n  private perfHudEl: HTMLDivElement \| null = null;\n  private perfToggleEl: HTMLButtonElement \| null = null;\n  private perfLastFrameAt = performance\.now\(\);\n  private perfFrameMs = 0;\n  private perfDrawMs = 0;\n  private perfBuildBaseMs = 0;\n  private perfBuildForegroundMs = 0;\n  private perfBuildBaseCount = 0;\n  private perfBuildForegroundCount = 0;/g, "");
source = source.replace(/\n  private installPerfHud\(\) \{[\s\S]*?\n  private handleEquipmentChanged =/g, "\n  private handleEquipmentChanged =");
source = source.replace(/\n\s*this\.perfHudEl\?\.remove\(\);\n\s*this\.perfToggleEl\?\.remove\(\);/g, "");
source = source.replace(/\n\s*if \(event\.key\.toLowerCase\(\) === "p"\) this\.togglePerfHud\(\);/g, "");
source = source.replace(/\n\s*const now = performance\.now\(\);\n\s*this\.perfFrameMs = now - this\.perfLastFrameAt;\n\s*this\.perfLastFrameAt = now;\n\s*const drawStart = performance\.now\(\);\n\s*this\.draw\(\);\n\s*this\.perfDrawMs = performance\.now\(\) - drawStart;\n\s*this\.updatePerfHud\(\);\n\s*this\.animationFrame = requestAnimationFrame\(this\.loop\);/g, "\n    this.draw();\n    this.animationFrame = requestAnimationFrame(this.loop);");
source = source.replace(/\n\s*const __perfBuildBaseStart = performance\.now\(\);\n\s*this\.drawBuildParts\(([^;]+)\);\n\s*this\.perfBuildBaseMs = performance\.now\(\) - __perfBuildBaseStart;/g, "\n    this.drawBuildParts($1);");
source = source.replace(/\n\s*const __perfBuildFgStart = performance\.now\(\);\n\s*this\.drawBuildPartsForeground\(([^;]+)\);\n\s*this\.perfBuildForegroundMs = performance\.now\(\) - __perfBuildFgStart;/g, "\n    this.drawBuildPartsForeground($1);");
source = source.replace(/\n\s*this\.perfBuildBaseCount = visibleParts\.length;/g, "");
source = source.replace(/\n\s*this\.perfBuildForegroundCount = visibleParts\.length;/g, "");

replace(
  `  private onWorldClick: (target: WorldClickTarget) => void;`,
  `  private onWorldClick: (target: WorldClickTarget) => void;
  private fullscreenButtonEl: HTMLButtonElement | null = null;`,
  "fullscreen field",
);

replace(
  `    this.root.appendChild(this.canvas);`,
  `    this.root.appendChild(this.canvas);
    this.installFullscreenButton();`,
  "install fullscreen button",
);

replace(
  `    this.canvas.remove();`,
  `    this.fullscreenButtonEl?.remove();
    this.canvas.remove();`,
  "destroy fullscreen button",
);

replace(
  `  private handleEquipmentChanged = (event: EquipmentChangedEvent) => { this.localEquippedWeaponItemId = event.detail?.weaponItemId ?? readStoredWeaponItemId(); };`,
  `  private installFullscreenButton() {
    this.fullscreenButtonEl = document.createElement("button");
    this.fullscreenButtonEl.type = "button";
    this.fullscreenButtonEl.textContent = document.fullscreenElement ? "창모드" : "전체화면";
    this.fullscreenButtonEl.style.cssText = "${fullscreenButtonStyle}";
    this.fullscreenButtonEl.addEventListener("click", () => this.toggleFullscreen());
    document.addEventListener("fullscreenchange", this.handleFullscreenChanged);
    this.root.appendChild(this.fullscreenButtonEl);
  }

  private handleFullscreenChanged = () => {
    if (this.fullscreenButtonEl) this.fullscreenButtonEl.textContent = document.fullscreenElement ? "창모드" : "전체화면";
    this.resize();
  };

  private async toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }
      const target = this.root;
      await target.requestFullscreen?.();
      try { await screen.orientation?.lock?.("landscape"); } catch {}
    } catch (error) {
      console.warn("[palpalworld] fullscreen request failed", error);
    } finally {
      this.handleFullscreenChanged();
    }
  }

  private handleEquipmentChanged = (event: EquipmentChangedEvent) => { this.localEquippedWeaponItemId = event.detail?.weaponItemId ?? readStoredWeaponItemId(); };`,
  "fullscreen methods",
);

// If older button styles remain in generated code, make them usable as fullscreen button style.
for (const oldButton of [
  "position:absolute;right:8px;top:8px;z-index:31;padding:5px 8px;border-radius:999px;border:1px solid rgba(147,197,253,.55);background:rgba(15,23,42,.72);color:#bfdbfe;font:11px system-ui",
  "position:absolute;left:8px;top:8px;z-index:61;padding:5px 8px;border-radius:999px;border:1px solid rgba(147,197,253,.55);background:rgba(15,23,42,.72);color:#bfdbfe;font:11px system-ui",
  "position:absolute;left:50%;top:8px;transform:translateX(-50%);z-index:61;padding:5px 8px;border-radius:999px;border:1px solid rgba(147,197,253,.55);background:rgba(15,23,42,.72);color:#bfdbfe;font:11px system-ui",
  "position:absolute;left:50%;top:10px;transform:translateX(-50%);z-index:81;width:64px;height:30px;min-width:64px;min-height:30px;display:flex;align-items:center;justify-content:center;padding:0;border-radius:999px;border:1px solid rgba(147,197,253,.75);background:rgba(15,23,42,.92);color:#e0f2fe;font:700 12px/1 system-ui;letter-spacing:.3px;pointer-events:auto;box-sizing:border-box;box-shadow:0 4px 14px rgba(0,0,0,.25)"
]) replaceAll(oldButton, fullscreenButtonStyle, "normalize fullscreen button style");

if (changed) fs.writeFileSync(target, source);
