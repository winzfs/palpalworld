const fs = require("fs");
const path = require("path");

const target = path.join(__dirname, "..", "src", "features", "rendering", "BuildPartRenderer.ts");
let source = fs.readFileSync(target, "utf8");
let changed = false;

function replaceBlock(methodName, replacement) {
  const pattern = new RegExp(`  private ${methodName}\\([\\s\\S]*?\\n  \\}\\n\\n  private `);
  const match = source.match(pattern);
  if (!match) {
    console.log(`[patch-build-part-graphics-2p5d-polish] skipped ${methodName}`);
    return;
  }
  const nextMarker = match[0].slice(match[0].lastIndexOf("\n  private ") + 1);
  source = source.replace(pattern, `${replacement}\n\n  ${nextMarker}`);
  changed = true;
  console.log(`[patch-build-part-graphics-2p5d-polish] patched ${methodName}`);
}

replaceBlock("drawFloor", `  private drawFloor(ctx: CanvasRenderingContext2D, definition: BuildPartDefinition, left: number, top: number, width: number, height: number, preview: boolean, intensity: number, floorLevel: number) {
    const color = getMaterialPalette(definition.material);
    const slabDepth = definition.layer === "foundation" ? 14 : 8;
    const isUpperFloor = floorLevel > 0 || definition.id.includes("second_floor");
    const frame = 6;

    ctx.save();
    ctx.shadowColor = preview ? "rgba(0,0,0,0.12)" : "rgba(0,0,0,0.22)";
    ctx.shadowBlur = preview ? 2 : 5;
    ctx.shadowOffsetY = preview ? 1 : 3;

    ctx.fillStyle = color.dark;
    ctx.strokeStyle = "rgba(17, 24, 39, 0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(left + 3, top + 9, width - 6, height - 7 + slabDepth, 7);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = color.side;
    ctx.beginPath();
    ctx.roundRect(left + 5, top + height - 16, width - 10, 13 + slabDepth, 5);
    ctx.fill();

    ctx.fillStyle = color.base;
    ctx.strokeStyle = color.dark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(left + 4, top + 4, width - 8, height - 12, 7);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = color.side;
    ctx.fillRect(left + frame, top + frame, width - frame * 2, 5);
    ctx.fillRect(left + frame, top + height - frame - 10, width - frame * 2, 5);
    ctx.fillRect(left + frame, top + frame, 5, height - frame * 2 - 5);
    ctx.fillRect(left + width - frame - 5, top + frame, 5, height - frame * 2 - 5);

    const cornerSize = 11;
    ctx.fillStyle = color.light;
    ctx.strokeStyle = color.dark;
    for (const [cx, cy] of [[left + 4, top + 4], [left + width - cornerSize - 4, top + 4], [left + 4, top + height - cornerSize - 8], [left + width - cornerSize - 4, top + height - cornerSize - 8]]) {
      ctx.beginPath();
      ctx.roundRect(cx, cy, cornerSize, cornerSize, 3);
      ctx.fill();
      ctx.stroke();
    }

    if (definition.material === "stone") {
      ctx.strokeStyle = "rgba(30, 41, 59, 0.36)";
      ctx.lineWidth = 1;
      for (let row = 0; row < 4; row += 1) {
        for (let col = 0; col < 4; col += 1) {
          const px = left + 14 + col * ((width - 28) / 4);
          const py = top + 14 + row * ((height - 30) / 4);
          ctx.beginPath();
          ctx.ellipse(px + (row % 2) * 4, py, 7, 5, 0.2, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    } else {
      ctx.strokeStyle = preview ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.18)";
      ctx.lineWidth = 1;
      for (let offset = 16; offset < width - 8; offset += 12) {
        ctx.beginPath();
        ctx.moveTo(left + offset, top + 11);
        ctx.lineTo(left + offset - 5, top + height - 20);
        ctx.stroke();
      }
      ctx.strokeStyle = "rgba(0,0,0,0.18)";
      for (let offset = 18; offset < height - 18; offset += 13) {
        ctx.beginPath();
        ctx.moveTo(left + 14, top + offset);
        ctx.lineTo(left + width - 14, top + offset + 1);
        ctx.stroke();
      }
    }

    if (isUpperFloor) {
      ctx.globalAlpha *= 0.42 * intensity;
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.fillRect(left + 11, top + 9, width - 22, 5);
    }
    ctx.restore();
  }`);

