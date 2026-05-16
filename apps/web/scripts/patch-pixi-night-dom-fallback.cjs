const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, '..', 'src', 'app', 'hud-menu.css');
let css = fs.readFileSync(cssPath, 'utf8');
let changed = false;

const hideBlock = `.game-shell--pixi-stage.game-shell--night .night-field-overlay,
.game-shell--pixi-stage.game-shell--night .night-player-light {
  display: none !important;
}

`;

if (css.includes(hideBlock)) {
  css = css.replace(hideBlock, '');
  changed = true;
  console.log('[patch-pixi-night-dom-fallback] removed Pixi-mode DOM night overlay hiding');
}

const compactHideBlock = `.game-shell--pixi-stage.game-shell--night .night-field-overlay,\n.game-shell--pixi-stage.game-shell--night .night-player-light {\n  display: none !important;\n}\n\n`;
if (css.includes(compactHideBlock)) {
  css = css.replace(compactHideBlock, '');
  changed = true;
  console.log('[patch-pixi-night-dom-fallback] removed escaped Pixi-mode DOM night overlay hiding');
}

if (!css.includes('/* pixi night dom fallback */')) {
  css = `${css.trimEnd()}\n\n/* pixi night dom fallback */\n.game-shell--pixi-stage.game-shell--night .night-field-overlay,\n.game-shell--pixi-stage.game-shell--night .night-player-light {\n  display: block;\n}\n`;
  changed = true;
  console.log('[patch-pixi-night-dom-fallback] appended fallback visibility');
}

if (changed) fs.writeFileSync(cssPath, css);
else console.log('[patch-pixi-night-dom-fallback] no changes');
