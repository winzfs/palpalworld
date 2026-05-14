import type { WorldSnapshot } from "@palpalworld/shared";
import {
  MAP_TILE_SIZE,
  clampPositionToTile,
} from "../../../../../packages/shared/src/worldTiles";

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

function toPercentX(x: number) {
  return clampPercent((x / MAP_TILE_SIZE.width) * 100);
}

function toPercentY(y: number) {
  return clampPercent((y / MAP_TILE_SIZE.height) * 100);
}

function withPositionInsideTile<T extends { position: { x: number; y: number } }>(entity: T): T {
  return { ...entity, position: clampPositionToTile(entity.position) };
}

export function MiniMapPanel({
  snapshot,
  localPlayerId,
}: {
  snapshot: WorldSnapshot | null;
  localPlayerId: string | null;
}) {
  const rawPlayer = snapshot?.players.find((player) => player.id === localPlayerId) ?? snapshot?.players[0] ?? null;
  const localPlayer = rawPlayer ? withPositionInsideTile(rawPlayer) : null;
  const playerPosition = localPlayer?.position ?? { x: MAP_TILE_SIZE.width / 2, y: MAP_TILE_SIZE.height / 2 };
  const playerX = toPercentX(playerPosition.x);
  const playerY = toPercentY(playerPosition.y);

  return (
    <div className="minimap-map" aria-label="현재 위치 미니맵">
      <div className="minimap-map__grid" />
      <i className="minimap-dot minimap-dot--player" style={{ left: `${playerX}%`, top: `${playerY}%` }} title="현재 위치" />

      <style>{`
        .minimap-map { position: relative; width: 100%; aspect-ratio: 1 / 1; min-height: 0; overflow: hidden; border: 0; border-radius: 10px; background: radial-gradient(circle at 50% 50%, rgba(34,197,94,.18), transparent 62%), linear-gradient(135deg, rgba(22,101,52,.55), rgba(15,23,42,.86)); box-shadow: inset 0 0 20px rgba(0,0,0,.35); }
        .minimap-map__grid { position: absolute; inset: 0; background-image: linear-gradient(rgba(226,232,240,.09) 1px, transparent 1px), linear-gradient(90deg, rgba(226,232,240,.09) 1px, transparent 1px); background-size: 25% 25%; }
        .minimap-dot { position: absolute; display: block; border-radius: 999px; transform: translate(-50%, -50%); }
        .minimap-dot--player { width: 14px; height: 14px; background: #facc15; border: 2px solid #fff7ed; z-index: 6; box-shadow: 0 0 0 2px rgba(15,23,42,.9), 0 0 16px rgba(250,204,21,.9); }
      `}</style>
    </div>
  );
}
