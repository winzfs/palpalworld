import type { AssetCatalog, DirectionalSpriteSheetSet } from "./assetTypes";

function svgDataUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function playerFrame(x: number, y: number, pose: "idle" | "walk1" | "walk2") {
  const leftLeg = pose === "walk1" ? -4 : pose === "walk2" ? 4 : 0;
  const rightLeg = pose === "walk1" ? 4 : pose === "walk2" ? -4 : 0;
  const leftArm = pose === "walk1" ? 4 : pose === "walk2" ? -4 : 0;
  const rightArm = pose === "walk1" ? -4 : pose === "walk2" ? 4 : 0;

  return `
    <g transform="translate(${x} ${y})">
      <ellipse cx="32" cy="54" rx="15" ry="5" fill="rgba(0,0,0,0.32)"/>
      <rect x="23" y="27" width="18" height="21" rx="4" fill="#38bdf8" stroke="#0f172a" stroke-width="3"/>
      <line x1="26" y1="32" x2="${22 + leftArm}" y2="43" stroke="#f8d7a4" stroke-width="5" stroke-linecap="round"/>
      <line x1="38" y1="32" x2="${42 + rightArm}" y2="43" stroke="#f8d7a4" stroke-width="5" stroke-linecap="round"/>
      <line x1="27" y1="47" x2="${27 + leftLeg}" y2="57" stroke="#1e3a8a" stroke-width="5" stroke-linecap="round"/>
      <line x1="37" y1="47" x2="${37 + rightLeg}" y2="57" stroke="#1e3a8a" stroke-width="5" stroke-linecap="round"/>
      <circle cx="32" cy="19" r="11" fill="#f8d7a4" stroke="#0f172a" stroke-width="3"/>
      <path d="M22 17 Q32 5 43 17 L42 12 Q32 4 23 12 Z" fill="#3b2414"/>
      <rect x="27" y="18" width="3" height="3" fill="#111827"/>
      <rect x="36" y="18" width="3" height="3" fill="#111827"/>
      <rect x="30" y="24" width="7" height="2" fill="#7f1d1d" opacity="0.75"/>
    </g>`;
}

function makePlayerSheet(kind: "idle" | "walk") {
  const columns = kind === "idle" ? 1 : 6;
  const poses: ("idle" | "walk1" | "walk2")[] = kind === "idle" ? ["idle"] : ["idle", "walk1", "idle", "walk2", "idle", "walk1"];
  const rows = ["down", "left", "right", "up"];
  const width = columns * 64;
  const height = rows.length * 64;
  let body = "";

  for (let row = 0; row < rows.length; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const x = column * 64;
      const y = row * 64;
      const rotate = rows[row] === "left" ? -8 : rows[row] === "right" ? 8 : rows[row] === "up" ? 180 : 0;
      body += `<g transform="translate(${x + 32} ${y + 32}) rotate(${rotate}) translate(${-x - 32} ${-y - 32})">${playerFrame(x, y, poses[column])}</g>`;
    }
  }

  return svgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges">${body}</svg>`);
}

const playerDefaultSheets: DirectionalSpriteSheetSet = {
  idle: {
    key: "player.default.idle.placeholder",
    src: makePlayerSheet("idle"),
    frameWidth: 64,
    frameHeight: 64,
    columns: 1,
    rows: 4,
    frameCount: 1,
    rowByDirection: { down: 0, left: 1, right: 2, up: 3 },
    frameDurationMs: 600,
  },
  walk: {
    key: "player.default.walk.placeholder",
    src: makePlayerSheet("walk"),
    frameWidth: 64,
    frameHeight: 64,
    columns: 6,
    rows: 4,
    frameCount: 6,
    rowByDirection: { down: 0, left: 1, right: 2, up: 3 },
    frameDurationMs: 105,
  },
};

export const assetCatalog: AssetCatalog = {
  player: {
    default: playerDefaultSheets,
  },
  creatures: {},
  resources: {},
  buildings: {},
  icons: {},
};

export function getPlayerSpriteSet() {
  return assetCatalog.player.default;
}

export function getCreatureSpriteSet(speciesId: string) {
  return assetCatalog.creatures[speciesId] ?? null;
}

export function getResourceSpriteSet(resourceType: string) {
  return assetCatalog.resources[resourceType] ?? null;
}

export function getBuildingSpriteSet(buildingType: string) {
  return assetCatalog.buildings[buildingType] ?? null;
}

export function getIconAsset(iconKey: string) {
  return assetCatalog.icons[iconKey] ?? null;
}
