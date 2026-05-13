import type { ReactNode } from "react";
import { PixelButton } from "./PixelButton";

export function MobileWindow({
  title,
  open,
  children,
  onClose,
}: {
  title: string;
  open: boolean;
  children: ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="mobile-window" role="dialog" aria-modal="true" aria-label={title}>
      <div className="mobile-window__backdrop" onClick={onClose} />
      <section className="mobile-window__panel">
        <header className="mobile-window__header">
          <strong>{title}</strong>
          <PixelButton onClick={onClose}>닫기</PixelButton>
        </header>
        <div className="mobile-window__body">{children}</div>
      </section>
    </div>
  );
}
