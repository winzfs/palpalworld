const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'features', 'game', 'pixi', 'PixiGameCanvas.tsx');
let source = fs.readFileSync(filePath, 'utf8');
let changed = false;

function replaceOnce(search, replacement, label) {
  if (source.includes(replacement)) return;
  if (!source.includes(search)) {
    console.log(`[patch-pixi-render-terrain] skipped ${label}`);
    return;
  }
  source = source.replace(search, replacement);
  changed = true;
  console.log(`[patch-pixi-render-terrain] patched ${label}`);
}

replaceOnce(
  'type PixiBuildingNode = { container: PixiContainer; graphics: PixiGraphics; lastSeenFrame: number };',
  'type PixiBuildingNode = { container: PixiContainer; graphics: PixiGraphics; lastSeenFrame: number };\ntype PixiTerrainNode = { container: PixiContainer; graphics: PixiGraphics; lastSeenFrame: number };',
  'terrain node type after buildings',
);
replaceOnce(
  'type PixiCreatureNode = { container: PixiContainer; graphics: PixiGraphics; lastSeenFrame: number };',
  'type PixiCreatureNode = { container: PixiContainer; graphics: PixiGraphics; lastSeenFrame: number };\ntype PixiTerrainNode = { container: PixiContainer; graphics: PixiGraphics; lastSeenFrame: number };',
  'terrain node type fallback',
);

replaceOnce(
  'const remoteStaleMs = 3500;',
  'const remoteStaleMs = 3500;\nconst terrainTileSize = 32;\nconst terrainPaddingTiles = 3;',
  'terrain constants',
);

replaceOnce(
  'function loadPixiRuntime() {',
  `function hashTerrainTile(x: number, y: number) {
  let value = x * 374761393 + y * 668265263;
  value = (value ^ (value >> 13)) * 1274126177;
  return (value ^ (value >> 16)) >>> 0;
}

function samplePixiTerrainTile(worldTileX: number, worldTileY: number) {
  const riverCenter = Math.sin(worldTileY * 0.11) * 9 + Math.cos(worldTileY * 0.035) * 5;
  const riverDistance = Math.abs(worldTileX - riverCenter);
  if (riverDistance < 2.2) return "water";
  if (riverDistance < 3.2) return "dirt";
  const dirtPath = Math.abs(worldTileY - Math.sin(worldTileX * 0.12) * 6 - 7);
  if (dirtPath < 1.2 && worldTileX > -18 && worldTileX < 42) return "dirt";
  const roll = hashTerrainTile(worldTileX, worldTileY) % 100;
  if (roll < 8) return "grass_dark";
  if (roll < 15) return "grass_light";
  if (roll < 20) return "flower";
  return "grass";
}

function getPixiTerrainColor(tileId: string) {
  if (tileId === "water") return 0x0ea5e9;
  if (tileId === "dirt") return 0x92400e;
  if (tileId === "grass_dark") return 0x166534;
  if (tileId === "grass_light") return 0x4ade80;
  if (tileId === "flower") return 0x22c55e;
  return 0x15803d;
}

function loadPixiRuntime() {`,
  'terrain sample helpers',
);

const terrainUpsertBlock = `function drawPixiTerrainTileAtOrigin(graphics: PixiGraphics, tileX: number, tileY: number) {
  const tileId = samplePixiTerrainTile(tileX, tileY);
  const color = getPixiTerrainColor(tileId);
  graphics.rect(0, 0, terrainTileSize, terrainTileSize);
  graphics.fill({ color, alpha: 1 });
  if (tileId === "flower") {
    const seed = hashTerrainTile(tileX, tileY);
    for (let i = 0; i < 3; i += 1) {
      const px = 7 + ((seed >> (i * 4)) & 15);
      const py = 7 + ((seed >> (i * 5 + 3)) & 15);
      graphics.circle(px, py, 1.6);
      graphics.fill({ color: i % 2 === 0 ? 0xf9a8d4 : 0xfef08a, alpha: 0.8 });
    }
  }
  if (tileId === "water") {
    const waveA = 10 + ((tileX + tileY) % 3);
    const waveB = 22 + ((tileX - tileY) % 2);
    graphics.moveTo(3, waveA);
    graphics.lineTo(29, waveA);
    graphics.moveTo(1, waveB);
    graphics.lineTo(26, waveB);
    graphics.stroke({ width: 1, color: 0xbae6fd, alpha: 0.38 });
  }
}

function upsertPixiTerrainNodes(PIXI: NonNullable<Window["PIXI"]>, terrainLayer: PixiContainer, nodes: Map<string, PixiTerrainNode>, cameraX: number, cameraY: number, width: number, height: number, frameId: number) {
  const startTileX = Math.floor(cameraX / terrainTileSize) - terrainPaddingTiles;
  const startTileY = Math.floor(cameraY / terrainTileSize) - terrainPaddingTiles;
  const endTileX = Math.ceil((cameraX + width) / terrainTileSize) + terrainPaddingTiles;
  const endTileY = Math.ceil((cameraY + height) / terrainTileSize) + terrainPaddingTiles;
  for (let tileY = startTileY; tileY <= endTileY; tileY += 1) {
    for (let tileX = startTileX; tileX <= endTileX; tileX += 1) {
      const key = tileX + ":" + tileY;
      let node = nodes.get(key);
      if (!node) {
        const container = new PIXI.Container();
        const graphics = new PIXI.Graphics();
        container.addChild(graphics as unknown as PixiContainer);
        terrainLayer.addChild(container);
        node = { container, graphics, lastSeenFrame: frameId };
        nodes.set(key, node);
      }
      node.lastSeenFrame = frameId;
      node.container.visible = true;
      node.container.zIndex = -100000 + tileY;
      node.container.position?.set(tileX * terrainTileSize, tileY * terrainTileSize);
      node.graphics.clear();
      drawPixiTerrainTileAtOrigin(node.graphics, tileX, tileY);
    }
  }
  for (const [key, node] of nodes.entries()) {
    if (node.lastSeenFrame === frameId) continue;
    node.container.visible = false;
    terrainLayer.removeChild?.(node.container);
    node.container.destroy?.({ children: true });
    nodes.delete(key);
  }
}

`;

