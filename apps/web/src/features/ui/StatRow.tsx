export function StatRow({
  label,
  value,
  suffix = "",
}: {
  label: string;
  value: string | number;
  suffix?: string;
}) {
  return (
    <div className="stat-row">
      <span>{label}</span>
      <b>
        {value}
        {suffix}
      </b>
    </div>
  );
}
