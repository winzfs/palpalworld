import type { WorldSnapshot } from "@palpalworld/shared";
import {
  DEFAULT_PLAYER_TILE,
  MAP_TILE_SIZE,
  getAllStarterTiles,
  getMapTile,
  isSameTile,
  type MapDirection,
} from "../../../../../packages/shared/src/worldTiles";

const directionLabels: Record<MapDirection, string> = {
  north: "북",
  south: "남",
  west: "서",
  east: "동",
};

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

function toPercentX(x: number) {
  return clampPercent((x / MAP_TILE_SIZE.width) * 100);
}

function toPercentY(y: number) {
  return clampPercent((y / MAP_TILE_SIZE.height) * 100);
}

export function MiniMapPanel({
  snapshot,
  localPlayerId,
  onTravel,
}: {
  snapshot: WorldSnapshot | null;
  localPlayerId: string | null;
  onTravel?: (direction: MapDirection) => void;
}) {
  const localPlayer = snapshot?.players.find((player) => player.id === localPlayerId) ?? snapshot?.players[0] ?? null;
  const currentTile = (localPlayer as any)?.currentTile ?? DEFAULT_PLAYER_TILE;
  const tile = getMapTile(currentTile);
  const resources = snapshot?.resources.filter((resource) => isSameTile((resource as any).currentTile, currentTile)) ?? [];
  const creatures = snapshot?.creatures.filter((creature) => isSameTile((creature as any).currentTile, currentTile)) ?? [];
  const buildings = snapshot?.buildings.filter((building) => isSameTile((building as any).currentTile, currentTile)) ?? [];
  const playerX = toPercentX(localPlayer?.position.x ?? MAP_TILE_SIZE.width / 2);
  const playerY = toPercentY(localPlayer?.position.y ?? MAP_TILE_SIZE.height / 2);

  return (
    <div className="minimap-panel">
      <div className="minimap-panel__header">
        <b>{tile?.name ?? "알 수 없는 타일"}</b>
        <span>{tile?.description ?? "현재 위치 정보를 불러오는 중입니다."}</span>
      </div>

      <div className="minimap-map" aria-label="현재 타일 미니맵">
        <div className="minimap-map__grid" />
        {resources.slice(0, 24).map((resource) => (
          <i
            key={resource.id}
            className="minimap-dot minimap-dot--resource"
            style={{ left: `${toPercentX(resource.position.x)}%`, top: `${toPercentY(resource.position.y)}%` }}
            title={resource.resourceType}
          />
        ))}
        {creatures.slice(0, 24).map((creature) => (
          <i
            key={creature.id}
            className="minimap-dot minimap-dot--creature"
            style={{ left: `${toPercentX(creature.position.x)}%`, top: `${toPercentY(creature.position.y)}%` }}
            title={creature.speciesId}
          />
        ))}
        {buildings.slice(0, 24).map((building) => (
          <i
            key={building.id}
            className="minimap-dot minimap-dot--building"
            style={{ left: `${toPercentX(building.position.x)}%`, top: `${toPercentY(building.position.y)}%` }}
            title={building.type}
          />
        ))}
        <i className="minimap-dot minimap-dot--player" style={{ left: `${playerX}%`, top: `${playerY}%` }} title="현재 위치" />
        <span className="minimap-map__label minimap-map__label--north">N</span>
        <span className="minimap-map__label minimap-map__label--south">S</span>
        <span className="minimap-map__label minimap-map__label--west">W</span>
        <span className="minimap-map__label minimap-map__label--east">E</span>
      </div>

      <div className="minimap-legend">
        <span><i className="minimap-dot minimap-dot--player" />나</span>
        <span><i className="minimap-dot minimap-dot--resource" />자원</span>
        <span><i className="minimap-dot minimap-dot--creature" />몬스터</span>
        <span><i className="minimap-dot minimap-dot--building" />건물</span>
      </div>

      <div className="minimap-grid minimap-grid--tiles" aria-label="지역 타일 위치">
        {getAllStarterTiles().map((candidate) => {
          const active = isSameTile(candidate, currentTile);
          return (
            <div key={candidate.id} className={`minimap-cell ${active ? "minimap-cell--active" : ""}`}>
              <span>{candidate.name}</span>
              {active ? <i>현재 타일</i> : null}
            </div>
          );
        })}
      </div>

      <div className="minimap-stats">
        <span>자원 {resources.length}</span>
        <span>몬스터 {creatures.length}</span>
        <span>건물 {buildings.length}</span>
        <span>{Math.round(localPlayer?.position.x ?? 0)}, {Math.round(localPlayer?.position.y ?? 0)}</span>
      </div>

      <div className="minimap-portals">
        {(["north", "west", "east", "south"] as MapDirection[]).map((direction) => {
          const enabled = Boolean(tile?.exits[direction]);
          return (
            <button key={direction} disabled={!enabled} onClick={() => enabled && onTravel?.(direction)}>
              {directionLabels[direction]}
            </button>
          );
        })}
      </div>

      <div className="minimap-note">
        현재 타일 내부 좌표를 표시합니다. 한 타일 크기: {MAP_TILE_SIZE.width}×{MAP_TILE_SIZE.height}
      </div>
    </div>
  );
}