replaceOnce(
  'function upsertPixiBuildingNodes(PIXI: NonNullable<Window["PIXI"]>, buildingLayer: PixiContainer, nodes: Map<string, PixiBuildingNode>, buildings: BuildingState[], frameId: number) {',
  terrainUpsertBlock + 'function upsertPixiBuildingNodes(PIXI: NonNullable<Window["PIXI"]>, buildingLayer: PixiContainer, nodes: Map<string, PixiBuildingNode>, buildings: BuildingState[], frameId: number) {',
  'terrain node upsert before buildings',
);
replaceOnce(
  'function upsertPixiCreatureNodes(PIXI: NonNullable<Window["PIXI"]>, creatureLayer: PixiContainer, nodes: Map<string, PixiCreatureNode>, creatures: CreaturePublicState[], frameId: number) {',
  terrainUpsertBlock + 'function upsertPixiCreatureNodes(PIXI: NonNullable<Window["PIXI"]>, creatureLayer: PixiContainer, nodes: Map<string, PixiCreatureNode>, creatures: CreaturePublicState[], frameId: number) {',
  'terrain node upsert fallback',
);

replaceOnce(
  '  const buildingNodesRef = useRef(new Map<string, PixiBuildingNode>());',
  '  const buildingNodesRef = useRef(new Map<string, PixiBuildingNode>());\n  const terrainNodesRef = useRef(new Map<string, PixiTerrainNode>());',
  'terrain nodes ref after buildings',
);
replaceOnce(
  '  const creatureNodesRef = useRef(new Map<string, PixiCreatureNode>());',
  '  const creatureNodesRef = useRef(new Map<string, PixiCreatureNode>());\n  const terrainNodesRef = useRef(new Map<string, PixiTerrainNode>());',
  'terrain nodes ref fallback',
);

replaceOnce(
  '        const smoothRemotePlayers = updateSmoothedRemotePlayers(remotePlayersRef.current, smoothedRemotePlayersRef.current, now);',
  '        upsertPixiTerrainNodes(PIXI, layers.terrain, terrainNodesRef.current, camera.x, camera.y, host.clientWidth, host.clientHeight, frameId);\n        const smoothRemotePlayers = updateSmoothedRemotePlayers(remotePlayersRef.current, smoothedRemotePlayersRef.current, now);',
  'terrain upsert call',
);

replaceOnce(
  '        for (const node of buildingNodesRef.current.values()) node.container.destroy?.({ children: true });',
  '        for (const node of buildingNodesRef.current.values()) node.container.destroy?.({ children: true });\n        for (const node of terrainNodesRef.current.values()) node.container.destroy?.({ children: true });',
  'terrain cleanup destroy after buildings',
);
replaceOnce(
  '        for (const node of playerNodesRef.current.values()) node.container.destroy?.({ children: true });',
  '        for (const node of playerNodesRef.current.values()) node.container.destroy?.({ children: true });\n        for (const node of terrainNodesRef.current.values()) node.container.destroy?.({ children: true });',
  'terrain cleanup destroy fallback',
);
replaceOnce(
  '        buildingNodesRef.current.clear();',
  '        buildingNodesRef.current.clear();\n        terrainNodesRef.current.clear();',
  'terrain cleanup clear after buildings',
);
replaceOnce(
  '        playerNodesRef.current.clear();',
  '        playerNodesRef.current.clear();\n        terrainNodesRef.current.clear();',
  'terrain cleanup clear fallback',
);

if (changed) fs.writeFileSync(filePath, source);
else console.log('[patch-pixi-render-terrain] no changes');
