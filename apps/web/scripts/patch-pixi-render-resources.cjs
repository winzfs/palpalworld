const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'features', 'game', 'pixi', 'PixiGameCanvas.tsx');
let source = fs.readFileSync(filePath, 'utf8');
let changed = false;

function replaceOnce(search, replacement, label) {
  if (source.includes(replacement)) return;
  if (!source.includes(search)) {
    console.log(`[patch-pixi-render-resources] skipped ${label}`);
    return;
  }
  source = source.replace(search, replacement);
  changed = true;
  console.log(`[patch-pixi-render-resources] patched ${label}`);
}

replaceOnce(
  'import type { CreaturePublicState, Direction, PlayerPublicState, WorldSnapshot } from "@palpalworld/shared";',
  'import type { CreaturePublicState, Direction, PlayerPublicState, ResourceNodeState, WorldSnapshot } from "@palpalworld/shared";',
  'ResourceNodeState import',
);

replaceOnce(
  'type PixiCreatureNode = { container: PixiContainer; graphics: PixiGraphics; lastSeenFrame: number };',
  'type PixiCreatureNode = { container: PixiContainer; graphics: PixiGraphics; lastSeenFrame: number };\ntype PixiResourceNode = { container: PixiContainer; graphics: PixiGraphics; lastSeenFrame: number };',
  'resource node type',
);

replaceOnce(
  `function getDirectionOffset(direction: Direction | undefined) {`,
  `function getResourcePalette(resource: ResourceNodeState) {
  const raw = String((resource as ResourceNodeState & { type?: string; resourceType?: string }).type ?? (resource as ResourceNodeState & { resourceType?: string }).resourceType ?? resource.id);
  if (raw.includes("stone") || raw.includes("rock") || raw.includes("ore")) return { body: 0x94a3b8, accent: 0x475569, leaf: 0xcbd5e1 };
  if (raw.includes("berry") || raw.includes("food")) return { body: 0x16a34a, accent: 0xdc2626, leaf: 0x86efac };
  if (raw.includes("wood") || raw.includes("tree")) return { body: 0x92400e, accent: 0x166534, leaf: 0x22c55e };
  if (raw.includes("fiber") || raw.includes("grass")) return { body: 0x65a30d, accent: 0x365314, leaf: 0xa3e635 };
  return { body: 0x15803d, accent: 0x854d0e, leaf: 0x86efac };
}

function getDirectionOffset(direction: Direction | undefined) {`,
  'resource palette helper',
);

replaceOnce(
  `function drawPixiNightLighting(graphics: PixiGraphics, width: number, height: number, cameraX: number, cameraY: number, drawablePlayers: DrawablePlayer[]) {`,
  `function drawPixiResourceAtOrigin(graphics: PixiGraphics, resource: ResourceNodeState) {
  const palette = getResourcePalette(resource);
  const remaining = Math.max(0, (resource as ResourceNodeState & { remainingAmount?: number }).remainingAmount ?? 1);
  const maxAmount = Math.max(1, (resource as ResourceNodeState & { maxAmount?: number }).maxAmount ?? remaining);
  const ratio = Math.max(0.18, Math.min(1, remaining / maxAmount));
  const sway = Math.sin(Date.now() / 420 + resource.position.x * 0.01) * 1.2;

  graphics.ellipse(0, 18, 20, 7);
  graphics.fill({ color: 0x000000, alpha: 0.18 });
  graphics.roundRect(-7, -6, 14, 29, 5);
  graphics.fill({ color: palette.body, alpha: 0.92 * ratio });
  graphics.circle(-10 + sway, -12, 12);
  graphics.circle(2 + sway, -18, 14);
  graphics.circle(13 + sway, -8, 11);
  graphics.fill({ color: palette.leaf, alpha: 0.82 * ratio });
  graphics.circle(-5, -3, 5);
  graphics.circle(8, -1, 4);
  graphics.fill({ color: palette.accent, alpha: 0.72 * ratio });
  graphics.roundRect(-18, 29, 36, 5, 3);
  graphics.fill({ color: 0x052e16, alpha: 0.72 });
  graphics.roundRect(-18, 29, 36 * ratio, 5, 3);
  graphics.fill({ color: 0x84cc16, alpha: 0.86 });
}

function drawPixiNightLighting(graphics: PixiGraphics, width: number, height: number, cameraX: number, cameraY: number, drawablePlayers: DrawablePlayer[]) {`,
  'resource draw helper',
);

