const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'features', 'game', 'pixi', 'PixiGameCanvas.tsx');
let source = fs.readFileSync(filePath, 'utf8');
let changed = false;

function replaceOnce(search, replacement, label) {
  if (source.includes(replacement)) return;
  if (!source.includes(search)) {
    console.log(`[patch-pixi-render-buildings] skipped ${label}`);
    return;
  }
  source = source.replace(search, replacement);
  changed = true;
  console.log(`[patch-pixi-render-buildings] patched ${label}`);
}

replaceOnce(
  'import type { CreaturePublicState, Direction, PlayerPublicState, ResourceNodeState, WorldSnapshot } from "@palpalworld/shared";',
  'import type { BuildingState, CreaturePublicState, Direction, PlayerPublicState, ResourceNodeState, WorldSnapshot } from "@palpalworld/shared";',
  'BuildingState import after resource patch',
);
replaceOnce(
  'import type { CreaturePublicState, Direction, PlayerPublicState, WorldSnapshot } from "@palpalworld/shared";',
  'import type { BuildingState, CreaturePublicState, Direction, PlayerPublicState, ResourceNodeState, WorldSnapshot } from "@palpalworld/shared";',
  'BuildingState import fallback',
);

replaceOnce(
  'type PixiResourceNode = { container: PixiContainer; graphics: PixiGraphics; lastSeenFrame: number };',
  'type PixiResourceNode = { container: PixiContainer; graphics: PixiGraphics; lastSeenFrame: number };\ntype PixiBuildingNode = { container: PixiContainer; graphics: PixiGraphics; lastSeenFrame: number };\ntype SharedPixiBuildingState = BuildingState & { currentTile?: unknown; ownerNickname?: string; isRemoteSharedBuilding?: boolean };\ntype RemoteBuildingsEvent = CustomEvent<{ buildings?: SharedPixiBuildingState[] }>; ',
  'building node types after resource patch',
);
replaceOnce(
  'type PixiCreatureNode = { container: PixiContainer; graphics: PixiGraphics; lastSeenFrame: number };',
  'type PixiCreatureNode = { container: PixiContainer; graphics: PixiGraphics; lastSeenFrame: number };\ntype PixiBuildingNode = { container: PixiContainer; graphics: PixiGraphics; lastSeenFrame: number };\ntype SharedPixiBuildingState = BuildingState & { currentTile?: unknown; ownerNickname?: string; isRemoteSharedBuilding?: boolean };\ntype RemoteBuildingsEvent = CustomEvent<{ buildings?: SharedPixiBuildingState[] }>; ',
  'building node types fallback',
);

replaceOnce(
  'function getResourcePalette(resource: ResourceNodeState) {',
  `function getBuildingPalette(building: BuildingState) {
  const type = String(building.type);
  if (type.includes("stone")) return { base: 0x64748b, roof: 0x475569, accent: 0xcbd5e1, light: 0xe2e8f0 };
  if (type.includes("storage")) return { base: 0x92400e, roof: 0x78350f, accent: 0xfacc15, light: 0xfef3c7 };
  if (type.includes("campfire")) return { base: 0x7c2d12, roof: 0xef4444, accent: 0xf97316, light: 0xfef3c7 };
  if (type.includes("farm")) return { base: 0x854d0e, roof: 0x365314, accent: 0x84cc16, light: 0xd9f99d };
  if (type.includes("core")) return { base: 0x1d4ed8, roof: 0x0f172a, accent: 0x38bdf8, light: 0xe0f2fe };
  return { base: 0x7c2d12, roof: 0x78350f, accent: 0xfbbf24, light: 0xfef3c7 };
}

function getResourcePalette(resource: ResourceNodeState) {`,
  'building palette before resource palette',
);
replaceOnce(
  'function getCreaturePalette(creature: CreaturePublicState) {',
  `function getBuildingPalette(building: BuildingState) {
  const type = String(building.type);
  if (type.includes("stone")) return { base: 0x64748b, roof: 0x475569, accent: 0xcbd5e1, light: 0xe2e8f0 };
  if (type.includes("storage")) return { base: 0x92400e, roof: 0x78350f, accent: 0xfacc15, light: 0xfef3c7 };
  if (type.includes("campfire")) return { base: 0x7c2d12, roof: 0xef4444, accent: 0xf97316, light: 0xfef3c7 };
  if (type.includes("farm")) return { base: 0x854d0e, roof: 0x365314, accent: 0x84cc16, light: 0xd9f99d };
  if (type.includes("core")) return { base: 0x1d4ed8, roof: 0x0f172a, accent: 0x38bdf8, light: 0xe0f2fe };
  return { base: 0x7c2d12, roof: 0x78350f, accent: 0xfbbf24, light: 0xfef3c7 };
}

function getCreaturePalette(creature: CreaturePublicState) {`,
  'building palette fallback',
);

