"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { WorldSnapshot } from "@palpalworld/shared";
import { DEFAULT_PLAYER_TILE, getMapTile, isSameTile, type MapTileRef } from "../../../../../packages/shared/src/worldTiles";

type SnapshotEvent = CustomEvent<{ snapshot: WorldSnapshot; localPlayerId: string | null }>;

type BannerState = {
  tile: MapTileRef;
  shownAt: number;
};

function getPlayerTile(snapshot: WorldSnapshot | null, localPlayerId: string | null) {
  const player = snapshot?.players.find((candidate) => candidate.id === localPlayerId) ?? snapshot?.players[0] ?? null;
  return ((player as { currentTile?: MapTileRef } | null)?.currentTile ?? DEFAULT_PLAYER_TILE) as MapTileRef;
}

export function TileTravelBanner() {
  const [mounted, setMounted] = useState(false);
  const [banner, setBanner] = useState<BannerState | null>(null);
  const previousTileRef = useRef<MapTileRef | null>(null);
  const hideTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as SnapshotEvent;
      const nextTile = getPlayerTile(customEvent.detail.snapshot, customEvent.detail.localPlayerId);
      const previousTile = previousTileRef.current;
      previousTileRef.current = { ...nextTile };

      if (!previousTile || isSameTile(previousTile, nextTile)) return;

      setBanner({ tile: { ...nextTile }, shownAt: Date.now() });
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = window.setTimeout(() => setBanner(null), 2600);
    };

    window.addEventListener("palpalworld:world_snapshot", handler);
    return () => window.removeEventListener("palpalworld:world_snapshot", handler);
  }, []);

  const tileInfo = useMemo(() => getMapTile(banner?.tile ?? null), [banner]);

  if (!mounted || !banner || !tileInfo) return null;

  return createPortal(
    <aside className="tile-travel-banner" aria-live="polite">
      <div className="tile-travel-banner__eyebrow">새 지역 타일 진입</div>
      <strong>{tileInfo.theme.name}</strong>
      <span>{tileInfo.name}</span>
      <small>{tileInfo.tileX + 1}, {tileInfo.tileY + 1} / {tileInfo.theme.columns}×{tileInfo.theme.rows}</small>
      <style>{`
        .tile-travel-banner {
          pointer-events: none;
          position: fixed;
          left: 50%;
          top: 19%;
          z-index: 9998;
          min-width: min(420px, calc(100vw - 32px));
          transform: translateX(-50%);
          border: 2px solid rgba(250, 204, 21, 0.75);
          border-radius: 20px;
          background: linear-gradient(135deg, rgba(15, 23, 42, 0.94), rgba(30, 41, 59, 0.88));
          box-shadow: 0 20px 70px rgba(0,0,0,.45), inset 0 0 28px rgba(250,204,21,.08);
          color: #fff7ed;
          padding: 18px 26px 20px;
          text-align: center;
          animation: tileTravelPop 2.6s ease both;
          backdrop-filter: blur(12px);
        }

        .tile-travel-banner__eyebrow {
          color: #facc15;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: .24em;
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .tile-travel-banner strong {
          display: block;
          font-size: clamp(22px, 4vw, 34px);
          font-weight: 1000;
          line-height: 1.08;
          text-shadow: 0 3px 18px rgba(0,0,0,.45);
        }

        .tile-travel-banner span {
          display: block;
          margin-top: 6px;
          color: #bae6fd;
          font-size: clamp(15px, 2.5vw, 20px);
          font-weight: 900;
        }

        .tile-travel-banner small {
          display: inline-block;
          margin-top: 10px;
          border-radius: 999px;
          background: rgba(15, 23, 42, 0.72);
          color: rgba(226, 232, 240, 0.86);
          padding: 5px 10px;
          font-size: 12px;
          font-weight: 800;
        }

        @keyframes tileTravelPop {
          0% { opacity: 0; transform: translate(-50%, -18px) scale(.94); filter: blur(4px); }
          12% { opacity: 1; transform: translate(-50%, 0) scale(1); filter: blur(0); }
          72% { opacity: 1; transform: translate(-50%, 0) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -10px) scale(.98); }
        }

        @media (max-width: 760px) {
          .tile-travel-banner {
            top: 14%;
            min-width: min(310px, calc(100vw - 24px));
            padding: 14px 18px 16px;
            border-radius: 16px;
          }
        }
      `}</style>
    </aside>,
    document.body,
  );
}
