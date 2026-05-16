const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'features', 'game', 'pixi', 'PixiGameCanvas.tsx');
let source = fs.readFileSync(filePath, 'utf8');
let changed = false;

function replaceOnce(search, replacement, label) {
  if (source.includes(replacement)) return true;
  if (!source.includes(search)) {
    console.log(`[patch-pixi-render-build-parts] skipped ${label}`);
    return false;
  }
  source = source.replace(search, replacement);
  changed = true;
  console.log(`[patch-pixi-render-build-parts] patched ${label}`);
  return true;
}

if (!source.includes('PlacedBuildPart')) {
  replaceOnce(
    'import { createPixiCamera, resizePixiCamera, centerPixiCameraOn } from "./PixiCamera";',
    'import { createPixiCamera, resizePixiCamera, centerPixiCameraOn } from "./PixiCamera";\nimport { BUILD_GRID_SIZE } from "../../buildings/buildGrid";\nimport { BUILD_PARTS, type BuildPartId, type BuildPartRotation, type BuildFloorLevel, type PlacedBuildPart } from "../../buildings/buildPartCatalog";\nimport { buildGridToIsoCenter, getIsoTilePolygon2p5d, getIsoWallPlane2p5d } from "../../buildings/buildProjection2p5d";\nimport { BUILD_2P5D_FLOOR_HEIGHT, getMaterialPalette } from "../../buildings/buildPartVisual2p5d";',
    'build part imports',
  );
}

if (!source.includes('type PixiBuildPartNode =')) {
  replaceOnce(
    'type PixiBuildingNode = { container: PixiContainer; graphics: PixiGraphics; lastSeenFrame: number };',
    'type PixiBuildingNode = { container: PixiContainer; graphics: PixiGraphics; lastSeenFrame: number };\ntype PixiBuildPartNode = { container: PixiContainer; graphics: PixiGraphics; lastSeenFrame: number };\ntype PixiBuildPartPreview = { partId: BuildPartId; position: { x: number; y: number }; gridX?: number; gridY?: number; rotation: BuildPartRotation; floorLevel: BuildFloorLevel; valid: boolean };\ntype PixiBuildPartsState = { parts: PlacedBuildPart[]; selectedPartId?: string | null; selectedHouseId?: string | null; preview?: PixiBuildPartPreview | null };\ntype PixiBuildPartsEvent = CustomEvent<PixiBuildPartsState>;',
    'build part node types',
  );
}