replaceOnce(
  'function drawPixiResourceAtOrigin(graphics: PixiGraphics, resource: ResourceNodeState) {',
  `function drawPixiBuildingAtOrigin(graphics: PixiGraphics, building: BuildingState) {
  const palette = getBuildingPalette(building);
  const type = String(building.type);
  const hpRatio = Math.max(0.2, Math.min(1, building.maxHp > 0 ? building.hp / building.maxHp : 1));
  const isFarm = type.includes("farm");
  const isCampfire = type.includes("campfire");
  const isCore = type.includes("core");

  if (isFarm) {
    graphics.ellipse(0, 25, 42, 15);
    graphics.fill({ color: 0x000000, alpha: 0.18 });
    graphics.roundRect(-42, -10, 84, 46, 10);
    graphics.fill({ color: palette.base, alpha: 0.86 * hpRatio });
    for (let i = -30; i <= 30; i += 15) {
      graphics.moveTo(i, -6);
      graphics.lineTo(i + 8, 28);
    }
    graphics.stroke({ width: 3, color: palette.accent, alpha: 0.76 });
    return;
  }

  if (isCampfire) {
    graphics.ellipse(0, 22, 28, 9);
    graphics.fill({ color: 0x000000, alpha: 0.22 });
    graphics.roundRect(-27, 10, 54, 12, 5);
    graphics.fill({ color: palette.base, alpha: 0.92 });
    graphics.circle(0, -2, 22);
    graphics.fill({ color: palette.accent, alpha: 0.18 });
    graphics.moveTo(-9, 9);
    graphics.lineTo(0, -24);
    graphics.lineTo(10, 9);
    graphics.stroke({ width: 8, color: palette.roof, alpha: 0.86 });
    graphics.moveTo(-4, 8);
    graphics.lineTo(2, -13);
    graphics.lineTo(7, 8);
    graphics.stroke({ width: 6, color: palette.light, alpha: 0.92 });
    return;
  }

  graphics.ellipse(0, 33, 36, 11);
  graphics.fill({ color: 0x000000, alpha: 0.2 });
  graphics.roundRect(-30, -10, 60, 43, 7);
  graphics.fill({ color: palette.base, alpha: 0.92 * hpRatio });
  graphics.moveTo(-36, -8);
  graphics.lineTo(0, -38);
  graphics.lineTo(36, -8);
  graphics.stroke({ width: 10, color: palette.roof, alpha: 0.96 });
  graphics.roundRect(-8, 9, 16, 24, 3);
  graphics.fill({ color: palette.roof, alpha: 0.72 });
  graphics.roundRect(-23, 0, 14, 12, 3);
  graphics.roundRect(10, 0, 14, 12, 3);
  graphics.fill({ color: palette.light, alpha: 0.78 });
  if (isCore) {
    graphics.circle(0, -3, 11);
    graphics.fill({ color: palette.accent, alpha: 0.38 });
    graphics.circle(0, -3, 5);
    graphics.fill({ color: palette.accent, alpha: 0.86 });
  }
}

function drawPixiResourceAtOrigin(graphics: PixiGraphics, resource: ResourceNodeState) {`,
  'building draw before resource draw',
);
replaceOnce(
  'function drawPixiCreatureAtOrigin(graphics: PixiGraphics, creature: CreaturePublicState) {',
  `function drawPixiBuildingAtOrigin(graphics: PixiGraphics, building: BuildingState) {
  const palette = getBuildingPalette(building);
  const type = String(building.type);
  const hpRatio = Math.max(0.2, Math.min(1, building.maxHp > 0 ? building.hp / building.maxHp : 1));
  const isFarm = type.includes("farm");
  const isCampfire = type.includes("campfire");
  const isCore = type.includes("core");

  if (isFarm) {
    graphics.ellipse(0, 25, 42, 15);
    graphics.fill({ color: 0x000000, alpha: 0.18 });
    graphics.roundRect(-42, -10, 84, 46, 10);
    graphics.fill({ color: palette.base, alpha: 0.86 * hpRatio });
    for (let i = -30; i <= 30; i += 15) {
      graphics.moveTo(i, -6);
      graphics.lineTo(i + 8, 28);
    }
    graphics.stroke({ width: 3, color: palette.accent, alpha: 0.76 });
    return;
  }

  if (isCampfire) {
    graphics.ellipse(0, 22, 28, 9);
    graphics.fill({ color: 0x000000, alpha: 0.22 });
    graphics.roundRect(-27, 10, 54, 12, 5);
    graphics.fill({ color: palette.base, alpha: 0.92 });
    graphics.circle(0, -2, 22);
    graphics.fill({ color: palette.accent, alpha: 0.18 });
    graphics.moveTo(-9, 9);
    graphics.lineTo(0, -24);
    graphics.lineTo(10, 9);
    graphics.stroke({ width: 8, color: palette.roof, alpha: 0.86 });
    graphics.moveTo(-4, 8);
    graphics.lineTo(2, -13);
    graphics.lineTo(7, 8);
    graphics.stroke({ width: 6, color: palette.light, alpha: 0.92 });
    return;
  }

  graphics.ellipse(0, 33, 36, 11);
  graphics.fill({ color: 0x000000, alpha: 0.2 });
  graphics.roundRect(-30, -10, 60, 43, 7);
  graphics.fill({ color: palette.base, alpha: 0.92 * hpRatio });
  graphics.moveTo(-36, -8);
  graphics.lineTo(0, -38);
  graphics.lineTo(36, -8);
  graphics.stroke({ width: 10, color: palette.roof, alpha: 0.96 });
  graphics.roundRect(-8, 9, 16, 24, 3);
  graphics.fill({ color: palette.roof, alpha: 0.72 });
  graphics.roundRect(-23, 0, 14, 12, 3);
  graphics.roundRect(10, 0, 14, 12, 3);
  graphics.fill({ color: palette.light, alpha: 0.78 });
  if (isCore) {
    graphics.circle(0, -3, 11);
    graphics.fill({ color: palette.accent, alpha: 0.38 });
    graphics.circle(0, -3, 5);
    graphics.fill({ color: palette.accent, alpha: 0.86 });
  }
}

function drawPixiCreatureAtOrigin(graphics: PixiGraphics, creature: CreaturePublicState) {`,
  'building draw fallback',
);

