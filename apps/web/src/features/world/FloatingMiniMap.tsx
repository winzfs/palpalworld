import type { WorldSnapshot } from "@palpalworld/shared";
import { MiniMapPanel } from "./MiniMapPanel";

export function FloatingMiniMap({ snapshot }: { snapshot: WorldSnapshot | null }) {
  const player = snapshot?.players[0] ?? null;

  return (
    <aside className="floating-minimap" aria-label="미니맵">
      <MiniMapPanel snapshot={snapshot} localPlayerId={player?.id ?? null} />
      <style>{`
        .floating-minimap {
          pointer-events: auto;
          position: fixed;
          right: calc(12px + env(safe-area-inset-right));
          top: calc(12px + env(safe-area-inset-top));
          width: 210px;
          max-height: min(58vh, 420px);
          overflow: auto;
          z-index: 80;
          border: 2px solid rgba(139, 111, 50, 0.95);
          border-radius: 12px;
          background: rgba(20, 18, 28, 0.92);
          box-shadow: 0 0 0 2px rgba(0,0,0,.45), 0 18px 50px rgba(0,0,0,.35);
          backdrop-filter: blur(10px);
          padding: 8px;
        }

        .floating-minimap .minimap-grid--tiles,
        .floating-minimap .minimap-portals,
        .floating-minimap .minimap-note {
          display: none;
        }

        .floating-minimap .minimap-map {
          min-height: 150px;
        }

        @media (max-width: 760px) {
          .floating-minimap {
            top: calc(8px + env(safe-area-inset-top));
            right: calc(8px + env(safe-area-inset-right));
            width: 150px;
            max-height: 36vh;
            padding: 6px;
          }

          .floating-minimap .minimap-map {
            min-height: 116px;
          }

          .floating-minimap .minimap-legend,
          .floating-minimap .minimap-stats,
          .floating-minimap .minimap-panel__header span {
            display: none;
          }
        }
      `}</style>
    </aside>
  );
}
