import type { AssetCatalog, DirectionalSpriteSheetSet, SpriteAsset } from "./assetTypes";

function svgDataUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function makeSprite(key: string, src: string, width = 64, height = 64): SpriteAsset {
  return { key, src, width, height };
}

function playerFrameSvg(frameX: number, frameY: number, direction: "down" | "left" | "right" | "up", frame: number, action: "idle" | "run") {
  const ox = frameX * 64;
  const oy = frameY * 64;
  const bob = action === "run" ? (frame % 2 === 0 ? 1 : -1) : frame % 6 === 0 ? -1 : 0;
  const step = action === "run" ? (frame % 4 < 2 ? -2 : 2) : 0;
  const faceOffset = direction === "left" ? -2 : direction === "right" ? 2 : 0;
  const hair = direction === "up" ? "#111827" : "#1f2937";
  const skin = "#f8c7a1";
  const shirt = "#2563eb";
  const vest = "#1e40af";
  const pants = "#334155";
  const boot = "#111827";
  const scarf = "#ef4444";
  return `
    <g transform="translate(${ox} ${oy})" shape-rendering="crispEdges">
      <ellipse cx="32" cy="55" rx="15" ry="4" fill="rgba(0,0,0,.32)"/>
      <rect x="23" y="20" width="18" height="20" fill="#0f172a"/>
      <rect x="25" y="18" width="14" height="17" fill="${shirt}"/>
      <rect x="27" y="20" width="10" height="15" fill="${vest}"/>
      <rect x="22" y="22" width="5" height="14" fill="${shirt}"/>
      <rect x="37" y="22" width="5" height="14" fill="${shirt}"/>
      <rect x="21" y="34" width="7" height="5" fill="${skin}"/>
      <rect x="36" y="34" width="7" height="5" fill="${skin}"/>
      <rect x="25" y="38" width="6" height="12" fill="${pants}"/>
      <rect x="33" y="38" width="6" height="12" fill="${pants}"/>
      <rect x="24" y="49" width="7" height="4" fill="${boot}"/>
      <rect x="33" y="49" width="7" height="4" fill="${boot}"/>
      <rect x="${25 + step}" y="38" width="6" height="12" fill="${pants}"/>
      <rect x="${33 - step}" y="38" width="6" height="12" fill="${pants}"/>
      <rect x="${24 + step}" y="49" width="7" height="4" fill="${boot}"/>
      <rect x="${33 - step}" y="49" width="7" height="4" fill="${boot}"/>
      <rect x="24" y="9" width="16" height="15" fill="${skin}"/>
      <rect x="22" y="7" width="20" height="8" fill="${hair}"/>
      <rect x="22" y="13" width="4" height="7" fill="${hair}"/>
      <rect x="38" y="13" width="4" height="7" fill="${hair}"/>
      <rect x="${27 + faceOffset}" y="16" width="3" height="3" fill="#111827"/>
      <rect x="${35 + faceOffset}" y="16" width="3" height="3" fill="#111827"/>
      <rect x="31" y="21" width="5" height="2" fill="#b45309"/>
      <rect x="24" y="25" width="16" height="4" fill="${scarf}"/>
      <rect x="38" y="27" width="7" height="3" fill="${scarf}"/>
      <rect x="28" y="11" width="9" height="3" fill="rgba(255,255,255,.18)"/>
      <rect x="26" y="18" width="3" height="2" fill="rgba(255,255,255,.28)"/>
    </g>`;
}

function playerSheetSvg(action: "idle" | "run", columns: number, rows = 4) {
  const directions = ["down", "left", "right", "up"] as const;
  const frames = Array.from({ length: rows }, (_, row) =>
    Array.from({ length: columns }, (_, column) => playerFrameSvg(column, row, directions[row], column, action)).join(""),
  ).join("");
  return svgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="${columns * 64}" height="${rows * 64}" viewBox="0 0 ${columns * 64} ${rows * 64}" shape-rendering="crispEdges">${frames}</svg>`);
}

function itemIconSvg(label: string, color: string, accent = "#fff7ad") {
  return svgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" shape-rendering="crispEdges"><rect width="32" height="32" rx="4" fill="#171421"/><rect x="3" y="3" width="26" height="26" rx="3" fill="${color}"/><rect x="5" y="5" width="22" height="7" fill="rgba(255,255,255,0.22)"/><rect x="7" y="18" width="18" height="5" fill="rgba(0,0,0,0.22)"/><text x="16" y="21" fill="${accent}" font-family="monospace" font-size="8" font-weight="900" text-anchor="middle">${label}</text></svg>`);
}

