import type { AssetCatalog, DirectionalSpriteSheetSet } from "./assetTypes";

function svgDataUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const meadowTilesetSrc = svgDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" width="192" height="32" viewBox="0 0 192 32" shape-rendering="crispEdges">
  <rect x="0" y="0" width="32" height="32" fill="#2f9e44"/>
  <path d="M4 7h3v2H4zM14 22h2v2h-2zM25 12h3v2h-3z" fill="#5fd35f" opacity="0.8"/>
  <path d="M8 25h2v2H8zM20 5h3v2h-3z" fill="#1f7a35" opacity="0.75"/>

  <rect x="32" y="0" width="32" height="32" fill="#237a36"/>
  <path d="M38 9h4v2h-4zM51 19h2v2h-2zM58 27h3v2h-3z" fill="#2f9e44" opacity="0.8"/>
  <path d="M45 4h2v3h-2zM56 11h2v2h-2z" fill="#14532d" opacity="0.7"/>

  <rect x="64" y="0" width="32" height="32" fill="#45b85a"/>
  <path d="M70 11h3v2h-3zM80 5h2v2h-2zM89 25h3v2h-3z" fill="#7ee081" opacity="0.9"/>
  <path d="M75 23h2v2h-2zM91 9h2v3h-2z" fill="#2f9e44" opacity="0.75"/>

  <rect x="96" y="0" width="32" height="32" fill="#9a6a37"/>
  <path d="M96 4h32v4H96zM96 17h32v3H96z" fill="#8a5a2b" opacity="0.6"/>
  <path d="M101 12h5v2h-5zM116 25h6v2h-6z" fill="#c08a4b" opacity="0.65"/>

  <rect x="128" y="0" width="32" height="32" fill="#2f9e44"/>
  <path d="M137 11h2v2h-2zM147 22h2v2h-2z" fill="#fff7ad"/>
  <path d="M135 13h6v1h-6zM145 24h6v1h-6z" fill="#7ee081" opacity="0.8"/>
  <path d="M133 5h3v2h-3zM153 9h2v2h-2z" fill="#1f7a35"/>

  <rect x="160" y="0" width="32" height="32" fill="#1d75b8"/>
  <path d="M160 8c8-5 16 5 32 0v5c-9 5-18-4-32 1z" fill="#39a7e8" opacity="0.65"/>
  <path d="M160 22c9-4 18 4 32-1v4c-9 5-20-3-32 1z" fill="#8bd5ff" opacity="0.55"/>
</svg>`);

const playerDefaultSheets: DirectionalSpriteSheetSet = {
  idle: {
    key: "player.default.idle.unarmed.with_shadow",
    src: "/assets/sprites/player/default/Unarmed_Idle_with_shadow.png",
    frameWidth: 64,
    frameHeight: 64,
    columns: 12,
    rows: 4,
    frameCount: 12,
    rowByDirection: { down: 0, left: 1, right: 2, up: 3 },
    frameDurationMs: 150,
  },
  walk: {
    key: "player.default.run.unarmed.with_shadow",
    src: "/assets/sprites/player/default/Unarmed_Run_with_shadow.png",
    frameWidth: 64,
    frameHeight: 64,
    columns: 8,
    rows: 4,
    frameCount: 8,
    rowByDirection: { down: 0, left: 1, right: 2, up: 3 },
    frameDurationMs: 85,
  },
};

export const assetCatalog: AssetCatalog = {
  player: {
    default: playerDefaultSheets,
  },
  creatures: {},
  resources: {},
  buildings: {},
  tilesets: {
    meadow: {
      key: "tileset.meadow.placeholder",
      src: meadowTilesetSrc,
      tileWidth: 32,
      tileHeight: 32,
      columns: 6,
      rows: 1,
      tileIds: {
        grass: 0,
        grass_dark: 1,
        grass_light: 2,
        dirt: 3,
        flower: 4,
        water: 5,
      },
    },
  },
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

export function getTileSet(key = "meadow") {
  return assetCatalog.tilesets[key] ?? assetCatalog.tilesets.meadow;
}

export function getIconAsset(iconKey: string) {
  return assetCatalog.icons[iconKey] ?? null;
}
