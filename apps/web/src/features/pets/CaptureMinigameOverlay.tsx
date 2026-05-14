import { useEffect, useMemo, useState } from "react";
import type { CreaturePublicState } from "@palpalworld/shared";
import { getPetSpeciesDefinition } from "./petCatalog";
import { isCaptureTimingSuccess, type CaptureMinigameConfig } from "./captureRules";

export function CaptureMinigameOverlay({
  creature,
  config,
  onResolve,
  onCancel,
}: {
  creature: CreaturePublicState;
  config: CaptureMinigameConfig;
  onResolve: (success: boolean) => void;
  onCancel: () => void;
}) {
  const [startedAt] = useState(() => performance.now());
  const [now, setNow] = useState(() => performance.now());
  const species = useMemo(() => getPetSpeciesDefinition(creature.speciesId), [creature.speciesId]);
  const progress = Math.min(1, Math.max(0, (now - startedAt) / config.durationMs));
  const wave = (Math.sin((now - startedAt) / 1000 * Math.PI * config.cursorSpeed) + 1) / 2;
  const cursorPosition = Math.max(0, Math.min(1, wave));
  const timeLeft = Math.max(0, Math.ceil((config.durationMs - (now - startedAt)) / 1000));

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      setNow(performance.now());
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (progress >= 1) onResolve(false);
  }, [onResolve, progress]);

  const handleStrike = () => {
    onResolve(isCaptureTimingSuccess(cursorPosition, config));
  };

  return (
    <section className="capture-minigame-overlay" aria-label="포획 미니게임">
      <div className="capture-minigame-card">
        <header className="capture-minigame-card__header">
          <strong>{species.name} 포획</strong>
          <button onClick={onCancel} aria-label="포획 취소">×</button>
        </header>
        <p>커서가 초록색 영역 안에 있을 때 공격 버튼을 누르면 포획에 성공합니다.</p>
        <div className="capture-minigame-meter">
          <span className="capture-minigame-meter__zone" style={{ left: `${config.successStart * 100}%`, width: `${(config.successEnd - config.successStart) * 100}%` }} />
          <i className="capture-minigame-meter__cursor" style={{ left: `${cursorPosition * 100}%` }} />
        </div>
        <div className="capture-minigame-card__footer">
          <small>{timeLeft}초 안에 성공 구간을 맞추세요.</small>
          <button className="capture-minigame-card__strike" onClick={handleStrike}>공격!</button>
        </div>
      </div>
    </section>
  );
}
