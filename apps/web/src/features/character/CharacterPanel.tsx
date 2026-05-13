import type { WorldSnapshot } from "@palpalworld/shared";
import { StatRow } from "../ui/StatRow";

export function CharacterPanel({
  nickname,
  connectionState,
  serverEndpoint,
  snapshot,
}: {
  nickname: string;
  connectionState: string;
  serverEndpoint: string;
  snapshot: WorldSnapshot | null;
}) {
  const player = snapshot?.players[0] ?? null;
  const playerCount = snapshot?.players.length ?? 0;
  const buildingCount = snapshot?.buildings.length ?? 0;

  return (
    <div className="feature-panel feature-panel--character">
      <StatRow label="상태" value={connectionState} />
      <StatRow label="닉네임" value={nickname} />
      <StatRow label="HP" value={player ? `${player.hp}/${player.maxHp}` : "-"} />
      <StatRow label="접속자" value={playerCount} />
      <StatRow label="건물" value={buildingCount} />
      <div className="feature-panel__hint">서버: {serverEndpoint || "확인 중"}</div>
    </div>
  );
}