function buildingSvg(kind: string, main: string, roof: string, accent = "#facc15") {
  const extra: Record<string, string> = {
    workbench: `<rect x="14" y="38" width="36" height="7" fill="#7c4a23"/><rect x="18" y="45" width="5" height="9" fill="#4a2d18"/><rect x="42" y="45" width="5" height="9" fill="#4a2d18"/><rect x="22" y="31" width="20" height="6" fill="#c084fc"/>`,
    base_core: `<circle cx="32" cy="31" r="14" fill="${accent}"/><rect x="27" y="12" width="10" height="38" fill="rgba(255,255,255,0.25)"/><rect x="20" y="27" width="24" height="8" fill="rgba(0,0,0,0.28)"/>`,
    storage_box: `<rect x="14" y="25" width="36" height="28" fill="${main}"/><rect x="14" y="25" width="36" height="8" fill="${roof}"/><rect x="29" y="35" width="6" height="7" fill="${accent}"/>`,
    campfire: `<rect x="18" y="43" width="28" height="6" fill="#7c4a23"/><rect x="23" y="37" width="18" height="5" fill="#7c4a23"/><path d="M32 18 L41 39 H23 Z" fill="#ef4444"/><path d="M32 24 L37 39 H27 Z" fill="#facc15"/>`,
    pal_bed: `<rect x="13" y="32" width="40" height="18" fill="${main}"/><rect x="15" y="27" width="14" height="10" fill="#e0f2fe"/><rect x="28" y="35" width="22" height="10" fill="${roof}"/>`,
    farm_plot: `<rect x="9" y="25" width="46" height="28" fill="#8a5a2b"/><path d="M13 31h38M13 38h38M13 45h38" stroke="#c08a4b" stroke-width="2"/><rect x="19" y="20" width="4" height="8" fill="#22c55e"/><rect x="36" y="18" width="4" height="10" fill="#22c55e"/>`,
    wood_floor: `<rect x="8" y="24" width="48" height="28" fill="#8a5a2b"/><path d="M8 31h48M8 40h48M20 24v28M38 24v28" stroke="#5b3516" stroke-width="2"/>`,
    wood_wall: `<rect x="12" y="12" width="40" height="42" fill="#7c4a23"/><path d="M12 22h40M12 34h40M12 46h40M24 12v42M40 12v42" stroke="#4a2d18" stroke-width="2"/>`,
    furnace: `<rect x="15" y="20" width="34" height="34" rx="4" fill="#57534e"/><rect x="20" y="12" width="24" height="12" fill="#78716c"/><rect x="23" y="35" width="18" height="13" fill="#111827"/><rect x="27" y="39" width="10" height="8" fill="#f97316"/>`,
    advanced_workbench: `<rect x="9" y="35" width="46" height="11" fill="#7c4a23"/><rect x="13" y="25" width="38" height="10" fill="#475569"/><rect x="18" y="46" width="5" height="9" fill="#4a2d18"/><rect x="43" y="46" width="5" height="9" fill="#4a2d18"/><rect x="25" y="18" width="16" height="7" fill="#38bdf8"/>`,
    kitchen: `<rect x="14" y="18" width="36" height="36" fill="#a16207"/><rect x="18" y="27" width="12" height="9" fill="#111827"/><rect x="34" y="27" width="10" height="10" fill="#e5e7eb"/><rect x="22" y="41" width="20" height="4" fill="#f97316"/>`,
    guard_tower: `<rect x="22" y="22" width="20" height="32" fill="#7c4a23"/><rect x="15" y="14" width="34" height="13" fill="#57534e"/><path d="M12 14h40l-6-7H18z" fill="${roof}"/><rect x="29" y="31" width="7" height="11" fill="#111827"/>`,
    assembly_bench: `<rect x="10" y="38" width="44" height="10" fill="#475569"/><rect x="14" y="24" width="36" height="14" fill="#64748b"/><circle cx="24" cy="31" r="5" fill="#38bdf8"/><rect x="36" y="27" width="8" height="8" fill="#facc15"/>`,
    power_generator: `<rect x="15" y="20" width="34" height="34" rx="4" fill="#1e293b"/><circle cx="32" cy="37" r="11" fill="#0f172a"/><path d="M33 22l-10 18h8l-2 13 11-20h-8z" fill="#facc15"/>`,
    cold_storage: `<rect x="16" y="13" width="32" height="42" rx="4" fill="#bae6fd"/><rect x="20" y="17" width="24" height="14" fill="#38bdf8"/><path d="M25 40h14M32 33v14M27 35l10 10M37 35L27 45" stroke="#e0f2fe" stroke-width="2"/>`,
  };
  return svgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" shape-rendering="crispEdges"><ellipse cx="32" cy="55" rx="22" ry="6" fill="rgba(0,0,0,0.35)"/><rect x="12" y="21" width="40" height="31" rx="3" fill="${main}"/><path d="M9 23h46L47 12H17z" fill="${roof}"/><rect x="18" y="32" width="10" height="20" fill="rgba(0,0,0,0.24)"/><rect x="36" y="30" width="9" height="9" fill="${accent}" opacity="0.7"/>${extra[kind] ?? ""}</svg>`);
}

