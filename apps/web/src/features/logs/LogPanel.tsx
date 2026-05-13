export function LogPanel({ lines }: { lines: string[] }) {
  return (
    <div className="feature-panel feature-panel--logs">
      {lines.length > 0 ? (
        lines.map((line, index) => <div key={`${line}-${index}`}>{line}</div>)
      ) : (
        <div className="feature-panel__empty">아직 로그가 없습니다.</div>
      )}
    </div>
  );
}
