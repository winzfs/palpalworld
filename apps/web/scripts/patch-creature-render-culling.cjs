const fs = require("fs");
const path = require("path");

const scenePath = path.join(__dirname, "..", "src", "features", "game", "GameScene.tsx");
let source = fs.readFileSync(scenePath, "utf8");
let changed = false;

function replaceRegex(regex, replacement, label) {
  if (source.includes(replacement)) {
    console.log(`[patch-creature-render-culling] already-patched ${label}`);
    return;
  }
  if (!regex.test(source)) {
    console.log(`[patch-creature-render-culling] skipped ${label}`);
    return;
  }
  source = source.replace(regex, replacement);
  changed = true;
  console.log(`[patch-creature-render-culling] patched ${label}`);
}

replaceRegex(
  /  private drawCreatures\(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number, viewport: ViewportBounds\) \{[\s\S]*?\n  \}\n  private drawPlayers\(/,
  `  private drawCreatures(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number, viewport: ViewportBounds) {
    const creatures = this.getSceneCreatures();
    if (creatures.length <= 0) return;

    // Important: this only skips main-canvas rendering. The creature remains in
    // WorldSnapshot, AI simulation, combat targeting, and minimap data. When the
    // player walks to that location, it renders normally again.
    const renderPadding = creatures.length > 80 ? 64 : 96;
    const localPlayer = this.getLocalPlayerPosition();
    for (const creature of creatures) {
      if (creature.hp <= 0) continue;
      if (!isPositionInViewport(creature.position, viewport, renderPadding)) continue;

      const x = creature.position.x - cameraX;
      const y = creature.position.y - cameraY;
      this.renderer.drawCreature(ctx, creature, x, y);

      // Extra effects are only drawn when relevant. This keeps far/edge creatures
      // cheap while preserving visible combat feedback.
      if (creature.id === this.highlightedCreatureId) {
        const nearPlayer = !localPlayer || Math.hypot(creature.position.x - localPlayer.x, creature.position.y - localPlayer.y) <= 720;
        if (!nearPlayer) continue;
        ctx.save();
        ctx.strokeStyle = "rgba(250, 204, 21, 0.96)";
        ctx.lineWidth = 3;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.ellipse(x, y + 22, 29, 11, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
  }
  private drawPlayers(`,
  "creature render culling",
);

if (changed) fs.writeFileSync(scenePath, source);
