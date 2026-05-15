const fs = require("fs");
const path = require("path");

const target = path.join(__dirname, "..", "src", "features", "rendering", "BuildPartRenderer.ts");
let source = fs.readFileSync(target, "utf8");
let changed = false;

function replaceOnce(search, replacement, label) {
  if (!source.includes(search)) {
    console.log(`[patch-stair-rendering-ramp-2p5d] skipped ${label}`);
    return;
  }
  source = source.replace(search, replacement);
  changed = true;
  console.log(`[patch-stair-rendering-ramp-2p5d] patched ${label}`);
}

replaceOnce(
  `  private drawStairs(ctx: CanvasRenderingContext2D, definition: BuildPartDefinition, left: number, top: number, width: number, height: number, _preview: boolean, _intensity: number) {
    const color = getMaterialPalette(definition.material);
    const rise = Math.min(44, BUILD_2P5D_WALL_HEIGHT);

    ctx.fillStyle = color.side;
    ctx.strokeStyle = color.dark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(left + 8, top + 7, width - 16, height - 10, 6);
    ctx.fill();
    ctx.stroke();

    const steps = 6;
    for (let step = 0; step < steps; step += 1) {
      const t = step / Math.max(1, steps - 1);
      const y = top + height - 9 - t * (height - 20);
      const stepRise = t * rise;
      ctx.fillStyle = step % 2 === 0 ? color.base : color.face;
      ctx.strokeStyle = color.dark;
      ctx.beginPath();
      ctx.roundRect(left + 12, y - stepRise * 0.18, width - 24, 7, 3);
      ctx.fill();
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "10px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("UP", left + width / 2, top + height / 2 - 8);
  }`,
  `  private drawStairs(ctx: CanvasRenderingContext2D, definition: BuildPartDefinition, left: number, top: number, width: number, height: number, _preview: boolean, _intensity: number) {
    const color = getMaterialPalette(definition.material);
    const rise = Math.min(52, BUILD_2P5D_WALL_HEIGHT);
    const rampLeft = left + 8;
    const rampRight = left + width - 8;
    const rampBottom = top + height - 8;
    const rampTop = top + 10;
    const topLandingY = rampTop - rise * 0.28;

    ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
    ctx.beginPath();
    ctx.ellipse(left + width / 2 + 8, top + height / 2 + 16, width * 0.42, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = color.side;
    ctx.strokeStyle = color.dark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(rampLeft, rampBottom);
    ctx.lineTo(rampRight, rampBottom - 5);
    ctx.lineTo(rampRight - 7, topLandingY + 16);
    ctx.lineTo(rampLeft + 7, topLandingY + 22);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = color.face;
    ctx.beginPath();
    ctx.moveTo(rampLeft + 7, topLandingY + 22);
    ctx.lineTo(rampRight - 7, topLandingY + 16);
    ctx.lineTo(rampRight - 14, rampTop + 2);
    ctx.lineTo(rampLeft + 14, rampTop + 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = color.light;
    ctx.strokeStyle = color.dark;
    ctx.lineWidth = 1.5;
    const steps = 7;
    for (let step = 0; step < steps; step += 1) {
      const t = step / Math.max(1, steps - 1);
      const y = rampBottom - 8 - t * (rampBottom - rampTop - 16);
      const stepRise = t * rise * 0.28;
      const inset = 10 + t * 5;
      ctx.beginPath();
      ctx.roundRect(left + inset, y - stepRise, width - inset * 2, 6, 3);
      ctx.fill();
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(34, 197, 94, 0.82)";
    ctx.strokeStyle = "rgba(22, 101, 52, 0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(left + width / 2, topLandingY + 5);
    ctx.lineTo(left + width / 2 + 8, topLandingY + 19);
    ctx.lineTo(left + width / 2 + 3, topLandingY + 18);
    ctx.lineTo(left + width / 2 + 3, rampBottom - 18);
    ctx.lineTo(left + width / 2 - 3, rampBottom - 18);
    ctx.lineTo(left + width / 2 - 3, topLandingY + 18);
    ctx.lineTo(left + width / 2 - 8, topLandingY + 19);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.82)";
    ctx.font = "bold 10px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("2F", left + width / 2, topLandingY - 4);
  }`,
  "drawStairs ramp",
);

if (changed) fs.writeFileSync(target, source);
