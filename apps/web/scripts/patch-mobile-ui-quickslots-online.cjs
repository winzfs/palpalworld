const fs = require("fs");
const path = require("path");

const clientPath = path.join(__dirname, "..", "src", "features", "game", "GameClientTileDemoStation.tsx");
const cssPath = path.join(__dirname, "..", "src", "app", "hud-menu.css");

let client = fs.readFileSync(clientPath, "utf8");
let css = fs.readFileSync(cssPath, "utf8");
let clientChanged = false;
let cssChanged = false;

function patchString(source, search, replacement, label) {
  if (source.includes(replacement)) {
    console.log(`[patch-mobile-ui-quickslots-online] already patched ${label}`);
    return { text: source, changed: false };
  }
  if (!source.includes(search)) {
    console.log(`[patch-mobile-ui-quickslots-online] skipped ${label}`);
    return { text: source, changed: false };
  }
  console.log(`[patch-mobile-ui-quickslots-online] patched ${label}`);
  return { text: source.replace(search, replacement), changed: true };
}

function patchRegex(source, regex, replacement, label) {
  regex.lastIndex = 0;
  if (!regex.test(source)) {
    console.log(`[patch-mobile-ui-quickslots-online] skipped ${label}`);
    return { text: source, changed: false };
  }
  regex.lastIndex = 0;
  const next = source.replace(regex, replacement);
  if (next === source) {
    console.log(`[patch-mobile-ui-quickslots-online] already patched ${label}`);
    return { text: source, changed: false };
  }
  console.log(`[patch-mobile-ui-quickslots-online] patched ${label}`);
  return { text: next, changed: true };
}

{
  const result = patchString(client, "const quickSlotCount = 5;", "const quickSlotCount = 8;", "quick slot count 8");
  client = result.text;
  clientChanged ||= result.changed;
}

{
  const result = patchRegex(
    css,
    /\.quick-slot-bar \{[\s\S]*?\n\}/,
    `.quick-slot-bar {
  pointer-events: auto;
  position: absolute;
  right: calc(14px + var(--safe-right));
  bottom: calc(110px + var(--safe-bottom));
  z-index: 26;
  display: grid;
  grid-template-rows: repeat(4, 42px);
  grid-auto-flow: column;
  grid-auto-columns: 42px;
  gap: 6px;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}`,
    "hud quickslot 4 vertical x 2 columns",
  );
  css = result.text;
  cssChanged ||= result.changed;
}

{
  const result = patchRegex(
    css,
    /\.inventory-quick-assign div \{[^}]*\}/,
    `.inventory-quick-assign div { display: grid; grid-template-columns: repeat(4, minmax(30px, 1fr)); gap: 4px; }`,
    "inventory quick assign 4 columns x 2 rows",
  );
  css = result.text;
  cssChanged ||= result.changed;
}

{
  const result = patchRegex(
    css,
    /  \.quick-slot-bar \{[^}]*\}/,
    `  .quick-slot-bar {
    right: calc(10px + var(--safe-right));
    bottom: calc(96px + var(--safe-bottom));
    grid-template-rows: repeat(4, 36px);
    grid-auto-flow: column;
    grid-auto-columns: 36px;
    gap: 5px;
    z-index: 28;
  }`,
    "mobile hud quickslot 4 vertical x 2 columns",
  );
  css = result.text;
  cssChanged ||= result.changed;
}

if (clientChanged) fs.writeFileSync(clientPath, client);
if (cssChanged) fs.writeFileSync(cssPath, css);
