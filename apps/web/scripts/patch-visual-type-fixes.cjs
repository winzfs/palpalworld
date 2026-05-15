const fs = require("fs");
const path = require("path");

const visualPath = path.join(__dirname, "..", "src", "features", "buildings", "buildPartVisual2p5d.ts");
let source = fs.readFileSync(visualPath, "utf8");
let changed = false;

function replaceOnce(search, replacement, label) {
  if (!source.includes(search)) {
    console.log(`[patch-visual-type-fixes] skipped ${label}`);
    return;
  }
  source = source.replace(search, replacement);
  changed = true;
  console.log(`[patch-visual-type-fixes] patched ${label}`);
}

replaceOnce('roof: "#596273",\n  };', 'roof: "#596273",\n    fill: "#6b7280",\n  };', "stone fill");
replaceOnce('roof: "#c2410c",\n  };', 'roof: "#c2410c",\n    fill: "#d97706",\n  };', "cloth fill");
replaceOnce('roof: "#475569",\n  };', 'roof: "#475569",\n    fill: "#64748b",\n  };', "metal fill");
replaceOnce('roof: "#7c2d12",\n  };', 'roof: "#7c2d12",\n    fill: "#8b5a2b",\n  };', "wood fill");
replaceOnce('floorYOffsetPx: definition.floorLevel * BUILD_2P5D_FLOOR_HEIGHT,', 'floorYOffsetPx: 0,', "definition floorLevel removal");

if (changed) fs.writeFileSync(visualPath, source);