replaceOnce(
  'function upsertPixiResourceNodes(PIXI: NonNullable<Window["PIXI"]>, resourceLayer: PixiContainer, nodes: Map<string, PixiResourceNode>, resources: ResourceNodeState[], frameId: number) {',
  `function upsertPixiBuildingNodes(PIXI: NonNullable<Window["PIXI"]>, buildingLayer: PixiContainer, nodes: Map<string, PixiBuildingNode>, buildings: BuildingState[], frameId: number) {
  for (const building of buildings) {
    let node = nodes.get(building.id);
    if (!node) {
      const container = new PIXI.Container();
      const graphics = new PIXI.Graphics();
      container.addChild(graphics as unknown as PixiContainer);
      buildingLayer.addChild(container);
      node = { container, graphics, lastSeenFrame: frameId };
      nodes.set(building.id, node);
    }
    node.lastSeenFrame = frameId;
    node.container.visible = true;
    node.container.zIndex = building.position.y + 8;
    node.container.position?.set(building.position.x, building.position.y);
    node.graphics.clear();
    drawPixiBuildingAtOrigin(node.graphics, building);
  }
  for (const [key, node] of nodes.entries()) {
    if (node.lastSeenFrame === frameId) continue;
    node.container.visible = false;
    buildingLayer.removeChild?.(node.container);
    node.container.destroy?.({ children: true });
    nodes.delete(key);
  }
}

function upsertPixiResourceNodes(PIXI: NonNullable<Window["PIXI"]>, resourceLayer: PixiContainer, nodes: Map<string, PixiResourceNode>, resources: ResourceNodeState[], frameId: number) {`,
  'building node upsert before resource upsert',
);
replaceOnce(
  'function upsertPixiCreatureNodes(PIXI: NonNullable<Window["PIXI"]>, creatureLayer: PixiContainer, nodes: Map<string, PixiCreatureNode>, creatures: CreaturePublicState[], frameId: number) {',
  `function upsertPixiBuildingNodes(PIXI: NonNullable<Window["PIXI"]>, buildingLayer: PixiContainer, nodes: Map<string, PixiBuildingNode>, buildings: BuildingState[], frameId: number) {
  for (const building of buildings) {
    let node = nodes.get(building.id);
    if (!node) {
      const container = new PIXI.Container();
      const graphics = new PIXI.Graphics();
      container.addChild(graphics as unknown as PixiContainer);
      buildingLayer.addChild(container);
      node = { container, graphics, lastSeenFrame: frameId };
      nodes.set(building.id, node);
    }
    node.lastSeenFrame = frameId;
    node.container.visible = true;
    node.container.zIndex = building.position.y + 8;
    node.container.position?.set(building.position.x, building.position.y);
    node.graphics.clear();
    drawPixiBuildingAtOrigin(node.graphics, building);
  }
  for (const [key, node] of nodes.entries()) {
    if (node.lastSeenFrame === frameId) continue;
    node.container.visible = false;
    buildingLayer.removeChild?.(node.container);
    node.container.destroy?.({ children: true });
    nodes.delete(key);
  }
}

function upsertPixiCreatureNodes(PIXI: NonNullable<Window["PIXI"]>, creatureLayer: PixiContainer, nodes: Map<string, PixiCreatureNode>, creatures: CreaturePublicState[], frameId: number) {`,
  'building node upsert fallback',
);

