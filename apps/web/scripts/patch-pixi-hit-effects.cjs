const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'features', 'game', 'pixi', 'PixiGameCanvas.tsx');
let source = fs.readFileSync(filePath, 'utf8');
let changed = false;

function replaceOnce(search, replacement, label) {
  if (source.includes(replacement)) return true;
  if (!source.includes(search)) {
    console.log(`[patch-pixi-hit-effects] skipped ${label}`);
    return false;
  }
  source = source.replace(search, replacement);
  changed = true;
  console.log(`[patch-pixi-hit-effects] patched ${label}`);
  return true;
}

if (!source.includes('type PixiHitEffect =')) {
  replaceOnce(
    'type PixiCreatureNode = { container: PixiContainer; graphics: PixiGraphics; lastSeenFrame: number };',
    'type PixiCreatureNode = { container: PixiContainer; graphics: PixiGraphics; lastSeenFrame: number };\ntype PixiHitEffect = { id: string; x: number; y: number; damage: number; createdAt: number; durationMs: number };\ntype PixiHitEffectNode = { container: PixiContainer; graphics: PixiGraphics; lastSeenFrame: number };',
    'hit effect types',
  );
}

const hitEffectHelpers = `function syncPixiHitEffects(creatures: CreaturePublicState[], previousHp: Map<string, number>, effects: PixiHitEffect[], now: number) {
  const liveIds = new Set<string>();
  for (const creature of creatures) {
    liveIds.add(creature.id);
    const previous = previousHp.get(creature.id);
    if (typeof previous === "number" && creature.hp < previous) {
      const damage = Math.max(1, previous - creature.hp);
      effects.push({
        id: creature.id + ":" + now + ":" + Math.round(Math.random() * 10000),
        x: creature.position.x,
        y: creature.position.y - 12,
        damage,
        createdAt: now,
        durationMs: 520,
      });
    }
    previousHp.set(creature.id, creature.hp);
  }
  for (const id of Array.from(previousHp.keys())) {
    if (!liveIds.has(id)) previousHp.delete(id);
  }
  for (let index = effects.length - 1; index >= 0; index -= 1) {
    if (now - effects[index].createdAt > effects[index].durationMs) effects.splice(index, 1);
  }
}

function drawPixiHitEffectAtOrigin(graphics: PixiGraphics, effect: PixiHitEffect, now: number) {
  const age = Math.max(0, Math.min(1, (now - effect.createdAt) / effect.durationMs));
  const alpha = Math.max(0, 1 - age);
  const lift = age * 28;
  const radius = 12 + age * 22;
  graphics.circle(0, -lift, radius);
  graphics.stroke({ width: 3, color: 0xfef3c7, alpha: 0.75 * alpha });
  graphics.circle(0, -lift, radius * 0.55);
  graphics.stroke({ width: 2, color: 0xef4444, alpha: 0.72 * alpha });
  const barWidth = Math.min(46, 12 + effect.damage * 2);
  graphics.roundRect(-barWidth / 2, -lift - 34, barWidth, 7, 4);
  graphics.fill({ color: 0xef4444, alpha: 0.82 * alpha });
  graphics.roundRect(-barWidth / 2 + 2, -lift - 32, Math.max(2, barWidth - 4), 2, 2);
  graphics.fill({ color: 0xfef2f2, alpha: 0.72 * alpha });
}

function upsertPixiHitEffectNodes(PIXI: NonNullable<Window["PIXI"]>, effectLayer: PixiContainer, nodes: Map<string, PixiHitEffectNode>, effects: PixiHitEffect[], now: number, frameId: number) {
  for (const effect of effects) {
    let node = nodes.get(effect.id);
    if (!node) {
      const container = new PIXI.Container();
      const graphics = new PIXI.Graphics();
      container.addChild(graphics as unknown as PixiContainer);
      effectLayer.addChild(container);
      node = { container, graphics, lastSeenFrame: frameId };
      nodes.set(effect.id, node);
    }
    node.lastSeenFrame = frameId;
    node.container.visible = true;
    node.container.zIndex = effect.y + 120;
    node.container.position?.set(effect.x, effect.y);
    node.graphics.clear();
    drawPixiHitEffectAtOrigin(node.graphics, effect, now);
  }
  for (const [key, node] of nodes.entries()) {
    if (node.lastSeenFrame === frameId) continue;
    node.container.visible = false;
    effectLayer.removeChild?.(node.container);
    node.container.destroy?.({ children: true });
    nodes.delete(key);
  }
}

`;
if (!source.includes('function syncPixiHitEffects(')) {
  replaceOnce(
    'function drawPixiNightLighting(graphics: PixiGraphics, width: number, height: number, cameraX: number, cameraY: number, drawablePlayers: DrawablePlayer[]) {',
    hitEffectHelpers + 'function drawPixiNightLighting(graphics: PixiGraphics, width: number, height: number, cameraX: number, cameraY: number, drawablePlayers: DrawablePlayer[]) {',
    'hit effect helpers before lighting',
  );
}

if (!source.includes('const hitEffectNodesRef = useRef(new Map<string, PixiHitEffectNode>());')) {
  replaceOnce(
    '  const creatureNodesRef = useRef(new Map<string, PixiCreatureNode>());',
    '  const creatureNodesRef = useRef(new Map<string, PixiCreatureNode>());\n  const hitEffectNodesRef = useRef(new Map<string, PixiHitEffectNode>());\n  const hitEffectsRef = useRef<PixiHitEffect[]>([]);\n  const previousCreatureHpRef = useRef(new Map<string, number>());',
    'hit effect refs',
  );
}

if (!source.includes('syncPixiHitEffects(drawableCreatures')) {
  replaceOnce(
    '        const drawableCreatures = (currentSnapshot?.creatures ?? []).filter((creature) => creature.hp > 0);',
    '        const drawableCreatures = (currentSnapshot?.creatures ?? []).filter((creature) => creature.hp > 0);\n        syncPixiHitEffects(drawableCreatures, previousCreatureHpRef.current, hitEffectsRef.current, now);',
    'hit effect sync call',
  );
}

if (!source.includes('upsertPixiHitEffectNodes(PIXI, layers.effects')) {
  replaceOnce(
    '        upsertPixiPlayerNodes(PIXI, layers.players, playerNodesRef.current, drawablePlayers, frameId);',
    '        upsertPixiPlayerNodes(PIXI, layers.players, playerNodesRef.current, drawablePlayers, frameId);\n        upsertPixiHitEffectNodes(PIXI, layers.effects, hitEffectNodesRef.current, hitEffectsRef.current, now, frameId);',
    'hit effect upsert call',
  );
}

if (!source.includes('for (const node of hitEffectNodesRef.current.values())')) {
  replaceOnce(
    '        for (const node of creatureNodesRef.current.values()) node.container.destroy?.({ children: true });',
    '        for (const node of creatureNodesRef.current.values()) node.container.destroy?.({ children: true });\n        for (const node of hitEffectNodesRef.current.values()) node.container.destroy?.({ children: true });',
    'hit effect cleanup destroy',
  );
}
if (!source.includes('hitEffectNodesRef.current.clear();')) {
  replaceOnce(
    '        creatureNodesRef.current.clear();',
    '        creatureNodesRef.current.clear();\n        hitEffectNodesRef.current.clear();\n        hitEffectsRef.current.length = 0;\n        previousCreatureHpRef.current.clear();',
    'hit effect cleanup clear',
  );
}

if (changed) fs.writeFileSync(filePath, source);
else console.log('[patch-pixi-hit-effects] no changes');
