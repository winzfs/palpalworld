import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
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
  const resolvedRef = useRef(false);
  const latestCursorPositionRef = useRef(0);
  const species = useMemo(() => getPetSpeciesDefinition(creature.speciesId), [creature.speciesId]);
  const progress = Math.min(1, Math.max(0, (now - startedAt) / config.durationMs));
  const wave = (Math.sin((now - startedAt) / 1000 * Math.PI * config.cursorSpeed) + 1) / 2;
  const cursorPosition = Math.max(0, Math.min(1, wave));
  const timeLeft = Math.max(0, Math.ceil((config.durationMs - (now - startedAt)) / 1000));
  latestCursorPositionRef.current = cursorPosition;

  const resolveOnce = useCallback((success: boolean) => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    onResolve(success);
  }, [onResolve]);

  const cancelOnce = useCallback(() => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    onCancel();
  }, [onCancel]);

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
    if (progress >= 1) resolveOnce(false);
  }, [progress, resolveOnce]);

  const handleStrike = useCallback((event?: PointerEvent<HTMLButtonElement>) => {
    event?.preventDefault();
    event?.stopPropagation();
    resolveOnce(isCaptureTimingSuccess(latestCursorPositionRef.current, config));
  }, [config, resolveOnce]);

  return (
    <section
      className="capture-minigame-overlay"
      aria-label="포획 미니게임"
      onPointerDown={(event) => event.stopPropagation()}
      onPointerMove={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
      onTouchStart={(event) => event.stopPropagation()}
      onTouchMove={(event) => event.stopPropagation()}
      onTouchEnd={(event) => event.stopPropagation()}
    >
      <div className="capture-minigame-card">
        <header className="capture-minigame-card__header">
          <strong>{species.name} 포획</strong>
          <button
            type="button"
            onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); cancelOnce(); }}
            onClick={(event) => { event.preventDefault(); event.stopPropagation(); cancelOnce(); }}
            aria-label="포획 취소"
          >×</button>
        </header>
        <p>커서가 초록색 영역 안에 있을 때 공격 버튼을 누르면 포획에 성공합니다.</p>
        <div className="capture-minigame-meter">
          <span className="capture-minigame-meter__zone" style={{ left: `${config.successStart * 100}%`, width: `${(config.successEnd - config.successStart) * 100}%` }} />
          <i className="capture-minigame-meter__cursor" style={{ left: `${cursorPosition * 100}%` }} />
        </div>
        <div className="capture-minigame-card__footer">
          <small>{timeLeft}초 안에 성공 구간을 맞추세요.</small>
          <button
            type="button"
            className="capture-minigame-card__strike"
            onPointerDown={handleStrike}
            onClick={(event) => { event.preventDefault(); event.stopPropagation(); handleStrike(); }}
          >공격!</button>
        </div>
      </div>
    </section>
  );
}