const helpers = `function drawPixiPolygon(graphics: PixiGraphics, points: Array<{ x: number; y: number }>, fillColor: number, fillAlpha: number, strokeColor: number, strokeAlpha = 0.55, strokeWidth = 1) {
  if (points.length === 0) return;
  const [first, ...rest] = points;
  graphics.moveTo(first.x, first.y);
  for (const point of rest) graphics.lineTo(point.x, point.y);
  graphics.lineTo(first.x, first.y);
  graphics.fill({ color: fillColor, alpha: fillAlpha });
  graphics.moveTo(first.x, first.y);
  for (const point of rest) graphics.lineTo(point.x, point.y);
  graphics.lineTo(first.x, first.y);
  graphics.stroke({ width: strokeWidth, color: strokeColor, alpha: strokeAlpha });
}

function getPixiBuildPartPalette(part: PlacedBuildPart) {
  const definition = BUILD_PARTS[part.partId];
  const palette = definition ? getMaterialPalette(definition.material) : null;
  if (!palette) return { base: 0x8b5a2b, light: 0xd6a15d, side: 0x6b3f1d, dark: 0x3f2412 };
  return {
    base: Number.parseInt(palette.base.replace('#', ''), 16),
    light: Number.parseInt(palette.light.replace('#', ''), 16),
    side: Number.parseInt(palette.side.replace('#', ''), 16),
    dark: Number.parseInt(palette.dark.replace('#', ''), 16),
  };
}

function drawPixiIsoFloorPart(graphics: PixiGraphics, part: PlacedBuildPart, preview = false, valid = true) {
  const definition = BUILD_PARTS[part.partId];
  if (!definition) return;
  const palette = getPixiBuildPartPalette(part);
  const width = definition.width * BUILD_GRID_SIZE;
  const height = definition.height * BUILD_GRID_SIZE;
  const visualY = -part.floorLevel * BUILD_2P5D_FLOOR_HEIGHT;
  const points = getIsoTilePolygon2p5d({ x: 0, y: visualY, width, height: height * 0.62 });
  const color = preview ? (valid ? 0x22c55e : 0xef4444) : palette.base;
  graphics.ellipse(0, visualY + 13, width * 0.42, Math.max(5, height * 0.11));
  graphics.fill({ color: 0x000000, alpha: preview ? 0.08 : 0.16 });
  drawPixiPolygon(graphics, points, color, preview ? 0.22 : 0.94, preview ? color : palette.dark, preview ? 0.9 : 0.66, preview ? 2 : 1.2);
  const grooveColor = definition.material === 'stone' ? palette.dark : palette.light;
  for (const t of [0.28, 0.5, 0.72]) {
    const left = { x: points[3].x + (points[2].x - points[3].x) * t, y: points[3].y + (points[2].y - points[3].y) * t };
    const right = { x: points[0].x + (points[1].x - points[0].x) * t, y: points[0].y + (points[1].y - points[0].y) * t };
    graphics.moveTo(left.x, left.y);
    graphics.lineTo(right.x, right.y);
  }
  graphics.stroke({ width: 1, color: grooveColor, alpha: preview ? 0.18 : 0.28 });
}

function drawPixiIsoWallPart(graphics: PixiGraphics, part: PlacedBuildPart, preview = false, valid = true) {
  const definition = BUILD_PARTS[part.partId];
  if (!definition) return;
  const palette = getPixiBuildPartPalette(part);
  const width = definition.width * BUILD_GRID_SIZE;
  const height = definition.height * BUILD_GRID_SIZE;
  const wallHeight = definition.id.includes('half') || definition.id.includes('railing') || definition.id.includes('fence') || definition.id.includes('gate') ? 34 : 72;
  const visualY = -part.floorLevel * BUILD_2P5D_FLOOR_HEIGHT;
  const plane = getIsoWallPlane2p5d({ x: 0, y: visualY, width, height, rotation: part.rotation, wallHeight });
  const color = preview ? (valid ? 0x22c55e : 0xef4444) : palette.side;
  graphics.ellipse(0, visualY + 18, width * 0.36, 7);
  graphics.fill({ color: 0x000000, alpha: preview ? 0.07 : 0.15 });
  drawPixiPolygon(graphics, [plane.baseStart, plane.baseEnd, plane.topEnd, plane.topStart], color, preview ? 0.25 : 0.92, preview ? color : palette.dark, preview ? 0.95 : 0.72, preview ? 2 : 1.2);
  graphics.moveTo(plane.baseStart.x, plane.baseStart.y);
  graphics.lineTo(plane.baseEnd.x, plane.baseEnd.y);
  graphics.stroke({ width: 2, color: preview ? color : palette.dark, alpha: 0.75 });
  if (definition.category === 'door') {
    const mx = (plane.baseStart.x + plane.baseEnd.x) / 2;
    const my = (plane.baseStart.y + plane.baseEnd.y) / 2;
    graphics.roundRect(mx - 8, my - wallHeight * 0.68, 16, wallHeight * 0.62, 3);
    graphics.fill({ color: palette.dark, alpha: 0.62 });
  }
  if (definition.category === 'window') {
    const mx = (plane.baseStart.x + plane.baseEnd.x) / 2;
    const my = (plane.baseStart.y + plane.baseEnd.y) / 2;
    graphics.roundRect(mx - 10, my - wallHeight * 0.62, 20, 14, 3);
    graphics.fill({ color: 0xbae6fd, alpha: 0.62 });
  }
}

function drawPixiIsoRoofPart(graphics: PixiGraphics, part: PlacedBuildPart, preview = false, valid = true) {
  const definition = BUILD_PARTS[part.partId];
  if (!definition) return;
  const palette = getPixiBuildPartPalette(part);
  const width = definition.width * BUILD_GRID_SIZE;
  const height = definition.height * BUILD_GRID_SIZE;
  const visualY = -part.floorLevel * BUILD_2P5D_FLOOR_HEIGHT - 48;
  const points = getIsoTilePolygon2p5d({ x: 0, y: visualY, width, height: height * 0.62 });
  const color = preview ? (valid ? 0x22c55e : 0xef4444) : palette.dark;
  drawPixiPolygon(graphics, points, color, preview ? 0.25 : 0.94, preview ? color : palette.light, preview ? 0.9 : 0.55, preview ? 2 : 1.2);
}

function drawPixiBuildPartAtOrigin(graphics: PixiGraphics, part: PlacedBuildPart, options?: { preview?: boolean; valid?: boolean; selected?: boolean; houseSelected?: boolean }) {
  const definition = BUILD_PARTS[part.partId];
  if (!definition) return;
  const preview = options?.preview ?? false;
  const valid = options?.valid ?? true;
  if (definition.category === 'wall' || definition.category === 'door' || definition.category === 'window') drawPixiIsoWallPart(graphics, part, preview, valid);
  else if (definition.category === 'roof') drawPixiIsoRoofPart(graphics, part, preview, valid);
  else drawPixiIsoFloorPart(graphics, part, preview, valid);
  if (options?.selected || options?.houseSelected) {
    const accent = options.selected ? 0xfacc15 : 0x60a5fa;
    const width = definition.width * BUILD_GRID_SIZE;
    const height = definition.height * BUILD_GRID_SIZE;
    const visualY = -part.floorLevel * BUILD_2P5D_FLOOR_HEIGHT;
    const outline = getIsoTilePolygon2p5d({ x: 0, y: visualY, width, height: height * 0.62 });
    drawPixiPolygon(graphics, outline, accent, options.selected ? 0.08 : 0.03, accent, options.selected ? 0.92 : 0.48, options.selected ? 3 : 1.5);
  }
}

function upsertPixiBuildPartNodes(PIXI: NonNullable<Window['PIXI']>, layer: PixiContainer, nodes: Map<string, PixiBuildPartNode>, state: PixiBuildPartsState, frameId: number) {
  const parts = state.parts ?? [];
  for (const part of parts) {
    const definition = BUILD_PARTS[part.partId];
    if (!definition) continue;
    let node = nodes.get(part.id);
    if (!node) {
      const container = new PIXI.Container();
      const graphics = new PIXI.Graphics();
      container.addChild(graphics as unknown as PixiContainer);
      layer.addChild(container);
      node = { container, graphics, lastSeenFrame: frameId };
      nodes.set(part.id, node);
    }
    const iso = buildGridToIsoCenter(part.gridX, part.gridY);
    node.lastSeenFrame = frameId;
    node.container.visible = true;
    node.container.zIndex = iso.y + part.floorLevel * 96 + (definition.layer === 'roof' ? 48 : definition.layer === 'wall' ? 24 : 0);
    node.container.position?.set(iso.x, iso.y);
    node.graphics.clear();
    drawPixiBuildPartAtOrigin(node.graphics, part, { selected: state.selectedPartId === part.id, houseSelected: Boolean(state.selectedHouseId && part.houseId === state.selectedHouseId) });
  }

  if (state.preview) {
    const previewId = '__preview_build_part__';
    const preview = state.preview;
    const gridX = typeof preview.gridX === 'number' ? preview.gridX : Math.round(preview.position.x / BUILD_GRID_SIZE);
    const gridY = typeof preview.gridY === 'number' ? preview.gridY : Math.round(preview.position.y / BUILD_GRID_SIZE);
    const previewPart: PlacedBuildPart = { id: previewId, partId: preview.partId, ownerPlayerId: 'preview', regionId: 'preview', tileX: 0, tileY: 0, gridX, gridY, floorLevel: preview.floorLevel, rotation: preview.rotation, hp: 1, maxHp: 1, createdAt: 0, updatedAt: 0 };
    let node = nodes.get(previewId);
    if (!node) {
      const container = new PIXI.Container();
      const graphics = new PIXI.Graphics();
      container.addChild(graphics as unknown as PixiContainer);
      layer.addChild(container);
      node = { container, graphics, lastSeenFrame: frameId };
      nodes.set(previewId, node);
    }
    const iso = buildGridToIsoCenter(previewPart.gridX, previewPart.gridY);
    node.lastSeenFrame = frameId;
    node.container.visible = true;
    node.container.zIndex = iso.y + 96;
    node.container.position?.set(iso.x, iso.y);
    node.graphics.clear();
    drawPixiBuildPartAtOrigin(node.graphics, previewPart, { preview: true, valid: preview.valid });
  }

  for (const [key, node] of nodes.entries()) {
    if (node.lastSeenFrame === frameId) continue;
    node.container.visible = false;
    layer.removeChild?.(node.container);
    node.container.destroy?.({ children: true });
    nodes.delete(key);
  }
}

`;

