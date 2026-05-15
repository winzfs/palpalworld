const fs = require("fs");
const path = require("path");

const visualPath = path.join(__dirname, "..", "src", "features", "buildings", "buildPartVisual2p5d.ts");
const rendererPath = path.join(__dirname, "..", "src", "features", "rendering", "BuildPartRenderer.ts");
let visual = fs.readFileSync(visualPath, "utf8");
let renderer = fs.readFileSync(rendererPath, "utf8");
let visualChanged = false;
let rendererChanged = false;

function replaceVisual(search, replacement, label) {
  if (visual.includes(replacement)) {
    console.log(`[patch-build-render-hotpath-final] already-patched visual ${label}`);
    return;
  }
  if (!visual.includes(search)) {
    console.log(`[patch-build-render-hotpath-final] skipped visual ${label}`);
    return;
  }
  visual = visual.replace(search, replacement);
  visualChanged = true;
  console.log(`[patch-build-render-hotpath-final] patched visual ${label}`);
}

function replaceRenderer(search, replacement, label) {
  if (renderer.includes(replacement)) {
    console.log(`[patch-build-render-hotpath-final] already-patched renderer ${label}`);
    return;
  }
  if (!renderer.includes(search)) {
    console.log(`[patch-build-render-hotpath-final] skipped renderer ${label}`);
    return;
  }
  renderer = renderer.replace(search, replacement);
  rendererChanged = true;
  console.log(`[patch-build-render-hotpath-final] patched renderer ${label}`);
}

function replaceRendererRegex(regex, replacement, label) {
  if (!regex.test(renderer)) {
    console.log(`[patch-build-render-hotpath-final] skipped renderer ${label}`);
    return;
  }
  renderer = renderer.replace(regex, replacement);
  rendererChanged = true;
  console.log(`[patch-build-render-hotpath-final] patched renderer ${label}`);
}

// 1) Material palette allocation hot path: return stable module constants instead of
// creating a fresh object every draw call.
const oldPaletteFn = `export function getMaterialPalette(material: BuildPartMaterial): BuildMaterialPalette {
  if (material === "stone") return {
    base: "#6b7280",
    side: "#4b5563",
    dark: "#374151",
    light: "#a8b0bd",
    face: "#7d8795",
    roof: "#596273",
    fill: "#6b7280",
  };
  if (material === "cloth") return {
    base: "#b45309",
    side: "#92400e",
    dark: "#78350f",
    light: "#fbbf24",
    face: "#d97706",
    roof: "#c2410c",
    fill: "#d97706",
  };
  if (material === "metal") return {
    base: "#64748b",
    side: "#475569",
    dark: "#334155",
    light: "#cbd5e1",
    face: "#94a3b8",
    roof: "#475569",
    fill: "#64748b",
  };
  return {
    base: "#8b5a2b",
    side: "#6f411d",
    dark: "#3b2413",
    light: "#d19a55",
    face: "#a96f38",
    roof: "#7c2d12",
    fill: "#8b5a2b",
  };
}`;

const newPaletteFn = `const MATERIAL_PALETTES: Record<BuildPartMaterial, BuildMaterialPalette> = {
  stone: {
    base: "#6b7280",
    side: "#4b5563",
    dark: "#374151",
    light: "#a8b0bd",
    face: "#7d8795",
    roof: "#596273",
    fill: "#6b7280",
  },
  cloth: {
    base: "#b45309",
    side: "#92400e",
    dark: "#78350f",
    light: "#fbbf24",
    face: "#d97706",
    roof: "#c2410c",
    fill: "#d97706",
  },
  metal: {
    base: "#64748b",
    side: "#475569",
    dark: "#334155",
    light: "#cbd5e1",
    face: "#94a3b8",
    roof: "#475569",
    fill: "#64748b",
  },
  wood: {
    base: "#8b5a2b",
    side: "#6f411d",
    dark: "#3b2413",
    light: "#d19a55",
    face: "#a96f38",
    roof: "#7c2d12",
    fill: "#8b5a2b",
  },
};

export function getMaterialPalette(material: BuildPartMaterial): BuildMaterialPalette {
  return MATERIAL_PALETTES[material] ?? MATERIAL_PALETTES.wood;
}`;
replaceVisual(oldPaletteFn, newPaletteFn, "material palette constants");

