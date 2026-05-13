import type { ButtonHTMLAttributes, ReactNode } from "react";

type PixelButtonVariant = "primary" | "secondary" | "danger";

export function PixelButton({
  children,
  variant = "secondary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: PixelButtonVariant;
}) {
  return (
    <button className={`pixel-button pixel-button--${variant} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}
