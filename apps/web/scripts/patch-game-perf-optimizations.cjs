const fs = require("fs");
const path = require("path");

const scenePath = path.join(__dirname, "..", "src", "features", "game", "GameScene.tsx");
const clientPath = path.join(__dirname, "..", "src", "features", "game", "GameClientTileDemoStation.tsx");
let scene = fs.readFileSync(scenePath, "utf8");
let client = fs.readFileSync(clientPath, "utf8");
let sceneChanged = false;
let clientChanged = false;

function replaceIn(which, search, replacement, label) {
  let source = which === "scene" ? scene : client;
  if (!source.includes(search)) {
    console.log(`[patch-game-perf-optimizations] skipped ${which} ${label}`);
    return;
  }
  if (source.includes(replacement)) {
    console.log(`[patch-game-perf-optimizations] already-patched ${which} ${label}`);
    return;
  }
  source = source.replace(search, replacement);
  if (which === "scene") { scene = source; sceneChanged = true; }
  else { client = source; clientChanged = true; }
  console.log(`[patch-game-perf-optimizations] patched ${which} ${label}`);
}

function replaceAllIn(which, search, replacement, label) {
  let source = which === "scene" ? scene : client;
  if (!source.includes(search)) {
    console.log(`[patch-game-perf-optimizations] skipped ${which} ${label}`);
    return;
  }
  source = source.split(search).join(replacement);
  if (which === "scene") { scene = source; sceneChanged = true; }
  else { client = source; clientChanged = true; }
  console.log(`[patch-game-perf-optimizations] patched ${which} ${label}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// GameScene optimizations
// ─────────────────────────────────────────────────────────────────────────────

replaceIn("scene",
  "  private onInputChange: (input: GameSceneInput) => void;\n  private onInteract: () => void;\n  private onWorldClick: (target: WorldClickTarget) => void;",
  "  private cachedRootRectWidth = 0;\n  private cachedRootRectHeight = 0;\n  private cachedCanvasClientLeft = 0;\n  private cachedCanvasClientTop = 0;\n  private cachedSceneBuildings: BuildingState[] | null = null;\n  private cachedSceneBuildPartsForPerf: PlacedBuildPart[] | null = null;\n  private cachedSceneBuildPartsSource: PlacedBuildPart[] | null = null;\n  private cachedSceneBuildPartsTileX: number | null = null;\n  private cachedSceneBuildPartsTileY: number | null = null;\n  private lastSnapshotDispatchAt = 0;\n  private readonly snapshotDispatchIntervalMs = 50;\n  private onInputChange: (input: GameSceneInput) => void;\n  private onInteract: () => void;\n  private onWorldClick: (target: WorldClickTarget) => void;",
  "perf cache fields",
);

replaceIn("scene",
  "  private resize = () => { const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2)); const rect = this.root.getBoundingClientRect(); this.canvas.width = Math.floor(rect.width * dpr); this.canvas.height = Math.floor(rect.height * dpr); this.context.setTransform(dpr, 0, 0, dpr, 0, 0); this.context.imageSmoothingEnabled = false; };",
  "  private resize = () => {\n    const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));\n    const rect = this.root.getBoundingClientRect();\n    this.canvas.width = Math.floor(rect.width * dpr);\n    this.canvas.height = Math.floor(rect.height * dpr);\n    this.context.setTransform(dpr, 0, 0, dpr, 0, 0);\n    this.context.imageSmoothingEnabled = false;\n    this.cachedRootRectWidth = rect.width;\n    this.cachedRootRectHeight = rect.height;\n    const canvasRect = this.canvas.getBoundingClientRect();\n    this.cachedCanvasClientLeft = canvasRect.left;\n    this.cachedCanvasClientTop = canvasRect.top;\n  };",
  "resize cache",
);

replaceIn("scene",
  "  private getCameraOffset() { const rect = this.root.getBoundingClientRect(); const localPlayer = this.getLocalPlayer(); const target = localPlayer?.position ?? { x: rect.width / 2, y: rect.height / 2 }; return { x: Math.max(0, Math.min(Math.max(0, MAP_TILE_SIZE.width - rect.width), target.x - rect.width / 2)), y: Math.max(0, Math.min(Math.max(0, MAP_TILE_SIZE.height - rect.height), target.y - rect.height / 2)) }; }",
  "  private getCameraOffset() {\n    const width = this.cachedRootRectWidth || this.root.clientWidth;\n    const height = this.cachedRootRectHeight || this.root.clientHeight;\n    const localPlayer = this.getLocalPlayer();\n    const target = localPlayer?.position ?? { x: width / 2, y: height / 2 };\n    return {\n      x: Math.max(0, Math.min(Math.max(0, MAP_TILE_SIZE.width - width), target.x - width / 2)),\n      y: Math.max(0, Math.min(Math.max(0, MAP_TILE_SIZE.height - height), target.y - height / 2)),\n    };\n  }",
  "camera offset cache",
);

replaceIn("scene",
  "  private getViewportBounds(cameraX: number, cameraY: number): ViewportBounds { const rect = this.root.getBoundingClientRect(); return { left: cameraX, top: cameraY, right: cameraX + rect.width, bottom: cameraY + rect.height }; }",
  "  private getViewportBounds(cameraX: number, cameraY: number): ViewportBounds {\n    const width = this.cachedRootRectWidth || this.root.clientWidth;\n    const height = this.cachedRootRectHeight || this.root.clientHeight;\n    return { left: cameraX, top: cameraY, right: cameraX + width, bottom: cameraY + height };\n  }",
  "viewport bounds cache",
);

replaceIn("scene",
  "  private screenToWorld(clientX: number, clientY: number): Vector2 { const rect = this.canvas.getBoundingClientRect(); const camera = this.getCameraOffset(); return clampPositionToTile({ x: clientX - rect.left + camera.x, y: clientY - rect.top + camera.y }); }",
  "  private screenToWorld(clientX: number, clientY: number): Vector2 {\n    const camera = this.getCameraOffset();\n    return clampPositionToTile({ x: clientX - this.cachedCanvasClientLeft + camera.x, y: clientY - this.cachedCanvasClientTop + camera.y });\n  }",
  "screen to world cache",
);

replaceIn("scene",
  "  private draw() {\n    const rect = this.root.getBoundingClientRect();\n    const ctx = this.context;\n    ctx.clearRect(0, 0, rect.width, rect.height);\n    const camera = this.getCameraOffset();\n    const viewport = this.getViewportBounds(camera.x, camera.y);\n    const now = performance.now();\n    this.tileMapRenderer.draw(ctx, rect.width, rect.height, camera.x, camera.y);",
  "  private draw() {\n    const width = this.cachedRootRectWidth || this.root.clientWidth;\n    const height = this.cachedRootRectHeight || this.root.clientHeight;\n    const ctx = this.context;\n    ctx.clearRect(0, 0, width, height);\n    const camera = this.getCameraOffset();\n    const viewport = this.getViewportBounds(camera.x, camera.y);\n    const now = performance.now();\n    this.tileMapRenderer.draw(ctx, width, height, camera.x, camera.y);",
  "draw cached dims",
);

replaceIn("scene",
  "    this.previousCreatureHpById = new Map(normalizedSnapshot.creatures.map((creature) => [creature.id, creature.hp]));\n    this.snapshot = normalizedSnapshot;\n    this.localPlayerId = localPlayerId;\n    this.localEquippedWeaponItemId = readStoredWeaponItemId();\n    window.dispatchEvent(new CustomEvent(\"palpalworld:world_snapshot\", { detail: { snapshot: normalizedSnapshot, localPlayerId } }));\n  }",
  "    const __liveCreatureIds = new Set<string>();\n    for (const creature of normalizedSnapshot.creatures) {\n      this.previousCreatureHpById.set(creature.id, creature.hp);\n      __liveCreatureIds.add(creature.id);\n    }\n    for (const id of Array.from(this.previousCreatureHpById.keys())) {\n      if (!__liveCreatureIds.has(id)) this.previousCreatureHpById.delete(id);\n    }\n    this.snapshot = normalizedSnapshot;\n    this.localPlayerId = localPlayerId;\n    this.localEquippedWeaponItemId = readStoredWeaponItemId();\n    this.cachedSceneBuildings = null;\n    const __now = performance.now();\n    if (__now - this.lastSnapshotDispatchAt >= this.snapshotDispatchIntervalMs) {\n      this.lastSnapshotDispatchAt = __now;\n      window.dispatchEvent(new CustomEvent(\"palpalworld:world_snapshot\", { detail: { snapshot: normalizedSnapshot, localPlayerId } }));\n    }\n  }",
  "snapshot throttle + mutated maps",
);

replaceIn("scene",
  "      if (moved) this.movingPlayerIds.add(player.id);\n      this.previousPlayerPositions.set(player.id, { ...player.position });",
  "      if (moved) this.movingPlayerIds.add(player.id);\n      const __prev = this.previousPlayerPositions.get(player.id);\n      if (__prev) { __prev.x = player.position.x; __prev.y = player.position.y; }\n      else this.previousPlayerPositions.set(player.id, { x: player.position.x, y: player.position.y });",
  "reuse player position objects",
);

replaceIn("scene",
  "  private getSceneBuildings() {\n    const localBuildings = (this.snapshot?.buildings ?? []).filter((building) => !this.hiddenBuildingIds.has(building.id));\n    const localIds = new Set(localBuildings.map((building) => building.id));\n    const remoteBuildings = this.remoteBuildings.filter((building) => !localIds.has(building.id) && !this.hiddenBuildingIds.has(building.id));\n    return [...localBuildings, ...remoteBuildings];\n  }",
  "  private getSceneBuildings() {\n    if (this.cachedSceneBuildings) return this.cachedSceneBuildings;\n    const localBuildings = (this.snapshot?.buildings ?? []).filter((building) => !this.hiddenBuildingIds.has(building.id));\n    const localIds = new Set(localBuildings.map((building) => building.id));\n    const remoteBuildings = this.remoteBuildings.filter((building) => !localIds.has(building.id) && !this.hiddenBuildingIds.has(building.id));\n    const combined = remoteBuildings.length > 0 ? [...localBuildings, ...remoteBuildings] : localBuildings;\n    this.cachedSceneBuildings = combined;\n    return combined;\n  }",
  "scene buildings cache",
);

replaceIn("scene",
  "    this.hiddenBuildingIds.add(buildingId);\n    this.remoteBuildings = this.remoteBuildings.filter((building) => building.id !== buildingId);\n    if (this.hoverBuildingId === buildingId) this.hoverBuildingId = null;",
  "    this.hiddenBuildingIds.add(buildingId);\n    this.remoteBuildings = this.remoteBuildings.filter((building) => building.id !== buildingId);\n    this.cachedSceneBuildings = null;\n    if (this.hoverBuildingId === buildingId) this.hoverBuildingId = null;",
  "invalidate buildings cache on dismantle",
);

replaceIn("scene",
  "    this.remoteBuildings = (event.detail?.buildings ?? []).filter((building) => {\n      if (!building?.id || this.hiddenBuildingIds.has(building.id)) return false;\n      if (localIds.has(building.id)) return false;\n      return isSameTile(getTileRef(building), this.getCurrentTile());\n    });\n  };",
  "    this.remoteBuildings = (event.detail?.buildings ?? []).filter((building) => {\n      if (!building?.id || this.hiddenBuildingIds.has(building.id)) return false;\n      if (localIds.has(building.id)) return false;\n      return isSameTile(getTileRef(building), this.getCurrentTile());\n    });\n    this.cachedSceneBuildings = null;\n  };",
  "invalidate buildings cache on remote",
);

replaceIn("scene",
  "  dismantleDemolitionSelectionForUi() {\n    if (this.demolitionSelectedPartIds.size <= 0) return;\n    const selectedIds = new Set(this.demolitionSelectedPartIds);\n    this.placedBuildParts = writeStoredBuildParts(this.placedBuildParts.filter((part) => !selectedIds.has(part.id)));",
  "  dismantleDemolitionSelectionForUi() {\n    if (this.demolitionSelectedPartIds.size <= 0) return;\n    const selectedIds = new Set(this.demolitionSelectedPartIds);\n    this.placedBuildParts = removeBuildParts(selectedIds);",
  "dismantle uses removeBuildParts",
);

replaceIn("scene",
  "import { createPlacedBuildPart, getBuildPartsForHouse, getBuildPartsForTile, moveBuildPart, readStoredBuildParts, removeBuildPart, rotatePlacedBuildPart, writeStoredBuildParts } from \"../buildings/buildPartStore\";",
  "import { createPlacedBuildPart, getBuildPartsForHouse, getBuildPartsForTile, moveBuildPart, readStoredBuildParts, removeBuildPart, removeBuildParts, rotatePlacedBuildPart, writeStoredBuildParts } from \"../buildings/buildPartStore\";",
  "import removeBuildParts",
);

// ─────────────────────────────────────────────────────────────────────────────
// GameClientTileDemoStation optimizations
// ─────────────────────────────────────────────────────────────────────────────

replaceIn("client",
  "function getMountedPlayerMoveSpeed() {\n  if (typeof window === \"undefined\") return 180;\n  const mountedPetItemId = window.localStorage.getItem(mountedPetStorageKey);\n  if (!mountedPetItemId) return 180;\n  const speciesId = getSpeciesIdFromPetItemId(mountedPetItemId);\n  return getPetSpeciesDefinition(speciesId).mountSpeed ?? 260;\n}",
  "function getMountedPlayerMoveSpeed() {\n  if (typeof window === \"undefined\") return 180;\n  const mountedPetItemId = window.localStorage.getItem(mountedPetStorageKey);\n  if (!mountedPetItemId) return 180;\n  const speciesId = getSpeciesIdFromPetItemId(mountedPetItemId);\n  return getPetSpeciesDefinition(speciesId).mountSpeed ?? 260;\n}\nlet cachedMountedPetItemId: string | null = null;\nlet cachedMountedPlayerMoveSpeed: number | null = null;\nfunction readCachedMountedPlayerMoveSpeed() {\n  if (typeof window === \"undefined\") return 180;\n  const mountedPetItemId = window.localStorage.getItem(mountedPetStorageKey);\n  if (mountedPetItemId !== cachedMountedPetItemId || cachedMountedPlayerMoveSpeed === null) {\n    cachedMountedPetItemId = mountedPetItemId;\n    cachedMountedPlayerMoveSpeed = mountedPetItemId ? getMountedPlayerMoveSpeed() : 180;\n  }\n  return cachedMountedPlayerMoveSpeed;\n}\nfunction invalidateMountedPlayerMoveSpeed() {\n  cachedMountedPetItemId = null;\n  cachedMountedPlayerMoveSpeed = null;\n}",
  "cached mount speed helpers",
);

replaceAllIn("client",
  "let cachedMountedPlayerMoveSpeed: number | null = null;\nfunction readCachedMountedPlayerMoveSpeed() {\n  if (cachedMountedPlayerMoveSpeed === null) cachedMountedPlayerMoveSpeed = getMountedPlayerMoveSpeed();\n  return cachedMountedPlayerMoveSpeed;\n}\nfunction invalidateMountedPlayerMoveSpeed() {\n  cachedMountedPlayerMoveSpeed = null;\n}",
  "let cachedMountedPetItemId: string | null = null;\nlet cachedMountedPlayerMoveSpeed: number | null = null;\nfunction readCachedMountedPlayerMoveSpeed() {\n  if (typeof window === \"undefined\") return 180;\n  const mountedPetItemId = window.localStorage.getItem(mountedPetStorageKey);\n  if (mountedPetItemId !== cachedMountedPetItemId || cachedMountedPlayerMoveSpeed === null) {\n    cachedMountedPetItemId = mountedPetItemId;\n    cachedMountedPlayerMoveSpeed = mountedPetItemId ? getMountedPlayerMoveSpeed() : 180;\n  }\n  return cachedMountedPlayerMoveSpeed;\n}\nfunction invalidateMountedPlayerMoveSpeed() {\n  cachedMountedPetItemId = null;\n  cachedMountedPlayerMoveSpeed = null;\n}",
  "upgrade cached mount speed helpers",
);

replaceIn("client",
  "  const lastDemoAttackAtRef = useRef(0);\n  const lastUiSnapshotAtRef = useRef(0);",
  "  const cachedBuildPartsRef = useRef<PlacedBuildPart[] | null>(null);\n  const handleDemoAttackRef = useRef<(() => void) | null>(null);\n  const lastCreatureAiAtRef = useRef(performance.now());\n  const lastDemoAttackAtRef = useRef(0);\n  const lastUiSnapshotAtRef = useRef(0);",
  "cached refs",
);

replaceIn("client",
  "  useEffect(() => {\n    const handleBuildFloorState = (event: Event) => {",
  "  useEffect(() => {\n    cachedBuildPartsRef.current = readStoredBuildParts();\n    const handleBuildPartsChanged = (event: Event) => {\n      const customEvent = event as CustomEvent<{ parts?: PlacedBuildPart[] }>;\n      cachedBuildPartsRef.current = customEvent.detail?.parts ?? readStoredBuildParts();\n    };\n    const handleMountStorage = (event: StorageEvent) => {\n      if (event.key === mountedPetStorageKey) invalidateMountedPlayerMoveSpeed();\n    };\n    const handleMountChanged = () => invalidateMountedPlayerMoveSpeed();\n    window.addEventListener(\"palpalworld:build-parts-changed\", handleBuildPartsChanged);\n    window.addEventListener(\"palpalworld:mounted-pet-changed\", handleMountChanged);\n    window.addEventListener(\"storage\", handleMountStorage);\n    return () => {\n      window.removeEventListener(\"palpalworld:build-parts-changed\", handleBuildPartsChanged);\n      window.removeEventListener(\"palpalworld:mounted-pet-changed\", handleMountChanged);\n      window.removeEventListener(\"storage\", handleMountStorage);\n    };\n  }, []);\n  useEffect(() => {\n    const handleBuildFloorState = (event: Event) => {",
  "build-parts cache listener",
);

replaceIn("client",
  "      const playerMoveSpeed = getMountedPlayerMoveSpeed();\n      demoDirectionRef.current = directionFromMovement(normalized, demoDirectionRef.current);\n      const movementStep = { x: normalized.x * playerMoveSpeed * deltaSeconds, y: normalized.y * playerMoveSpeed * deltaSeconds };\n      const buildParts = getBuildPartsForTile(readStoredBuildParts(), demoTileRef.current);",
  "      const playerMoveSpeed = readCachedMountedPlayerMoveSpeed();\n      demoDirectionRef.current = directionFromMovement(normalized, demoDirectionRef.current);\n      const movementStep = { x: normalized.x * playerMoveSpeed * deltaSeconds, y: normalized.y * playerMoveSpeed * deltaSeconds };\n      const __sourceParts = cachedBuildPartsRef.current ?? readStoredBuildParts();\n      const buildParts = getBuildPartsForTile(__sourceParts, demoTileRef.current);",
  "movement tick perf with collision",
);

replaceIn("client",
  "      const playerMoveSpeed = getMountedPlayerMoveSpeed();\n      demoDirectionRef.current = directionFromMovement(normalized, demoDirectionRef.current);\n      const next = clampPositionToTile({ x: demoPositionRef.current.x + normalized.x * playerMoveSpeed * deltaSeconds, y: demoPositionRef.current.y + normalized.y * playerMoveSpeed * deltaSeconds });",
  "      const playerMoveSpeed = readCachedMountedPlayerMoveSpeed();\n      demoDirectionRef.current = directionFromMovement(normalized, demoDirectionRef.current);\n      const next = clampPositionToTile({ x: demoPositionRef.current.x + normalized.x * playerMoveSpeed * deltaSeconds, y: demoPositionRef.current.y + normalized.y * playerMoveSpeed * deltaSeconds });",
  "movement tick mount speed",
);

replaceIn("client",
  "      demoPositionRef.current.x = next.x;\n      demoPositionRef.current.y = next.y;\n      moveDemoCreatures(getCurrentCreatures(), deltaSeconds, now, demoPositionRef.current);\n      applyDemoSnapshot(false);\n      lastTick = now;",
  "      demoPositionRef.current.x = next.x;\n      demoPositionRef.current.y = next.y;\n      if (now - lastCreatureAiAtRef.current >= 80) {\n        const creatureDeltaSeconds = Math.min(0.16, (now - lastCreatureAiAtRef.current) / 1000);\n        moveDemoCreatures(getCurrentCreatures(), creatureDeltaSeconds, now, demoPositionRef.current);\n        lastCreatureAiAtRef.current = now;\n      }\n      if (input.primary) handleDemoAttackRef.current?.();\n      applyDemoSnapshot(false);\n      lastTick = now;",
  "throttle creature AI and merge attack",
);

replaceIn("client",
  "  useEffect(() => {\n    let animationFrame = 0;\n    let lastSent = 0;\n    const tickInput = (now: number) => { const input = inputRef.current; if (now - lastSent >= 50 && input.primary) { handleDemoAttack(); lastSent = now; } animationFrame = requestAnimationFrame(tickInput); };\n    animationFrame = requestAnimationFrame(tickInput);\n    return () => cancelAnimationFrame(animationFrame);\n  }, [handleDemoAttack]);",
  "  useEffect(() => { handleDemoAttackRef.current = handleDemoAttack; }, [handleDemoAttack]);",
  "drop separate attack rAF",
);

if (sceneChanged) fs.writeFileSync(scenePath, scene);
if (clientChanged) fs.writeFileSync(clientPath, client);