const fs = require("fs");
const path = require("path");

const clientPath = path.join(__dirname, "..", "src", "features", "game", "GameClientTileDemoStation.tsx");
const cssPath = path.join(__dirname, "..", "src", "app", "hud-menu.css");
let client = fs.readFileSync(clientPath, "utf8");
let css = fs.readFileSync(cssPath, "utf8");
let clientChanged = false;
let cssChanged = false;

function replaceClient(search, replacement, label) {
  if (client.includes(replacement)) {
    console.log(`[patch-mobile-ui-quickslots-online] already-patched client ${label}`);
    return;
  }
  if (!client.includes(search)) {
    console.log(`[patch-mobile-ui-quickslots-online] skipped client ${label}`);
    return;
  }
  client = client.replace(search, replacement);
  clientChanged = true;
  console.log(`[patch-mobile-ui-quickslots-online] patched client ${label}`);
}

function replaceCss(search, replacement, label) {
  if (css.includes(replacement)) {
    console.log(`[patch-mobile-ui-quickslots-online] already-patched css ${label}`);
    return;
  }
  if (!css.includes(search)) {
    console.log(`[patch-mobile-ui-quickslots-online] skipped css ${label}`);
    return;
  }
  css = css.replace(search, replacement);
  cssChanged = true;
  console.log(`[patch-mobile-ui-quickslots-online] patched css ${label}`);
}

function appendCss(block, marker, label) {
  if (css.includes(marker)) {
    console.log(`[patch-mobile-ui-quickslots-online] already-patched css ${label}`);
    return;
  }
  css += `\n\n${block}\n`;
  cssChanged = true;
  console.log(`[patch-mobile-ui-quickslots-online] appended css ${label}`);
}

replaceClient("const quickSlotCount = 5;", "const quickSlotCount = 8;", "quick slot count 8");

replaceClient(
  `const mountedPetStorageKey = "palpalworld.demo.mountedPetItemId";`,
  `const mountedPetStorageKey = "palpalworld.demo.mountedPetItemId";
const onlineBadgePositionStorageKey = "palpalworld.demo.onlineBadgePosition";`,
  "online badge storage key",
);

replaceClient(
  `function clampHudButtonPosition(position: { x: number; y: number }) {
  if (typeof window === "undefined") return position;
  return { x: Math.max(4, Math.min(window.innerWidth - 48, position.x)), y: Math.max(4, Math.min(window.innerHeight - 48, position.y)) };
}`,
  `function clampHudButtonPosition(position: { x: number; y: number }) {
  if (typeof window === "undefined") return position;
  return { x: Math.max(4, Math.min(window.innerWidth - 48, position.x)), y: Math.max(4, Math.min(window.innerHeight - 48, position.y)) };
}
function getDefaultOnlineBadgePosition() {
  if (typeof window === "undefined") return { x: 8, y: 8 };
  const minimapWidth = window.innerWidth <= 420 ? 92 : window.innerWidth <= 720 ? 104 : 132;
  const minimapRight = window.innerWidth <= 720 ? 8 : 12;
  return clampOnlineBadgePosition({ x: window.innerWidth - minimapWidth - minimapRight - 82, y: window.innerWidth <= 720 ? 8 : 12 });
}
function clampOnlineBadgePosition(position: { x: number; y: number }) {
  if (typeof window === "undefined") return position;
  return { x: Math.max(4, Math.min(window.innerWidth - 96, position.x)), y: Math.max(4, Math.min(window.innerHeight - 36, position.y)) };
}
function readOnlineBadgePosition() {
  if (typeof window === "undefined") return { x: 8, y: 8 };
  try {
    const saved = window.localStorage.getItem(onlineBadgePositionStorageKey);
    if (saved) {
      const parsed = JSON.parse(saved) as { x?: number; y?: number };
      if (Number.isFinite(parsed.x) && Number.isFinite(parsed.y)) return clampOnlineBadgePosition({ x: Number(parsed.x), y: Number(parsed.y) });
    }
  } catch {}
  return getDefaultOnlineBadgePosition();
}
function saveOnlineBadgePosition(position: { x: number; y: number }) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(onlineBadgePositionStorageKey, JSON.stringify(position)); } catch {}
}`,
  "online badge helpers",
);

const minimapLine = '        <section className={`hud-minimap hud-minimap--${minimapSize}`} aria-label="미니맵"><button className="hud-minimap__size-button" onClick={cycleMinimapSize} aria-label="미니맵 크기 변경">{minimapSizeLabels[minimapSize]}</button><MiniMapPanel snapshot={snapshot} localPlayerId={demoPlayerId} /></section>';
replaceClient(
  minimapLine,
  `        <OnlineCountBadge count={snapshot?.players.length ?? 1} />\n${minimapLine}`,
  "online count badge render",
);

