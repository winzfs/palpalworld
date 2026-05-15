const fs = require("fs");
const path = require("path");

const scenePath = path.join(__dirname, "..", "src", "features", "game", "GameScene.tsx");
const clientPath = path.join(__dirname, "..", "src", "features", "game", "GameClientTileDemoStation.tsx");
let scene = fs.readFileSync(scenePath, "utf8");
let client = fs.readFileSync(clientPath, "utf8");
let sceneChanged = false;
let clientChanged = false;

function replaceScene(search, replacement, label) {
  if (scene.includes(replacement)) {
    console.log(`[patch-smooth-movement-snapshot-throttle] already-patched scene ${label}`);
    return;
  }
  if (!scene.includes(search)) {
    console.log(`[patch-smooth-movement-snapshot-throttle] skipped scene ${label}`);
    return;
  }
  scene = scene.replace(search, replacement);
  sceneChanged = true;
  console.log(`[patch-smooth-movement-snapshot-throttle] patched scene ${label}`);
}

function replaceClient(search, replacement, label) {
  if (client.includes(replacement)) {
    console.log(`[patch-smooth-movement-snapshot-throttle] already-patched client ${label}`);
    return;
  }
  if (!client.includes(search)) {
    console.log(`[patch-smooth-movement-snapshot-throttle] skipped client ${label}`);
    return;
  }
  client = client.replace(search, replacement);
  clientChanged = true;
  console.log(`[patch-smooth-movement-snapshot-throttle] patched client ${label}`);
}

function replaceAllClient(search, replacement, label) {
  if (!client.includes(search)) {
    console.log(`[patch-smooth-movement-snapshot-throttle] skipped client ${label}`);
    return;
  }
  client = client.split(search).join(replacement);
  clientChanged = true;
  console.log(`[patch-smooth-movement-snapshot-throttle] patched client ${label}`);
}

replaceScene(
  `  getLocalPlayerPosition() { return this.getLocalPlayer()?.position ?? null; }`,
  `  getLocalPlayerPosition() { return this.getLocalPlayer()?.position ?? null; }
  updateLocalPlayerSnapshot(position: Vector2, direction: Direction, currentTile: MapTileRef) {
    const player = this.getLocalPlayer();
    if (!player) return;
    const previous = this.previousPlayerPositions.get(player.id);
    const moved = previous ? Math.hypot(position.x - previous.x, position.y - previous.y) > 0.15 : true;
    if (moved) this.movingPlayerIds.add(player.id);
    else this.movingPlayerIds.delete(player.id);
    player.position.x = position.x;
    player.position.y = position.y;
    player.direction = direction;
    (player as any).currentTile = { ...currentTile };
    const cached = this.previousPlayerPositions.get(player.id);
    if (cached) { cached.x = position.x; cached.y = position.y; }
    else this.previousPlayerPositions.set(player.id, { x: position.x, y: position.y });
    fallbackPlayerTiles.set(player.id, { ...currentTile });
  }`,
  "local player lightweight snapshot update",
);

replaceClient(
  `  const lastCreatureAiAtRef = useRef(performance.now());
  const lastDemoAttackAtRef = useRef(0);`,
  `  const lastCreatureAiAtRef = useRef(performance.now());
  const lastSceneSnapshotAtRef = useRef(0);
  const lastDemoAttackAtRef = useRef(0);`,
  "scene snapshot throttle ref after creature ref",
);
replaceClient(
  `  const lastDemoAttackAtRef = useRef(0);
  const lastUiSnapshotAtRef = useRef(0);`,
  `  const lastSceneSnapshotAtRef = useRef(0);
  const lastDemoAttackAtRef = useRef(0);
  const lastUiSnapshotAtRef = useRef(0);`,
  "scene snapshot throttle ref",
);

replaceAllClient(
  `      if (now - lastCreatureAiAtRef.current >= 80) {
        const creatureDeltaSeconds = Math.min(0.16, (now - lastCreatureAiAtRef.current) / 1000);
        moveDemoCreatures(getCurrentCreatures(), creatureDeltaSeconds, now, demoPositionRef.current);
        lastCreatureAiAtRef.current = now;
      }
      if (input.primary) handleDemoAttackRef.current?.();
      applyDemoSnapshot(false);
      lastTick = now;`,
  `      moveDemoCreatures(getCurrentCreatures(), deltaSeconds, now, demoPositionRef.current);
      (sceneRef.current as any)?.updateLocalPlayerSnapshot?.(demoPositionRef.current, demoDirectionRef.current, demoTileRef.current);
      if (input.primary) handleDemoAttackRef.current?.();
      if (now - lastSceneSnapshotAtRef.current >= 120) {
        lastSceneSnapshotAtRef.current = now;
        applyDemoSnapshot(false);
      }
      lastTick = now;`,
  "restore smooth creatures and throttle full snapshot",
);

replaceAllClient(
  `      moveDemoCreatures(getCurrentCreatures(), deltaSeconds, now, demoPositionRef.current);
      applyDemoSnapshot(false);
      lastTick = now;`,
  `      moveDemoCreatures(getCurrentCreatures(), deltaSeconds, now, demoPositionRef.current);
      (sceneRef.current as any)?.updateLocalPlayerSnapshot?.(demoPositionRef.current, demoDirectionRef.current, demoTileRef.current);
      if (now - lastSceneSnapshotAtRef.current >= 120) {
        lastSceneSnapshotAtRef.current = now;
        applyDemoSnapshot(false);
      }
      lastTick = now;`,
  "throttle full snapshot original tick",
);

if (sceneChanged) fs.writeFileSync(scenePath, scene);
if (clientChanged) fs.writeFileSync(clientPath, client);
