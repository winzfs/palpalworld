const fs = require("fs");
const path = require("path");

function patchFile(relativePath, mutator) {
  const target = path.join(__dirname, "..", "..", "..", relativePath);
  let source = fs.readFileSync(target, "utf8");
  const before = source;
  source = mutator(source);
  if (source !== before) {
    fs.writeFileSync(target, source);
    console.log(`[patch-mounted-pet-sync-and-smooth-crafting] patched ${relativePath}`);
  } else {
    console.log(`[patch-mounted-pet-sync-and-smooth-crafting] no changes ${relativePath}`);
  }
}

function replaceOnce(source, search, replacement, label) {
  if (source.includes(replacement)) return source;
  if (!source.includes(search)) {
    console.log(`[patch-mounted-pet-sync-and-smooth-crafting] skipped ${label}`);
    return source;
  }
  return source.replace(search, replacement);
}

function replaceOnceUnless(source, search, replacement, guard, label) {
  if (source.includes(guard)) return source;
  return replaceOnce(source, search, replacement, label);
}

function dedupeFunction(source, functionName) {
  const pattern = new RegExp(`\\nfunction ${functionName}\\(\\) \\{[\\s\\S]*?\\n\\}`, "g");
  let seen = false;
  return source.replace(pattern, (match) => {
    if (seen) return "";
    seen = true;
    return match;
  });
}

patchFile("packages/shared/src/index.ts", (source) => {
  source = replaceOnce(
    source,
    `  mountedCreatureId?: EntityId;`,
    `  mountedCreatureId?: EntityId;
  mountedPetItemId?: ItemId;`,
    "shared mountedPetItemId type",
  );
  return source;
});

patchFile("apps/web/src/features/multiplayer/supabaseMultiplayer.ts", (source) => {
  source = replaceOnce(source, `  updated_at: string;`, `  updated_at: string;
  mounted_pet_item_id?: string | null;`, "presence row mounted pet column");
  source = replaceOnce(source, `  currentTile: MapTileRef;
};`, `  currentTile: MapTileRef;
  mountedPetItemId?: string | null;
};`, "presence payload mounted pet field");
  source = replaceOnce(source, `    maxHp: 100,
  } as PlayerPublicState;`, `    maxHp: 100,
    mountedPetItemId: row.mounted_pet_item_id ?? undefined,
  } as PlayerPublicState;`, "rowToPlayer mounted pet field");
  source = replaceOnce(source, `    updated_at: new Date().toISOString(),
  });`, `    updated_at: new Date().toISOString(),
    mounted_pet_item_id: payload.mountedPetItemId ?? null,
  });`, "upsert mounted pet field");
  source = replaceOnce(source, `.select("player_id,nickname,x,y,direction,region_id,tile_x,tile_y,updated_at")`, `.select("player_id,nickname,x,y,direction,region_id,tile_x,tile_y,updated_at,mounted_pet_item_id")`, "select mounted pet column");
  return source;
});

patchFile("apps/web/src/features/multiplayer/MultiplayerOverlay.tsx", (source) => {
  source = replaceOnce(source, `const chatPanelCollapsedStorageKey = "palpalworld.ui.chatPanelCollapsed";`, `const chatPanelCollapsedStorageKey = "palpalworld.ui.chatPanelCollapsed";
const mountedPetStorageKey = "palpalworld.demo.mountedPetItemId";`, "mounted pet storage key");
  source = replaceOnceUnless(source, `function getViewportSize() {`, `function readMountedPetItemId() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(mountedPetStorageKey);
}

function getViewportSize() {`, "function readMountedPetItemId()", "read mounted pet helper");
  source = dedupeFunction(source, "readMountedPetItemId");
  source = replaceOnce(source, `      await upsertLocalPresence(client, { playerId, nickname: localPlayer.nickname, position: localPlayer.position, direction: localPlayer.direction, currentTile: localPlayer.currentTile as MapTileRef });`, `      await upsertLocalPresence(client, { playerId, nickname: localPlayer.nickname, position: localPlayer.position, direction: localPlayer.direction, currentTile: localPlayer.currentTile as MapTileRef, mountedPetItemId: readMountedPetItemId() });`, "publish mounted pet presence");
  return source;
});