replaceClient(
  `function FloatingQuickButton({ id, onOpen }: { id: QuickButtonId; onOpen: () => void }) {`,
  `function OnlineCountBadge({ count }: { count: number }) {
  const [position, setPosition] = useState(() => readOnlineBadgePosition());
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; x: number; y: number } | null>(null);
  useEffect(() => { setPosition((current) => clampOnlineBadgePosition(current)); }, []);
  return (
    <button
      className="hud-online-badge"
      style={{ left: position.x, top: position.y }}
      aria-label={\`온라인 \${count}명\`}
      title="드래그해서 위치 이동"
      onPointerDown={(event) => {
        event.preventDefault();
        dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, x: position.x, y: position.y };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        const next = clampOnlineBadgePosition({ x: drag.x + event.clientX - drag.startX, y: drag.y + event.clientY - drag.startY });
        setPosition(next);
      }}
      onPointerUp={(event) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        dragRef.current = null;
        event.currentTarget.releasePointerCapture(event.pointerId);
        const next = clampOnlineBadgePosition({ x: drag.x + event.clientX - drag.startX, y: drag.y + event.clientY - drag.startY });
        setPosition(next);
        saveOnlineBadgePosition(next);
      }}
      onPointerCancel={() => { dragRef.current = null; }}
    >
      <span>온라인</span><strong>{count}</strong>
    </button>
  );
}

function FloatingQuickButton({ id, onOpen }: { id: QuickButtonId; onOpen: () => void }) {`,
  "online count badge component",
);

replaceCss(
  `.quick-slot-bar {
  pointer-events: auto;
  position: absolute;
  right: calc(14px + var(--safe-right));
  bottom: calc(110px + var(--safe-bottom));
  z-index: 14;
  display: grid;
  gap: 6px;
}`,
  `.quick-slot-bar {
  pointer-events: auto;
  position: absolute;
  right: calc(14px + var(--safe-right));
  bottom: calc(110px + var(--safe-bottom));
  z-index: 14;
  display: grid;
  grid-template-rows: repeat(4, 42px);
  grid-auto-flow: column;
  grid-auto-columns: 42px;
  gap: 6px;
}`,
  "hud quickslot 4 rows 2 columns",
);

replaceCss(
  `.inventory-quick-assign div { display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; }`,
  `.inventory-quick-assign div { display: grid; grid-template-columns: repeat(4, minmax(30px, 1fr)); gap: 4px; }`,
  "inventory quick assign 4 columns 2 rows",
);

replaceCss(
  `  .quick-slot-bar { right: calc(10px + var(--safe-right)); bottom: calc(96px + var(--safe-bottom)); gap: 5px; }
  .quick-slot { width: 36px; height: 36px; border-radius: 8px; }`,
  `  .quick-slot-bar {
    right: calc(10px + var(--safe-right));
    bottom: calc(96px + var(--safe-bottom));
    grid-template-rows: repeat(4, 36px);
    grid-auto-columns: 36px;
    gap: 5px;
  }
  .quick-slot { width: 36px; height: 36px; border-radius: 8px; }`,
  "mobile hud quickslot 4 rows 2 columns",
);

appendCss(`/* mobile online count badge */
.hud-online-badge {
  pointer-events: auto;
  position: absolute;
  z-index: 17;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-width: 78px;
  height: 28px;
  padding: 4px 8px;
  border: 1px solid rgb(125 211 252 / 0.55);
  border-radius: 999px;
  background: rgb(8 47 73 / 0.64);
  color: rgb(224 242 254 / 0.96);
  box-shadow: 0 8px 20px rgb(0 0 0 / 0.28), inset 0 0 0 1px rgb(255 255 255 / 0.08);
  backdrop-filter: blur(8px);
  cursor: grab;
  touch-action: none;
  user-select: none;
}
.hud-online-badge:active { cursor: grabbing; transform: scale(0.97); }
.hud-online-badge span { font-size: 10px; font-weight: 900; }
.hud-online-badge strong { color: #bbf7d0; font-size: 13px; font-weight: 950; }

@media (max-width: 720px) {
  .hud-online-badge { min-width: 68px; height: 24px; padding: 3px 7px; gap: 4px; }
  .hud-online-badge span { font-size: 9px; }
  .hud-online-badge strong { font-size: 12px; }
  .inventory-quick-assign div { grid-template-columns: repeat(4, minmax(28px, 1fr)); }
}
`, "/* mobile online count badge */", "online badge css");

if (clientChanged) fs.writeFileSync(clientPath, client);
if (cssChanged) fs.writeFileSync(cssPath, css);