// 2) Disable all soft-shadow work. The renderer already paints depth using side/dark
// faces, so canvas shadow pipeline is mostly redundant and expensive on mobile GPUs.
replaceRendererRegex(
  /  private drawSoftShadow\(ctx: CanvasRenderingContext2D, left: number, top: number, width: number, height: number, renderHeight: number, preview: boolean\) \{[\s\S]*?\n  \}\n\n  private drawFloor/,
  `  private drawSoftShadow(_ctx: CanvasRenderingContext2D, _left: number, _top: number, _width: number, _height: number, _renderHeight: number, _preview: boolean) {
    return;
  }

  private drawFloor`,
  "soft shadow no-op",
);

// 3) Remove direct shadow state writes that can keep the canvas in shadow mode even
// when blur is set to zero by another patch.
for (const shadowLine of [
  '    ctx.shadowColor = preview ? "rgba(0,0,0,0.07)" : "rgba(0,0,0,0.16)";\n',
  '    ctx.shadowColor = preview ? "rgba(0, 0, 0, 0.10)" : "rgba(0, 0, 0, 0.18)";\n',
  '    ctx.shadowColor = this.liteMode ? "rgba(0,0,0,0)" : preview ? "rgba(0,0,0,0.04)" : "rgba(0,0,0,0.10)";\n',
  '    ctx.shadowBlur = preview ? 1 : 3;\n',
  '    ctx.shadowBlur = this.liteMode ? 0 : preview ? 0 : 1;\n',
  '    ctx.shadowOffsetY = 2;\n',
  '    ctx.shadowOffsetY = this.liteMode ? 0 : 1;\n',
]) {
  if (renderer.includes(shadowLine)) {
    renderer = renderer.split(shadowLine).join("");
    rendererChanged = true;
    console.log(`[patch-build-render-hotpath-final] removed renderer shadow line`);
  }
}

// 4) Floor bottomFace is not visible in the isometric camera but costs fill+stroke
// for every floor slab. Remove only the bottom face pass; keep side/top faces.
replaceRenderer(
  `    ctx.fillStyle = color.dark;
    ctx.strokeStyle = "rgba(15,23,42,0.54)";
    ctx.lineWidth = 1;
    this.drawPolygon(ctx, slab.bottomFace, true, true);

    ctx.shadowBlur = 0;
    ctx.fillStyle = color.side;`,
  `    ctx.fillStyle = color.side;`,
  "remove invisible floor bottomFace",
);
replaceRenderer(
  `    ctx.fillStyle = color.dark;
    ctx.strokeStyle = "rgba(15,23,42,0.54)";
    ctx.lineWidth = 1;
    this.drawPolygon(ctx, slab.bottomFace, true, true);

    ctx.fillStyle = color.side;`,
  `    ctx.fillStyle = color.side;`,
  "remove invisible floor bottomFace alternate",
);

// 5) Remove decorative floor grid line passes in normal rendering. The top face and
// material colors remain, but the repeated strokePolyline loops disappear.
replaceRendererRegex(
  /\n    ctx\.globalAlpha \*= 0\.78 \* intensity;[\s\S]*?\n\n    if \(isUpperFloor\) \{[\s\S]*?\n    \}\n    ctx\.restore\(\);/,
  `
    ctx.restore();`,
  "remove floor detail line loops",
);

// 6) Wall/roof detail strokes are expensive and visually minor at game scale.
replaceRendererRegex(
  /\n    ctx\.shadowBlur = 0;\n    ctx\.strokeStyle = "rgba\(255,255,255,0\.16\)";[\s\S]*?this\.strokePolyline\(ctx, \[plane\.baseStart, plane\.baseEnd\]\);\n/,
  `
`,
  "remove wall detail strokes",
);
replaceRendererRegex(
  /\n    ctx\.strokeStyle = "rgba\(255,255,255,0\.22\)";[\s\S]*?\n    ctx\.restore\(\);\n  \}\n\n  private drawDecor/,
  `
    ctx.restore();
  }

  private drawDecor`,
  "remove roof detail strokes",
);

// 7) Reduce stair detail loop from 6 to 4. This preserves stair readability but
// cuts a repeated stroke loop for every stair part.
replaceRenderer("    const steps = 6;", "    const steps = 4;", "reduce stair steps");
replaceRenderer("    const steps = this.liteMode ? 2 : 6;", "    const steps = this.liteMode ? 2 : 4;", "reduce stair steps lite variant");

// 8) Remove small decor highlight fillRect. It is a separate canvas op per decor.
replaceRenderer(
  `      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.fillRect(left + 14, top + 16, width - 28, 4);`,
  `      // highlight skipped for build render performance`,
  "remove decor highlight",
);

if (visualChanged) fs.writeFileSync(visualPath, visual);
if (rendererChanged) fs.writeFileSync(rendererPath, renderer);
