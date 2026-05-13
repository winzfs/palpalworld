export type PixelTabItem<T extends string> = {
  id: T;
  label: string;
};

export function PixelTabs<T extends string>({
  items,
  activeId,
  onChange,
}: {
  items: readonly PixelTabItem<T>[];
  activeId: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="pixel-tabs" role="tablist">
      {items.map((item) => (
        <button
          key={item.id}
          className={`pixel-tabs__button ${activeId === item.id ? "pixel-tabs__button--active" : ""}`.trim()}
          onClick={() => onChange(item.id)}
          role="tab"
          aria-selected={activeId === item.id}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
