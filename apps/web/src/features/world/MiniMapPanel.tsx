import type { WorldSnapshot } from "@palpalworld/shared";
import {
  DEFAULT_PLAYER_TILE,
  MAP_TILE_SIZE,
  clampPositionToTile,
  isSameTile,
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
  const currentTile = (localPlayer as any)?.currentTile ?? DEFAULT_PLAYER_TILE;
  const resources = (snapshot?.resources ?? [])
    .map(withPositionInsideTile)
    .filter((resource) => !(resource as any).currentTile || isSameTile((resource as any).currentTile, currentTile));
  const creatures = (snapshot?.creatures ?? [])
    .map(withPositionInsideTile)
    .filter((creature) => !(creature as any).currentTile || isSameTile((creature as any).currentTile, currentTile));
  const buildings = (snapshot?.buildings ?? [])
    .map(withPositionInsideTile)
    .filter((building) => !(building as any).currentTile || isSameTile((building as any).currentTile, currentTile));
  const playerPosition = localPlayer?.position ?? { x: MAP_TILE_SIZE.width / 2, y: MAP_TILE_SIZE.height / 2 };
  const playerX = toPercentX(playerPosition.x);
  const playerY = toPercentY(playerPosition.y);

  return (
    <div className="minimap-map" aria-label="현재 타일 미니맵">
      <div className="minimap-map__grid" />
      {resources.slice(0, 28).map((resource) => (
        <i
          key={resource.id}
          className="minimap-dot minimap-dot--resource"
          style={{ left: `${toPercentX(resource.position.x)}%`, top: `${toPercentY(resource.position.y)}%` }}
          title={resource.resourceType}
        />
      ))}
      {creatures.slice(0, 28).map((creature) => (
        <i
          key={creature.id}
          className="minimap-dot minimap-dot--creature"
          style={{ left: `${toPercentX(creature.position.x)}%`, top: `${toPercentY(creature.position.y)}%` }}
          title={creature.speciesId}
        />
      ))}
      {buildings.slice(0, 28).map((building) => (
        <i
          key={building.id}
          className="minimap-dot minimap-dot--building"
          style={{ left: `${toPercentX(building.position.x)}%`, top: `${toPercentY(building.position.y)}%` }}
          title={building.type}
        />
      ))}
      <i className="minimap-dot minimap-dot--player" style={{ left: `${playerX}%`, top: `${playerY}%` }} title="현재 위치" />

      <style>{`
        .minimap-map { position: relative; width: 100%; aspect-ratio: 1 / 1; min-height: 0; overflow: hidden; border: 0; border-radius: 10px; background: radial-gradient(circle at 50% 50%, rgba(34,197,94,.18), transparent 62%), linear-gradient(135deg, rgba(22,101,52,.55), rgba(15,23,42,.86)); box-shadow: inset 0 0 20px rgba(0,0,0,.35); }
        .minimap-map__grid { position: absolute; inset: 0; background-image: linear-gradient(rgba(226,232,240,.09) 1px, transparent 1px), linear-gradient(90deg, rgba(226,232,240,.09) 1px, transparent 1px); background-size: 25% 25%; }
        .minimap-dot { position: absolute; display: block; width: 6px; height: 6px; border-radius: 999px; transform: translate(-50%, -50%); box-shadow: 0 0 0 1px rgba(15,23,42,.8), 0 0 6px rgba(255,255,255,.22); }
        .minimap-dot--player { width: 14px; height: 14px; background: #facc15; border: 2px solid #fff7ed; z-index: 6; box-shadow: 0 0 0 2px rgba(15,23,42,.9), 0 0 16px rgba(250,204,21,.9); }
        .minimap-dot--resource { background: #22c55e; z-index: 2; }
        .minimap-dot--creature { background: #ef4444; z-index: 3; }
        .minimap-dot--building { width: 8px; height: 8px; border-radius: 2px; background: #38bdf8; z-index: 4; }
      `}</style>
    </div>
  );
}
