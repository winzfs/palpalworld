const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'features', 'game', 'pixi', 'PixiGameCanvas.tsx');
let source = fs.readFileSync(filePath, 'utf8');
let changed = false;

function replaceOnce(search, replacement, label) {
  if (source.includes(replacement)) return;
  if (!source.includes(search)) {
    console.log(`[patch-pixi-render-feedback] skipped ${label}`);
    return;
  }
  source = source.replace(search, replacement);
  changed = true;
  console.log(`[patch-pixi-render-feedback] patched ${label}`);
}

replaceOnce(
  'type RemoteBuildingsEvent = CustomEvent<{ buildings?: SharedPixiBuildingState[] }>; ',
  'type RemoteBuildingsEvent = CustomEvent<{ buildings?: SharedPixiBuildingState[] }>;\ntype PixiFeedbackState = { interactablePosition?: { x: number; y: number } | null; highlightedCreatureId?: string | null; placementPreview?: { position: { x: number; y: number }; ok: boolean } | null };\ntype PixiFeedbackEvent = CustomEvent<PixiFeedbackState>; ',
  'feedback state type after buildings',
);
replaceOnce(
  'type PixiCreatureNode = { container: PixiContainer; graphics: PixiGraphics; lastSeenFrame: number };',
  'type PixiCreatureNode = { container: PixiContainer; graphics: PixiGraphics; lastSeenFrame: number };\ntype PixiFeedbackState = { interactablePosition?: { x: number; y: number } | null; highlightedCreatureId?: string | null; placementPreview?: { position: { x: number; y: number }; ok: boolean } | null };\ntype PixiFeedbackEvent = CustomEvent<PixiFeedbackState>;',
  'feedback state type fallback',
);

replaceOnce(
  'function drawPixiNightLighting(graphics: PixiGraphics, width: number, height: number, cameraX: number, cameraY: number, drawablePlayers: DrawablePlayer[]) {',
  `function drawPixiFeedback(graphics: PixiGraphics, feedback: PixiFeedbackState, creatures: CreaturePublicState[]) {
  graphics.clear();
  const interactable = feedback.interactablePosition;
  if (interactable) {
    const pulse = 0.65 + Math.sin(Date.now() / 160) * 0.18;
    graphics.roundRect(interactable.x - 25, interactable.y - 25, 50, 50, 12);
    graphics.stroke({ width: 3, color: 0xfacc15, alpha: pulse });
    graphics.circle(interactable.x, interactable.y - 42, 10);
    graphics.fill({ color: 0x0f172a, alpha: 0.82 });
    graphics.moveTo(interactable.x - 4, interactable.y - 45);
    graphics.lineTo(interactable.x + 5, interactable.y - 45);
    graphics.moveTo(interactable.x, interactable.y - 50);
    graphics.lineTo(interactable.x, interactable.y - 35);
    graphics.stroke({ width: 2, color: 0xffffff, alpha: 0.9 });
  }

  const highlightedCreature = feedback.highlightedCreatureId ? creatures.find((creature) => creature.id === feedback.highlightedCreatureId) : null;
  if (highlightedCreature) {
    graphics.ellipse(highlightedCreature.position.x, highlightedCreature.position.y + 22, 32, 13);
    graphics.stroke({ width: 4, color: 0xfacc15, alpha: 0.92 });
  }

  const preview = feedback.placementPreview;
  if (preview) {
    const accent = preview.ok ? 0x22c55e : 0xef4444;
    graphics.ellipse(preview.position.x, preview.position.y + 26, 42, 18);
    graphics.fill({ color: accent, alpha: 0.13 });
    graphics.ellipse(preview.position.x, preview.position.y + 26, 42, 18);
    graphics.stroke({ width: 3, color: accent, alpha: 0.86 });
    graphics.roundRect(preview.position.x - 28, preview.position.y - 18, 56, 42, 8);
    graphics.fill({ color: accent, alpha: 0.18 });
  }
}

function drawPixiNightLighting(graphics: PixiGraphics, width: number, height: number, cameraX: number, cameraY: number, drawablePlayers: DrawablePlayer[]) {`,
  'feedback draw helper',
);

replaceOnce(
  '  const frameIdRef = useRef(0);',
  '  const frameIdRef = useRef(0);\n  const feedbackRef = useRef<PixiFeedbackState>({});',
  'feedback ref',
);

replaceOnce(
  `  useEffect(() => {
    const handleRemoteBuildings = (event: Event) => {`,
  `  useEffect(() => {
    const handleFeedback = (event: Event) => {
      const customEvent = event as PixiFeedbackEvent;
      feedbackRef.current = customEvent.detail ?? {};
    };
    window.addEventListener("palpalworld:pixi-feedback", handleFeedback);
    return () => window.removeEventListener("palpalworld:pixi-feedback", handleFeedback);
  }, []);

  useEffect(() => {
    const handleRemoteBuildings = (event: Event) => {`,
  'feedback listener before remote buildings',
);
replaceOnce(
  `  useEffect(() => {
    const handleRemotePlayers = (event: Event) => {`,
  `  useEffect(() => {
    const handleFeedback = (event: Event) => {
      const customEvent = event as PixiFeedbackEvent;
      feedbackRef.current = customEvent.detail ?? {};
    };
    window.addEventListener("palpalworld:pixi-feedback", handleFeedback);
    return () => window.removeEventListener("palpalworld:pixi-feedback", handleFeedback);
  }, []);

  useEffect(() => {
    const handleRemotePlayers = (event: Event) => {`,
  'feedback listener fallback',
);

replaceOnce(
  '      const lightingGraphics = new PIXI.Graphics();\n      layers.lighting.addChild(lightingGraphics as unknown as PixiContainer);',
  '      const lightingGraphics = new PIXI.Graphics();\n      const feedbackGraphics = new PIXI.Graphics();\n      layers.effects.addChild(feedbackGraphics as unknown as PixiContainer);\n      layers.lighting.addChild(lightingGraphics as unknown as PixiContainer);',
  'feedback graphics',
);

replaceOnce(
  '        const lighting = lightingGraphics as unknown as PixiTransformNode;\n        lighting.position.set(0, 0);\n        lighting.scale.set(1);',
  '        const lighting = lightingGraphics as unknown as PixiTransformNode;\n        lighting.position.set(0, 0);\n        lighting.scale.set(1);\n        const feedbackLayer = feedbackGraphics as unknown as PixiTransformNode;\n        feedbackLayer.position.set(0, 0);\n        feedbackLayer.scale.set(1);',
  'feedback transform',
);

replaceOnce(
  '        drawPixiNightLighting(lightingGraphics, host.clientWidth, host.clientHeight, camera.x, camera.y, drawablePlayers);',
  '        drawPixiFeedback(feedbackGraphics, feedbackRef.current, drawableCreatures);\n        drawPixiNightLighting(lightingGraphics, host.clientWidth, host.clientHeight, camera.x, camera.y, drawablePlayers);',
  'feedback draw call',
);

if (changed) fs.writeFileSync(filePath, source);
else console.log('[patch-pixi-render-feedback] no changes');