const meadowTilesetSrc = svgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="192" height="32" viewBox="0 0 192 32" shape-rendering="crispEdges"><rect x="0" y="0" width="32" height="32" fill="#2f9e44"/><path d="M4 7h3v2H4zM14 22h2v2h-2zM25 12h3v2h-3z" fill="#5fd35f" opacity="0.8"/><path d="M8 25h2v2H8zM20 5h3v2h-3z" fill="#1f7a35" opacity="0.75"/><rect x="32" y="0" width="32" height="32" fill="#237a36"/><path d="M38 9h4v2h-4zM51 19h2v2h-2zM58 27h3v2h-3z" fill="#2f9e44" opacity="0.8"/><path d="M45 4h2v3h-2zM56 11h2v2h-2z" fill="#14532d" opacity="0.7"/><rect x="64" y="0" width="32" height="32" fill="#45b85a"/><path d="M70 11h3v2h-3zM80 5h2v2h-2zM89 25h3v2h-3z" fill="#7ee081" opacity="0.9"/><path d="M75 23h2v2h-2zM91 9h2v3h-2z" fill="#2f9e44" opacity="0.75"/><rect x="96" y="0" width="32" height="32" fill="#9a6a37"/><path d="M96 4h32v4H96zM96 17h32v3H96z" fill="#8a5a2b" opacity="0.6"/><path d="M101 12h5v2h-5zM116 25h6v2h-6z" fill="#c08a4b" opacity="0.65"/><rect x="128" y="0" width="32" height="32" fill="#2f9e44"/><path d="M137 11h2v2h-2zM147 22h2v2h-2z" fill="#fff7ad"/><path d="M135 13h6v1h-6zM145 24h6v1h-6z" fill="#7ee081" opacity="0.8"/><path d="M133 5h3v2h-3zM153 9h2v2h-2z" fill="#1f7a35"/><rect x="160" y="0" width="32" height="32" fill="#1d75b8"/><path d="M160 8c8-5 16 5 32 0v5c-9 5-18-4-32 1z" fill="#39a7e8" opacity="0.65"/><path d="M160 22c9-4 18 4 32-1v4c-9 5-20-3-32 1z" fill="#8bd5ff" opacity="0.55"/></svg>`);

const playerDefaultSheets: DirectionalSpriteSheetSet = {
  idle: { key: "player.default.idle.embedded", src: playerSheetSvg("idle", 12), frameWidth: 64, frameHeight: 64, columns: 12, rows: 4, frameCount: 12, rowByDirection: { down: 0, left: 1, right: 2, up: 3 }, frameDurationMs: 150 },
  walk: { key: "player.default.run.embedded", src: playerSheetSvg("run", 8), frameWidth: 64, frameHeight: 64, columns: 8, rows: 4, frameCount: 8, rowByDirection: { down: 0, left: 1, right: 2, up: 3 }, frameDurationMs: 85 },
};

const buildingSprites = {
  workbench: makeSprite("building.workbench.placeholder", buildingSvg("workbench", "#8a5a2b", "#c08457")), base_core: makeSprite("building.base_core.placeholder", buildingSvg("base_core", "#4338ca", "#7c3aed", "#facc15")), storage_box: makeSprite("building.storage_box.placeholder", buildingSvg("storage_box", "#7c4a23", "#a16207")), campfire: makeSprite("building.campfire.placeholder", buildingSvg("campfire", "#3f2a1d", "#7c2d12")), pal_bed: makeSprite("building.pal_bed.placeholder", buildingSvg("pal_bed", "#2563eb", "#60a5fa")), farm_plot: makeSprite("building.farm_plot.placeholder", buildingSvg("farm_plot", "#8a5a2b", "#65a30d")), wood_floor: makeSprite("building.wood_floor.placeholder", buildingSvg("wood_floor", "#8a5a2b", "#a16207")), wood_wall: makeSprite("building.wood_wall.placeholder", buildingSvg("wood_wall", "#7c4a23", "#4a2d18")), furnace: makeSprite("building.furnace.placeholder", buildingSvg("furnace", "#57534e", "#78716c", "#f97316")), advanced_workbench: makeSprite("building.advanced_workbench.placeholder", buildingSvg("advanced_workbench", "#475569", "#94a3b8", "#38bdf8")), kitchen: makeSprite("building.kitchen.placeholder", buildingSvg("kitchen", "#a16207", "#f97316")), guard_tower: makeSprite("building.guard_tower.placeholder", buildingSvg("guard_tower", "#7c4a23", "#52525b")), assembly_bench: makeSprite("building.assembly_bench.placeholder", buildingSvg("assembly_bench", "#475569", "#0f172a", "#38bdf8")), power_generator: makeSprite("building.power_generator.placeholder", buildingSvg("power_generator", "#1e293b", "#334155", "#facc15")), cold_storage: makeSprite("building.cold_storage.placeholder", buildingSvg("cold_storage", "#bae6fd", "#38bdf8", "#e0f2fe")),
};

const iconPalette: Record<string, [string, string]> = { wood: ["#8a5a2b", "WOOD"], hardwood: ["#5b3516", "HARD"], stone: ["#71717a", "STON"], fiber: ["#16a34a", "FIB"], ore: ["#475569", "ORE"], coal: ["#27272a", "COAL"], berry: ["#dc2626", "BERRY"], herb: ["#22c55e", "HERB"], ice_crystal: ["#38bdf8", "ICE"], ember_shard: ["#f97316", "FIRE"], spark_core: ["#facc15", "SPRK"], pal_essence: ["#8b5cf6", "PAL"], leaf_pelt: ["#65a30d", "PELT"], water_jelly: ["#06b6d4", "JEL"], capture_orb: ["#ef4444", "ORB"], improved_capture_orb: ["#a855f7", "ORB+"], workbench_kit: ["#a16207", "KIT"], base_core_kit: ["#4f46e5", "CORE"], basic_axe: ["#92400e", "AXE"], basic_pickaxe: ["#64748b", "PICK"], basic_sickle: ["#16a34a", "SIC"], training_sword: ["#94a3b8", "SWD"], iron_sword: ["#e5e7eb", "IRON"], explorer_jacket: ["#2563eb", "JKT"], leather_boots: ["#78350f", "BOOT"], cooked_berry: ["#b91c1c", "COOK"], healing_salve: ["#10b981", "HEAL"], ingot: ["#9ca3af", "ING"], refined_ingot: ["#d1d5db", "REF"], thermal_jacket: ["#ea580c", "HEAT"], cooling_charm: ["#0ea5e9", "COOL"], pal_work_harness: ["#7c3aed", "HRNS"], leafbun_saddle: ["#65a30d", "SAD"], mossboar_saddle: ["#854d0e", "SAD"], frosthorn_saddle: ["#38bdf8", "SAD"] };

const icons = Object.fromEntries(Object.entries(iconPalette).map(([itemId, [color, label]]) => [itemId, makeSprite(`icon.${itemId}.placeholder`, itemIconSvg(label, color), 32, 32)]));

export const assetCatalog: AssetCatalog = { player: { default: playerDefaultSheets }, creatures: {}, resources: {}, buildings: Object.fromEntries(Object.entries(buildingSprites).map(([type, idle]) => [type, { idle }])), tilesets: { meadow: { key: "tileset.meadow.placeholder", src: meadowTilesetSrc, tileWidth: 32, tileHeight: 32, columns: 6, rows: 1, tileIds: { grass: 0, grass_dark: 1, grass_light: 2, dirt: 3, flower: 4, water: 5 } } }, icons };

export function getPlayerSpriteSet() { return assetCatalog.player.default; }
export function getCreatureSpriteSet(speciesId: string) { return assetCatalog.creatures[speciesId] ?? null; }
export function getResourceSpriteSet(resourceType: string) { return assetCatalog.resources[resourceType] ?? null; }
export function getBuildingSpriteSet(buildingType: string) { return assetCatalog.buildings[buildingType] ?? null; }
export function getTileSet(key = "meadow") { return assetCatalog.tilesets[key] ?? assetCatalog.tilesets.meadow; }
export function getIconAsset(iconKey: string) { return assetCatalog.icons[iconKey] ?? null; }
