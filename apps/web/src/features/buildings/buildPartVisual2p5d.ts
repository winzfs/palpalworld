import { BUILD_GRID_SIZE } from "./buildGrid";
import type { BuildPartCategory, BuildPartDefinition, BuildPartLayer, BuildPartMaterial } from "./buildPartCatalog";

export const BUILD_2P5D_TILE_WIDTH = BUILD_GRID_SIZE;
export const BUILD_2P5D_TILE_HEIGHT = BUILD_GRID_SIZE;
export const BUILD_2P5D_WALL_HEIGHT = 52;
export const BUILD_2P5D_HALF_WALL_HEIGHT = 26;
export const BUILD_2P5D_FLOOR_HEIGHT = 58;
export const BUILD_2P5D_ROOF_RISE = 34;

export type BuildVisualAnchor = "tile" | "front-edge" | "back-edge" | "center" | "corner";
export type BuildVisualLayer = "ground" | "floor" | "structure" | "stairs" | "roof" | "decor" | "overlay";

export type BuildPartVisual2p5d = {
  anchor: BuildVisualAnchor;
  visualLayer: BuildVisualLayer;
  renderHeightPx: number;
  floorYOffsetPx: number;
  shadow: boolean;
  depthBias: number;
};

const layerDepthBias: Record<BuildPartLayer, number> = {
  foundation: -22,
  floor: -14,
  wall: 12,
  object: 28,
  stairs: 24,
  roof: 46,
  decor: 34,
};

const visualLayerOrder: Record<BuildVisualLayer, number> = {
  ground: 0,
  floor: 10,
  structure: 30,
  stairs: 36,
  decor: 44,
  roof: 58,
  overlay: 80,
};

export function getMaterialPalette(material: BuildPartMaterial) {
  if (material === "stone") return {
    base: "#6b7280",
    side: "#4b5563",
    dark: "#374151",
    light: "#a8b0bd",
    face: "#7d8795",
    roof: "#596273",
  };
  if (material === "cloth") return {
    base: "#b45309",
    side: "#92400e",
    dark: "#78350f",
    light: "#fbbf24",
    face: "#d97706",
    roof: "#c2410c",
  };
  if (material === "metal") return {
    base: "#64748b",
    side: "#475569",
    dark: "#334155",
    light: "#cbd5e1",
    face: "#94a3b8",
    roof: "#475569",
  };
  return {
    base: "#8b5a2b",
    side: "#6f411d",
    dark: "#3b2413",
    light: "#d19a55",
    face: "#a96f38",
    roof: "#7c2d12",
  };
}

export function getCategoryVisualLayer(category: BuildPartCategory): BuildVisualLayer {
  if (category === "floor") return "floor";
  if (category === "wall" || category === "door" || category === "window") return "structure";
  if (category === "stairs") return "stairs";
  if (category === "roof") return "roof";
  if (category === "decor" || category === "furniture" || category === "utility") return "decor";
  return "structure";
}

export function getBuildPartVisual2p5d(definition: BuildPartDefinition): BuildPartVisual2p5d {
  const isLowWall = definition.id.includes("half") || definition.id.includes("railing") || definition.id.includes("fence") || definition.id.includes("gate");
  const renderHeightPx =
    definition.category === "wall" || definition.category === "door" || definition.category === "window"
      ? isLowWall ? BUILD_2P5D_HALF_WALL_HEIGHT : BUILD_2P5D_WALL_HEIGHT
      : definition.category === "roof"
        ? BUILD_2P5D_ROOF_RISE
        : definition.category === "stairs"
          ? BUILD_2P5D_WALL_HEIGHT
          : definition.category === "decor" || definition.category === "furniture" || definition.category === "utility"
            ? 36
            : 8;

  return {
    anchor: definition.category === "wall" || definition.category === "door" || definition.category === "window" ? "back-edge" : "tile",
    visualLayer: getCategoryVisualLayer(definition.category),
    renderHeightPx,
    floorYOffsetPx: definition.floorLevel * BUILD_2P5D_FLOOR_HEIGHT,
    shadow: definition.category !== "floor" || definition.layer === "foundation",
    depthBias: layerDepthBias[definition.layer] ?? 0,
  };
}

export function getBuildPartSortKey(definition: BuildPartDefinition, gridX: number, gridY: number, floorLevel: number) {
  const visual = getBuildPartVisual2p5d(definition);
  const layerOrder = visualLayerOrder[visual.visualLayer] ?? 30;
  const floorOrder = floorLevel * 10_000;
  const yOrder = gridY * 200;
  const xOrder = gridX * 0.5;
  return floorOrder + yOrder + xOrder + layerOrder + visual.depthBias;
}
