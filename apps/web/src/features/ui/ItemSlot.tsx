import type { ReactNode } from "react";

export function ItemSlot({
  label,
  amount,
  detail,
  selected = false,
  children,
  onClick,
}: {
  label: string;
  amount?: number;
  detail?: string;
  selected?: boolean;
  children?: ReactNode;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span className="item-slot__label">{label}</span>
      {typeof amount === "number" ? <b className="item-slot__amount">{amount}</b> : null}
      {detail ? <small className="item-slot__detail">{detail}</small> : null}
      {children}
    </>
  );

  if (onClick) {
    return (
      <button className={`item-slot ${selected ? "item-slot--selected" : ""}`.trim()} onClick={onClick}>
        {content}
      </button>
    );
  }

  return <div className={`item-slot ${selected ? "item-slot--selected" : ""}`.trim()}>{content}</div>;
}
