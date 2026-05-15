const fs = require("fs");
const path = require("path");

const target = path.join(__dirname, "..", "src", "features", "rendering", "BuildPartRenderer.ts");
let source = fs.readFileSync(target, "utf8");
let changed = false;

function replaceOnce(search, replacement, label) {
  if (!source.includes(search)) {
    console.log(`[patch-build-connection-alignment-2p5d] skipped ${label}`);
    return;
  }
  source = source.replace(search, replacement);
  changed = true;
  console.log(`[patch-build-connection-alignment-2p5d] patched ${label}`);
}

function ensureAfter(anchor, insertion, label) {
  if (source.includes(insertion)) return;
  replaceOnce(anchor, `${anchor}\n${insertion}`, label);
}

ensureAfter(
  'import { getEdgeWallRect2p5d } from "../buildings/buildProjection2p5d";',
  'import { getEdgeConnectionPoint2p5d, getEdgeEndpointRects2p5d } from "../buildings/buildConnection2p5d";',
  "connection import",
);

replaceOnce(
  '    if (definition.category === "wall" || definition.category === "door" || definition.category === "window") {\n      this.drawEdgeGuide(ctx, x, visualY, width, height, rotation, valid);\n    }',
  '    if (definition.category === "wall" || definition.category === "door" || definition.category === "window") {\n      this.drawEdgeGuide(ctx, x, visualY, width, height, rotation, valid);\n      this.drawConnectionGuide(ctx, x, visualY, width, height, rotation, valid);\n    }',
  "preview connection guide call",
);

replaceOnce(
  '  private drawEdgeGuide(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, rotation: BuildPartRotation, valid: boolean) {',
  '  private drawConnectionCaps(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, rotation: BuildPartRotation, color: ReturnType<typeof getMaterialPalette>) {\n    const point = getEdgeConnectionPoint2p5d({ x, y, width, height, rotation });\n    const caps = getEdgeEndpointRects2p5d(point);\n    ctx.save();\n    ctx.fillStyle = color.light;\n    ctx.strokeStyle = color.dark;\n    ctx.lineWidth = 2;\n    for (const cap of caps) {\n      ctx.beginPath();\n      ctx.roundRect(cap.left, cap.top, cap.width, cap.height, 3);\n      ctx.fill();\n      ctx.stroke();\n    }\n    ctx.restore();\n  }\n\n  private drawConnectionGuide(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, rotation: BuildPartRotation, valid: boolean) {\n    const point = getEdgeConnectionPoint2p5d({ x, y, width, height, rotation });\n    const caps = getEdgeEndpointRects2p5d(point);\n    ctx.save();\n    ctx.globalAlpha = 0.9;\n    ctx.strokeStyle = valid ? "rgba(250, 204, 21, 0.95)" : "rgba(248, 113, 113, 0.95)";\n    ctx.fillStyle = valid ? "rgba(250, 204, 21, 0.18)" : "rgba(248, 113, 113, 0.18)";\n    ctx.lineWidth = 2;\n    for (const cap of caps) {\n      ctx.beginPath();\n      ctx.roundRect(cap.left, cap.top, cap.width, cap.height, 3);\n      ctx.fill();\n      ctx.stroke();\n    }\n    ctx.restore();\n  }\n\n  private drawEdgeGuide(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, rotation: BuildPartRotation, valid: boolean) {',
  "connection helper methods",
);

replaceOnce(
  '    if (definition.id.includes("corner_post")) {\n      const postLeft = rect.horizontal ? rect.left + rect.width / 2 - 8 : rect.left - 1;\n      const postTop = rect.horizontal ? rect.wallTop - 3 : rect.top + rect.height / 2 - wallHeight / 2 - 5;\n      const postWidth = rect.horizontal ? 16 : rect.width + 2;\n      const postHeight = rect.horizontal ? wallHeight + 18 : wallHeight + 12;\n      this.drawWallPost(ctx, postLeft, postTop, postWidth, postHeight, color);\n    }\n\n    if (preview) this.drawCenterMark(ctx, x - width / 2, y - height / 2, width, height);',
  '    this.drawConnectionCaps(ctx, x, y, width, height, rotation, color);\n\n    if (definition.id.includes("corner_post")) {\n      const postLeft = rect.horizontal ? rect.left + rect.width / 2 - 8 : rect.left - 1;\n      const postTop = rect.horizontal ? rect.wallTop - 3 : rect.top + rect.height / 2 - wallHeight / 2 - 5;\n      const postWidth = rect.horizontal ? 16 : rect.width + 2;\n      const postHeight = rect.horizontal ? wallHeight + 18 : wallHeight + 12;\n      this.drawWallPost(ctx, postLeft, postTop, postWidth, postHeight, color);\n    }\n\n    if (preview) this.drawCenterMark(ctx, x - width / 2, y - height / 2, width, height);',
  "wall connection caps",
);

if (changed) fs.writeFileSync(target, source);
