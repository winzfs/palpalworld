const fs = require("fs");
const path = require("path");

const target = path.join(__dirname, "..", "src", "features", "game", "GameScene.tsx");
let source = fs.readFileSync(target, "utf8");
let changed = false;

function replace(search, replacement, label) {
  if (source.includes(replacement)) {
    console.log(`[patch-build-foreground-lod] already-patched ${label}`);
    return;
  }
  if (!source.includes(search)) {
    console.log(`[patch-build-foreground-lod] skipped ${label}`);
    return;
  }
  source = source.replace(search, replacement);
  changed = true;
  console.log(`[patch-build-foreground-lod] patched ${label}`);
}

replace(
  `    let ghostOutlineCount = 0;
    const maxGhostOutlines = sourceParts.length > 70 ? 0 : 20;
    for (const part of visibleParts) {`,
  `    let ghostOutlineCount = 0;
    let drawnForegroundCount = 0;
    const maxGhostOutlines = sourceParts.length > 70 ? 0 : 20;
    const maxForegroundParts = sourceParts.length > 220 ? 70 : sourceParts.length > 120 ? 110 : 180;
    const lodHeavyForeground = sourceParts.length > 120 || visibleParts.length > 90;
    for (const part of visibleParts) {`,
  "foreground lod counters",
);

replace(
  `      const nearPlayer = Boolean(localPlayer && Math.hypot(localPlayer.position.x - center.x, localPlayer.position.y - center.y) <= (definition.category === "roof" ? 190 : 150));
      const sameFloor = Math.abs(part.floorLevel - playerFloorLevel) <= 1;
      const indoorAlpha = nearPlayer && sameFloor ? (definition.category === "roof" ? 0.24 : 0.46) : 1;
      ctx.save();`,
  `      const nearPlayer = Boolean(localPlayer && Math.hypot(localPlayer.position.x - center.x, localPlayer.position.y - center.y) <= (definition.category === "roof" ? 190 : 150));
      const sameFloor = Math.abs(part.floorLevel - playerFloorLevel) <= 1;
      const directlySelected = part.id === this.selectedPlacedBuildPartId;
      const demolitionSelected = this.demolitionSelectedPartIds.has(part.id);
      if (lodHeavyForeground && !nearPlayer && !directlySelected && !demolitionSelected && drawnForegroundCount >= maxForegroundParts) continue;
      drawnForegroundCount += 1;
      const indoorAlpha = nearPlayer && sameFloor ? (definition.category === "roof" ? 0.24 : 0.46) : 1;
      ctx.save();`,
  "foreground lod skip far parts",
);

replace(
  `      const directlySelected = part.id === this.selectedPlacedBuildPartId;
      const demolitionSelected = this.demolitionSelectedPartIds.has(part.id);
      const houseGhost = ghostOutlineCount < maxGhostOutlines && Boolean(part.houseId && part.houseId === this.selectedHouseId);`,
  `      const houseGhost = !lodHeavyForeground && ghostOutlineCount < maxGhostOutlines && Boolean(part.houseId && part.houseId === this.selectedHouseId);`,
  "foreground lod outlines",
);

if (changed) fs.writeFileSync(target, source);
