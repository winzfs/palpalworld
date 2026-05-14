"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { WorldSnapshot } from "@palpalworld/shared";
import { MiniMapPanel } from "./MiniMapPanel";

type SnapshotEvent = CustomEvent<{ snapshot: WorldSnapshot; localPlayerId: string | null }>;

export function FloatingMiniMap({ snapshot }: { snapshot?: WorldSnapshot | null }) {
  const [mounted, setMounted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [liveSnapshot, setLiveSnapshot] = useState<WorldSnapshot | null>(snapshot ?? null);
  const [localPlayerId, setLocalPlayerId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (snapshot) setLiveSnapshot(snapshot);
  }, [snapshot]);

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as SnapshotEvent;
      setLiveSnapshot(customEvent.detail.snapshot);
      setLocalPlayerId(customEvent.detail.localPlayerId);
    };
    window.addEventListener("palpalworld:world_snapshot", handler);
    return () => window.removeEventListener("palpalworld:world_snapshot", handler);
  }, []);

  if (!mounted) return null;

  const player = liveSnapshot?.players.find((candidate) => candidate.id === localPlayerId) ?? liveSnapshot?.players[0] ?? null;

  return createPortal(
    <aside className={`floating-minimap ${collapsed ? "floating-minimap--collapsed" : ""}`} aria-label="미니맵">
      <header className="floating-minimap__header">
        <strong>미니맵</strong>
        <button type="button" onClick={() => setCollapsed((value) => !value)}>{collapsed ? "펼치기" : "접기"}</button>
      </header>
      {!collapsed ? <MiniMapPanel snapshot={liveSnapshot} localPlayerId={player?.id ?? null} /> : null}
      <style>{`
        .floating-minimap {
          pointer-events: auto;
          position: fixed;
          right: calc(12px + env(safe-area-inset-right));
          top: calc(12px + env(safe-area-inset-top));
          width: 210px;
          max-height: min(58vh, 420px);
          overflow: auto;
          z-index: 9999;
          border: 2px solid rgba(139, 111, 50, 0.95);
          border-radius: 12px;
          background: rgba(20, 18, 28, 0.94);
          box-shadow: 0 0 0 2px rgba(0,0,0,.45), 0 18px 50px rgba(0,0,0,.35);
          backdrop-filter: blur(10px);
          padding: 8px;
        }

        .floating-minimap--collapsed {
          width: auto;
          max-height: none;
          overflow: visible;
        }

        .floating-minimap__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 7px;
          color: #facc15;
          font-size: 12px;
          font-weight: 900;
        }

        .floating-minimap__header button {
          border: 1px solid rgba(242, 209, 107, 0.46);
          border-radius: 7px;
          background: rgba(0, 0, 0, 0.26);
          color: #fff7df;
          padding: 4px 7px;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
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

          .floating-minimap--collapsed {
            width: auto;
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
    </aside>,
    document.body,
  );
}