replaceOnce(
  '  const resourceNodesRef = useRef(new Map<string, PixiResourceNode>());',
  '  const resourceNodesRef = useRef(new Map<string, PixiResourceNode>());\n  const buildingNodesRef = useRef(new Map<string, PixiBuildingNode>());\n  const remoteBuildingsRef = useRef<SharedPixiBuildingState[]>([]);',
  'building nodes refs after resource',
);
replaceOnce(
  '  const creatureNodesRef = useRef(new Map<string, PixiCreatureNode>());',
  '  const creatureNodesRef = useRef(new Map<string, PixiCreatureNode>());\n  const buildingNodesRef = useRef(new Map<string, PixiBuildingNode>());\n  const remoteBuildingsRef = useRef<SharedPixiBuildingState[]>([]);',
  'building nodes refs fallback',
);

replaceOnce(
  `  useEffect(() => {
    const handleRemotePlayers = (event: Event) => {`,
  `  useEffect(() => {
    const handleRemoteBuildings = (event: Event) => {
      const customEvent = event as RemoteBuildingsEvent;
      remoteBuildingsRef.current = customEvent.detail?.buildings ?? [];
    };
    window.addEventListener("palpalworld:remote-buildings", handleRemoteBuildings);
    return () => window.removeEventListener("palpalworld:remote-buildings", handleRemoteBuildings);
  }, []);

  useEffect(() => {
    const handleRemotePlayers = (event: Event) => {`,
  'remote buildings listener',
);