if (!source.includes('function drawPixiBuildPartAtOrigin(')) {
  replaceOnce(
    'function upsertPixiBuildingNodes(PIXI: NonNullable<Window["PIXI"]>, buildingLayer: PixiContainer, nodes: Map<string, PixiBuildingNode>, buildings: BuildingState[], frameId: number) {',
    helpers + 'function upsertPixiBuildingNodes(PIXI: NonNullable<Window["PIXI"]>, buildingLayer: PixiContainer, nodes: Map<string, PixiBuildingNode>, buildings: BuildingState[], frameId: number) {',
    'build part helpers before buildings',
  );
}

if (!source.includes('const buildPartNodesRef = useRef(new Map<string, PixiBuildPartNode>());')) {
  replaceOnce(
    '  const buildingNodesRef = useRef(new Map<string, PixiBuildingNode>());',
    '  const buildingNodesRef = useRef(new Map<string, PixiBuildingNode>());\n  const buildPartNodesRef = useRef(new Map<string, PixiBuildPartNode>());\n  const buildPartsStateRef = useRef<PixiBuildPartsState>({ parts: [] });',
    'build part refs',
  );
}

if (!source.includes('palpalworld:pixi-build-parts')) {
  replaceOnce(
    `  useEffect(() => {\n    const handleRemoteBuildings = (event: Event) => {`,
    `  useEffect(() => {\n    const handlePixiBuildParts = (event: Event) => {\n      const customEvent = event as PixiBuildPartsEvent;\n      buildPartsStateRef.current = customEvent.detail ?? { parts: [] };\n    };\n    window.addEventListener("palpalworld:pixi-build-parts", handlePixiBuildParts);\n    return () => window.removeEventListener("palpalworld:pixi-build-parts", handlePixiBuildParts);\n  }, []);\n\n  useEffect(() => {\n    const handleRemoteBuildings = (event: Event) => {`,
    'build part listener',
  );
}

