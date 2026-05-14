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
          position: absolute;
          right: calc(12px + env(safe-area-inset-right));
          top: calc(12px + env(safe-area-inset-top));
          width: min(320px, calc(100vw - 24px));
          max-height: calc(100vh - 24px);
          overflow: auto;
          z-index: 12;
          border: 2px solid rgba(139, 111, 50, 0.95);
          border-radius: 12px;
          background: rgba(20, 18, 28, 0.9);
          box-shadow: 0 0 0 2px rgba(0,0,0,.45), 0 18px 50px rgba(0,0,0,.35);
          backdrop-filter: blur(10px);
          padding: 10px;
        }

        @media (max-width: 760px) {
          .floating-minimap {
            top: calc(8px + env(safe-area-inset-top));
            right: calc(8px + env(safe-area-inset-right));
            width: min(230px, calc(100vw - 16px));
            max-height: 42vh;
            padding: 8px;
          }
        }
      `}</style>
    </aside>
  );
}