patchFile("apps/web/src/features/game/GameClientTileDemoStation.tsx", (source) => {
  source = replaceOnceUnless(source, `function getMountedPlayerMoveSpeed() {`, `function readMountedPetItemId() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(mountedPetStorageKey);
}
function getMountedPlayerMoveSpeed() {`, "function readMountedPetItemId()", "demo mounted pet reader");
  source = dedupeFunction(source, "readMountedPetItemId");
  source = replaceOnce(source, `  const mountedPetItemId = window.localStorage.getItem(mountedPetStorageKey);`, `  const mountedPetItemId = readMountedPetItemId();`, "demo mounted speed uses reader");
  source = replaceOnce(source, `return { worldId: "offline-demo", serverTime: Date.now(), players: [{ id: demoPlayerId, nickname: nickname === "..." ? "Demo" : nickname, position, direction, currentTile, hp: 100, maxHp: 100 } as any], creatures, resources, buildings };`, `return { worldId: "offline-demo", serverTime: Date.now(), players: [{ id: demoPlayerId, nickname: nickname === "..." ? "Demo" : nickname, position, direction, currentTile, hp: 100, maxHp: 100, mountedPetItemId: readMountedPetItemId() } as any], creatures, resources, buildings };`, "demo snapshot mounted pet");
  return source;
});

patchFile("apps/web/src/features/rendering/SpriteRenderer.ts", (source) => {
  source = replaceOnce(source, `    const mountedPetSpeciesId = isLocal ? getMountedPetSpeciesId(readMountedPetItemId()) : null;`, `    const mountedPetItemId = (player as PlayerPublicState & { mountedPetItemId?: string | null }).mountedPetItemId ?? (isLocal ? readMountedPetItemId() : null);
    const mountedPetSpeciesId = getMountedPetSpeciesId(mountedPetItemId);`, "renderer remote mounted pet");
  return source;
});

patchFile("apps/web/src/features/crafting/CraftingPanel.tsx", (source) => {
  const oldProgress = '  const progress = Math.max(0, Math.min(100, Math.round(((now - startedAt) / totalMs) * 100)));\n  return <div className="crafting-queue__bar" aria-label={`제작 진행도 ${progress}%`}><span style={{ width: `${progress}%` }} /></div>;';
  const newProgress = '  const progress = Math.max(0, Math.min(100, ((now - startedAt) / totalMs) * 100));\n  const labelProgress = Math.round(progress);\n  return <div className="crafting-queue__bar" aria-label={`제작 진행도 ${labelProgress}%`}><span style={{ width: `${progress.toFixed(2)}%` }} /></div>;';
  source = replaceOnce(source, oldProgress, newProgress, "smooth progress precision");
  source = replaceOnceUnless(source, `  useEffect(() => {
    const timer = window.setInterval(() => {`, `  useEffect(() => {
    let animationFrame = 0;
    const tickProgress = () => {
      const current = queueStateRef.current;
      const hasActiveJob = Object.values(current).some((jobs) => (jobs ?? []).some((job) => Date.now() < job.finishesAt));
      if (hasActiveJob) setNow(Date.now());
      animationFrame = requestAnimationFrame(tickProgress);
    };
    animationFrame = requestAnimationFrame(tickProgress);
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {`, "const tickProgress = () =>", "raf smooth crafting now");
  return source;
});

patchFile("apps/web/src/app/globals.css", (source) => {
  if (source.includes(".crafting-queue__bar span") && !source.includes("will-change: width")) {
    source = source.replace(/(\.crafting-queue__bar span\s*\{[^}]*)(\})/s, (match, body, end) => `${body}\n  will-change: width;\n${end}`);
  }
  return source;
});
