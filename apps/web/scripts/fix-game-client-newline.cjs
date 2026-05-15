const fs = require("fs");
const path = require("path");

const target = path.join(__dirname, "..", "src", "features", "game", "GameClientTileDemoStation.tsx");
const source = fs.readFileSync(target, "utf8");
const fixed = source.split("}\\nfunction").join("}\nfunction");

if (fixed !== source) {
  fs.writeFileSync(target, fixed);
  console.log("Patched literal \\n token in GameClientTileDemoStation.tsx");
} else {
  console.log("No literal \\n token found in GameClientTileDemoStation.tsx");
}
