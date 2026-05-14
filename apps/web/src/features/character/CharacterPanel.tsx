import type { PlayerProfileState, WorldSnapshot } from "@palpalworld/shared";
import { StatRow } from "../ui/StatRow";

export function CharacterPanel({
  nickname,
  connectionState,
  serverEndpoint,
  snapshot,
  profile = null,
}: {
  nickname: string;
  connectionState: string;
  serverEndpoint: string;
  snapshot: WorldSnapshot | null;
  profile?: PlayerProfileState | null;
}) {
  const player = snapshot?.players[0] ?? null;
  const playerCount = snapshot?.players.length ?? 0;
  const buildingCount = snapshot?.buildings.length ?? 0;

  return (
    <div className="feature-panel feature-panel--character">
      <div className="feature-panel__section-title">캐릭터</div>
      <StatRow label="상태" value={connectionState} />
      <StatRow label="닉네임" value={nickname} />
      <StatRow label="레벨" value={profile?.progress.level ?? 1} />
      <StatRow label="경험치" value={profile ? `${profile.progress.exp}/${profile.progress.nextExp}` : "0/100"} />
      <StatRow label="HP" value={player ? `${player.hp}/${player.maxHp}` : profile ? profile.stats.maxHp : "-"} />
      <StatRow label="공격" value={profile?.stats.attack ?? 14} />
      <StatRow label="방어" value={profile?.stats.defense ?? 5} />
      <StatRow label="이동속도" value={profile?.stats.moveSpeed ?? 180} />
      <StatRow label="스태미나" value={profile?.stats.stamina ?? 100} />
      <StatRow label="포획력" value={profile?.stats.capturePower ?? 1} />
      <StatRow label="접속자" value={playerCount} />
      <StatRow label="건물" value={buildingCount} />
      <div className="feature-panel__hint">서버: {serverEndpoint || "확인 중"}</div>
    </div>
  );
}
