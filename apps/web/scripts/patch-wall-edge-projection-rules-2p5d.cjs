const fs = require("fs");
const path = require("path");

const target = path.join(__dirname, "..", "src", "features", "rendering", "BuildPartRenderer.ts");
let source = fs.readFileSync(target, "utf8");
let changed = false;

function replaceOnce(search, replacement, label) {
  if (!source.includes(search)) {
    console.log(`[patch-wall-edge-projection-rules-2p5d] skipped ${label}`);
    return;
  }
  source = source.replace(search, replacement);
  changed = true;
  console.log(`[patch-wall-edge-projection-rules-2p5d] patched ${label}`);
}

function ensureAfter(anchor, insertion, label) {
  if (source.includes(insertion)) return;
  replaceOnce(anchor, `${anchor}\n${insertion}`, label);
}

ensureAfter(
  '} from "../buildings/buildPartVisual2p5d";',
  'import { getEdgeWallRect2p5d } from "../buildings/buildProjection2p5d";',
  "projection import",
);

replaceOnce(
  `  private getEdgeWallRect(x: number, y: number, width: number, height: number, rotation: BuildPartRotation, wallHeight: number) {
    const thickness = 14;
    const overhang = 2;
    const left = x - width / 2;
    const top = y - height / 2;
    const right = x + width / 2;
    const bottom = y + height / 2;
    if (rotation === 90) return { left: right - thickness + overhang, top: top + 5, width: thickness, height: height - 10, wallTop: top + 5 - wallHeight + 12, horizontal: false };
    if (rotation === 180) return { left: left + 5, top: bottom - thickness + overhang, width: width - 10, height: thickness, wallTop: bottom - thickness + overhang - wallHeight + 12, horizontal: true };
    if (rotation === 270) return { left: left - overhang, top: top + 5, width: thickness, height: height - 10, wallTop: top + 5 - wallHeight + 12, horizontal: false };
    return { left: left + 5, top: top - overhang, width: width - 10, height: thickness, wallTop: top - overhang - wallHeight + 12, horizontal: true };
  }`,
  `  private getEdgeWallRect(x: number, y: number, width: number, height: number, rotation: BuildPartRotation, wallHeight: number) {
    return getEdgeWallRect2p5d({ x, y, width, height, rotation, wallHeight });
  }`,
  "shared edge projection",
);

if (changed) fs.writeFileSync(target, source);