replaceOnce(
  `function upsertPixiCreatureNodes(PIXI: NonNullable<Window["PIXI"]>, creatureLayer: PixiContainer, nodes: Map<string, PixiCreatureNode>, creatures: CreaturePublicState[], frameId: number) {`,
  `function upsertPixiResourceNodes(PIXI: NonNullable<Window["PIXI"]>, resourceLayer: PixiContainer, nodes: Map<string, PixiResourceNode>, resources: ResourceNodeState[], frameId: number) {
  for (const resource of resources) {
    let node = nodes.get(resource.id);
    if (!node) {
      const container = new PIXI.Container();
      const graphics = new PIXI.Graphics();
      container.addChild(graphics as unknown as PixiContainer);
      resourceLayer.addChild(container);
      node = { container, graphics, lastSeenFrame: frameId };
      nodes.set(resource.id, node);
    }
    node.lastSeenFrame = frameId;
    node.container.visible = true;
    node.container.zIndex = resource.position.y - 12;
    node.container.position?.set(resource.position.x, resource.position.y);
    node.graphics.clear();
    drawPixiResourceAtOrigin(node.graphics, resource);
  }
  for (const [key, node] of nodes.entries()) {
    if (node.lastSeenFrame === frameId) continue;
    node.container.visible = false;
    resourceLayer.removeChild?.(node.container);
    node.container.destroy?.({ children: true });
    nodes.delete(key);
  }
}

function upsertPixiCreatureNodes(PIXI: NonNullable<Window["PIXI"]>, creatureLayer: PixiContainer, nodes: Map<string, PixiCreatureNode>, creatures: CreaturePublicState[], frameId: number) {`,
  'resource node upsert',
);

replaceOnce(
  '  const creatureNodesRef = useRef(new Map<string, PixiCreatureNode>());',
  '  const creatureNodesRef = useRef(new Map<string, PixiCreatureNode>());\n  const resourceNodesRef = useRef(new Map<string, PixiResourceNode>());',
  'resource nodes ref',
);

replaceOnce(
  '        const drawableCreatures = (currentSnapshot?.creatures ?? []).filter((creature) => creature.hp > 0);',
  '        const drawableCreatures = (currentSnapshot?.creatures ?? []).filter((creature) => creature.hp > 0);\n        const drawableResources = (currentSnapshot?.resources ?? []).filter((resource) => ((resource as ResourceNodeState & { remainingAmount?: number }).remainingAmount ?? 1) > 0);',
  'drawable resources list',
);

replaceOnce(
  '        upsertPixiCreatureNodes(PIXI, layers.creatures, creatureNodesRef.current, drawableCreatures, frameId);',
  '        upsertPixiResourceNodes(PIXI, layers.resources, resourceNodesRef.current, drawableResources, frameId);\n        upsertPixiCreatureNodes(PIXI, layers.creatures, creatureNodesRef.current, drawableCreatures, frameId);',
  'resource upsert call',
);

replaceOnce(
  '        for (const node of creatureNodesRef.current.values()) node.container.destroy?.({ children: true });',
  '        for (const node of creatureNodesRef.current.values()) node.container.destroy?.({ children: true });\n        for (const node of resourceNodesRef.current.values()) node.container.destroy?.({ children: true });',
  'resource cleanup destroy',
);

replaceOnce(
  '        creatureNodesRef.current.clear();',
  '        creatureNodesRef.current.clear();\n        resourceNodesRef.current.clear();',
  'resource cleanup clear',
);

if (changed) fs.writeFileSync(filePath, source);
else console.log('[patch-pixi-render-resources] no changes');
