const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'src', 'features', 'game', 'GameClientTileDemoStation.tsx');
let source = fs.readFileSync(target, 'utf8');
let changed = false;

function replaceOnce(search, replacement, label) {
  if (source.includes(replacement)) {
    console.log(`[patch-creature-sync-status-badge] already patched ${label}`);
    return;
  }
  if (!source.includes(search)) {
    console.log(`[patch-creature-sync-status-badge] skipped ${label}`);
    return;
  }
  source = source.replace(search, replacement);
  changed = true;
  console.log(`[patch-creature-sync-status-badge] patched ${label}`);
}

replaceOnce(
  '  const [quickSlots, setQuickSlots] = useState<(string | null)[]>(() => Array.from({ length: quickSlotCount }, () => null));\n',
  '  const [quickSlots, setQuickSlots] = useState<(string | null)[]>(() => Array.from({ length: quickSlotCount }, () => null));\n  const [creatureSyncStatus, setCreatureSyncStatus] = useState("creature sync: init");\n',
  'sync status state',
);

replaceOnce(
  '  useEffect(() => {\n    const handleInventoryChanged = (event: Event) => { const customEvent = event as CustomEvent<{ inventory?: InventoryState }>; if (customEvent.detail?.inventory) setInventory(customEvent.detail.inventory); };\n    window.addEventListener("palpalworld:inventory-changed", handleInventoryChanged);\n    return () => window.removeEventListener("palpalworld:inventory-changed", handleInventoryChanged);\n  }, []);\n',
  '  useEffect(() => {\n    const handleInventoryChanged = (event: Event) => { const customEvent = event as CustomEvent<{ inventory?: InventoryState }>; if (customEvent.detail?.inventory) setInventory(customEvent.detail.inventory); };\n    window.addEventListener("palpalworld:inventory-changed", handleInventoryChanged);\n    return () => window.removeEventListener("palpalworld:inventory-changed", handleInventoryChanged);\n  }, []);\n  useEffect(() => {\n    const handleCreatureSyncStatus = (event: Event) => {\n      const detail = (event as CustomEvent<{ ok?: boolean; count?: number; error?: string }>).detail ?? {};\n      setCreatureSyncStatus(detail.ok ? `creature sync: ok ${detail.count ?? 0}` : `creature sync: fail ${detail.error ?? "unknown"}`);\n    };\n    window.addEventListener("palpalworld:creature-sync-status", handleCreatureSyncStatus);\n    return () => window.removeEventListener("palpalworld:creature-sync-status", handleCreatureSyncStatus);\n  }, []);\n',
  'sync status listener',
);

replaceOnce(
  '        <button className={pixiStageEnabled ? "hud-pixi-toggle hud-pixi-toggle--on" : "hud-pixi-toggle"} onClick={handleTogglePixiStage} aria-pressed={pixiStageEnabled}>{pixiStageEnabled ? "Pixi ON" : "Pixi OFF"}</button>\n',
  '        <button className={pixiStageEnabled ? "hud-pixi-toggle hud-pixi-toggle--on" : "hud-pixi-toggle"} onClick={handleTogglePixiStage} aria-pressed={pixiStageEnabled}>{pixiStageEnabled ? "Pixi ON" : "Pixi OFF"}</button>\n        <div className="creature-sync-status-badge">{creatureSyncStatus}</div>\n',
  'sync status badge',
);

if (changed) fs.writeFileSync(target, source);
else console.log('[patch-creature-sync-status-badge] no changes');