replaceOnce(
  '        const drawableResources = (currentSnapshot?.resources ?? []).filter((resource) => ((resource as ResourceNodeState & { remainingAmount?: number }).remainingAmount ?? 1) > 0);',
  '        const drawableResources = (currentSnapshot?.resources ?? []).filter((resource) => ((resource as ResourceNodeState & { remainingAmount?: number }).remainingAmount ?? 1) > 0);\n        const localBuildingIds = new Set((currentSnapshot?.buildings ?? []).map((building) => building.id));\n        const drawableBuildings = [...(currentSnapshot?.buildings ?? []), ...remoteBuildingsRef.current.filter((building) => !localBuildingIds.has(building.id))];',
  'drawable buildings list after resources',
);
replaceOnce(
  '        const drawableCreatures = (currentSnapshot?.creatures ?? []).filter((creature) => creature.hp > 0);',
  '        const drawableCreatures = (currentSnapshot?.creatures ?? []).filter((creature) => creature.hp > 0);\n        const localBuildingIds = new Set((currentSnapshot?.buildings ?? []).map((building) => building.id));\n        const drawableBuildings = [...(currentSnapshot?.buildings ?? []), ...remoteBuildingsRef.current.filter((building) => !localBuildingIds.has(building.id))];',
  'drawable buildings list fallback',
);

replaceOnce(
  '        upsertPixiResourceNodes(PIXI, layers.resources, resourceNodesRef.current, drawableResources, frameId);',
  '        upsertPixiBuildingNodes(PIXI, layers.buildingsBack, buildingNodesRef.current, drawableBuildings, frameId);\n        upsertPixiResourceNodes(PIXI, layers.resources, resourceNodesRef.current, drawableResources, frameId);',
  'building upsert call before resources',
);
replaceOnce(
  '        upsertPixiCreatureNodes(PIXI, layers.creatures, creatureNodesRef.current, drawableCreatures, frameId);',
  '        upsertPixiBuildingNodes(PIXI, layers.buildingsBack, buildingNodesRef.current, drawableBuildings, frameId);\n        upsertPixiCreatureNodes(PIXI, layers.creatures, creatureNodesRef.current, drawableCreatures, frameId);',
  'building upsert call fallback',
);

replaceOnce(
  '        for (const node of resourceNodesRef.current.values()) node.container.destroy?.({ children: true });',
  '        for (const node of resourceNodesRef.current.values()) node.container.destroy?.({ children: true });\n        for (const node of buildingNodesRef.current.values()) node.container.destroy?.({ children: true });',
  'building cleanup destroy after resource',
);
replaceOnce(
  '        for (const node of creatureNodesRef.current.values()) node.container.destroy?.({ children: true });',
  '        for (const node of creatureNodesRef.current.values()) node.container.destroy?.({ children: true });\n        for (const node of buildingNodesRef.current.values()) node.container.destroy?.({ children: true });',
  'building cleanup destroy fallback',
);
replaceOnce(
  '        resourceNodesRef.current.clear();',
  '        resourceNodesRef.current.clear();\n        buildingNodesRef.current.clear();',
  'building cleanup clear after resource',
);
replaceOnce(
  '        creatureNodesRef.current.clear();',
  '        creatureNodesRef.current.clear();\n        buildingNodesRef.current.clear();',
  'building cleanup clear fallback',
);

if (changed) fs.writeFileSync(filePath, source);
else console.log('[patch-pixi-render-buildings] no changes');