if (!source.includes('upsertPixiBuildPartNodes(PIXI, layers.buildingsBack')) {
  replaceOnce(
    '        upsertPixiBuildingNodes(PIXI, layers.buildingsBack, buildingNodesRef.current, drawableBuildings, frameId);',
    '        upsertPixiBuildingNodes(PIXI, layers.buildingsBack, buildingNodesRef.current, drawableBuildings, frameId);\n        upsertPixiBuildPartNodes(PIXI, layers.buildingsBack, buildPartNodesRef.current, buildPartsStateRef.current, frameId);',
    'build part upsert call',
  );
}

if (!source.includes('for (const node of buildPartNodesRef.current.values())')) {
  replaceOnce(
    '        for (const node of buildingNodesRef.current.values()) node.container.destroy?.({ children: true });',
    '        for (const node of buildingNodesRef.current.values()) node.container.destroy?.({ children: true });\n        for (const node of buildPartNodesRef.current.values()) node.container.destroy?.({ children: true });',
    'build part cleanup destroy',
  );
}
if (!source.includes('buildPartNodesRef.current.clear();')) {
  replaceOnce(
    '        buildingNodesRef.current.clear();',
    '        buildingNodesRef.current.clear();\n        buildPartNodesRef.current.clear();\n        buildPartsStateRef.current = { parts: [] };',
    'build part cleanup clear',
  );
}

if (changed) fs.writeFileSync(filePath, source);
else console.log('[patch-pixi-render-build-parts] no changes');