replaceBlock("drawWall", `  private drawWall(ctx: CanvasRenderingContext2D, definition: BuildPartDefinition, left: number, top: number, width: number, height: number, preview: boolean, _intensity: number) {
    const color = getMaterialPalette(definition.material);
    const visual = getBuildPartVisual2p5d(definition);
    const wallHeight = visual.renderHeightPx;
    const lowWall = definition.id.includes("half") || definition.id.includes("railing") || definition.id.includes("fence");
    const wallTop = top + height / 2 - wallHeight;
    const wallBottom = top + height / 2 + 10;
    const faceLeft = left + 5;
    const faceWidth = width - 10;
    const postWidth = 9;

    ctx.save();
    ctx.shadowColor = preview ? "rgba(0,0,0,0.10)" : "rgba(0,0,0,0.24)";
    ctx.shadowBlur = preview ? 1 : 4;
    ctx.shadowOffsetY = preview ? 1 : 3;

    ctx.fillStyle = color.dark;
    ctx.strokeStyle = "rgba(17, 24, 39, 0.85)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(faceLeft, wallBottom - 11, faceWidth, 13, 4);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = color.face;
    ctx.strokeStyle = color.dark;
    ctx.beginPath();
    ctx.roundRect(faceLeft + postWidth - 1, wallTop + 7, faceWidth - postWidth * 2 + 2, wallHeight - 8, 5);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = color.side;
    ctx.strokeStyle = color.dark;
    for (const px of [faceLeft, faceLeft + faceWidth - postWidth]) {
      ctx.beginPath();
      ctx.roundRect(px, wallTop, postWidth, wallHeight + 11, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = color.light;
      ctx.fillRect(px + 2, wallTop + 3, postWidth - 4, 5);
      ctx.fillStyle = color.side;
    }

    ctx.fillStyle = color.side;
    ctx.strokeStyle = color.dark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(faceLeft + 2, wallTop + 2, faceWidth - 4, 9, 4);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.roundRect(faceLeft + 2, wallBottom - 9, faceWidth - 4, 9, 3);
    ctx.fill();
    ctx.stroke();

    if (!lowWall) {
      ctx.strokeStyle = "rgba(255,255,255,0.22)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(faceLeft + postWidth + 5, wallTop + 13);
      ctx.lineTo(faceLeft + faceWidth - postWidth - 5, wallTop + 13);
      ctx.stroke();
      ctx.strokeStyle = "rgba(0,0,0,0.14)";
      for (let offset = 16; offset < faceWidth - 16; offset += 13) {
        ctx.beginPath();
        ctx.moveTo(faceLeft + offset, wallTop + 16);
        ctx.lineTo(faceLeft + offset - 4, wallBottom - 13);
        ctx.stroke();
      }
    }

    if (definition.id.includes("corner_post")) {
      ctx.fillStyle = color.light;
      ctx.strokeStyle = color.dark;
      ctx.beginPath();
      ctx.roundRect(left + width / 2 - 8, wallTop - 3, 16, wallHeight + 18, 5);
      ctx.fill();
      ctx.stroke();
    }

    if (preview) this.drawCenterMark(ctx, left, top, width, height);
    ctx.restore();
  }`);

replaceBlock("drawRoof", `  private drawRoof(ctx: CanvasRenderingContext2D, definition: BuildPartDefinition, left: number, top: number, width: number, height: number, _preview: boolean, _intensity: number, floorLevel: number) {
    const color = getMaterialPalette(definition.material);
    const roofTop = top - BUILD_2P5D_ROOF_RISE - Math.max(0, floorLevel - 1) * 4;
    const roofMidY = top + height / 2 - 9;
    const ridgeY = roofTop + 5;

    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.24)";
    ctx.shadowBlur = 5;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = definition.material === "cloth" ? color.face : color.roof;
    ctx.strokeStyle = color.dark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(left + width / 2, roofTop);
    ctx.lineTo(left + width - 3, roofMidY);
    ctx.lineTo(left + width - 8, roofMidY + 22);
    ctx.lineTo(left + width / 2, roofTop + 14);
    ctx.lineTo(left + 8, roofMidY + 22);
    ctx.lineTo(left + 3, roofMidY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(60, 20, 12, 0.42)";
    ctx.lineWidth = 1;
    for (let row = 0; row < 5; row += 1) {
      const y = roofTop + 15 + row * 8;
      ctx.beginPath();
      ctx.moveTo(left + 13 + row * 3, y);
      ctx.lineTo(left + width - 13 - row * 3, y + 2);
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(left + width / 2, ridgeY);
    ctx.lineTo(left + width / 2, roofMidY + 18);
    ctx.stroke();

    ctx.fillStyle = color.side;
    ctx.strokeStyle = color.dark;
    ctx.beginPath();
    ctx.roundRect(left + width / 2 - 6, roofTop - 2, 12, 18, 5);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }`);

if (changed) fs.writeFileSync(target, source);
