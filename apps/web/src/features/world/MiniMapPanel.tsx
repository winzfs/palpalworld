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
  const resources = snapshot?.resources.filter((resource) => isSameTile((resource as any).currentTile, currentTile)).length ?? 0;
  const creatures = snapshot?.creatures.filter((creature) => isSameTile((creature as any).currentTile, currentTile)).length ?? 0;
  const buildings = snapshot?.buildings.filter((building) => isSameTile((building as any).currentTile, currentTile)).length ?? 0;

  return (
    <div className="minimap-panel">
      <div className="minimap-panel__header">
        <b>{tile?.name ?? "알 수 없는 타일"}</b>
        <span>{tile?.description ?? "현재 위치 정보를 불러오는 중입니다."}</span>
      </div>

      <div className="minimap-grid" aria-label="지역 미니맵">
        {getAllStarterTiles().map((candidate) => {
          const active = isSameTile(candidate, currentTile);
          return (
            <div key={candidate.id} className={`minimap-cell ${active ? "minimap-cell--active" : ""}`}>
              <span>{candidate.name}</span>
              {active ? <i>현재</i> : null}
            </div>
          );
        })}
      </div>

      <div className="minimap-stats">
        <span>자원 {resources}</span>
        <span>몬스터 {creatures}</span>
        <span>건물 {buildings}</span>
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
        맵 끝 포탈을 지나가거나 버튼을 누르면 인접 타일로 이동합니다. {MAP_TILE_SIZE.width}×{MAP_TILE_SIZE.height}
      </div>
    </div>
  );
}
