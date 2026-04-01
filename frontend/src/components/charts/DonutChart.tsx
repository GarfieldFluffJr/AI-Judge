interface Slice {
  label: string;
  value: number;
  color: string;
}

export function DonutChart({
  data,
  size = 220,
  thickness = 40,
}: {
  data: Slice[];
  size?: number;
  thickness?: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let offset = 0;

  return (
    <div className="flex items-center gap-6">
      <svg width={size} height={size} className="shrink-0">
        {data.map((slice) => {
          const pct = slice.value / total;
          const dash = pct * circumference;
          const gap = circumference - dash;
          const currentOffset = offset;
          offset += dash;

          return (
            <circle
              key={slice.label}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={slice.color}
              strokeWidth={thickness}
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-currentOffset}
              className="transition-all duration-700 ease-out"
              style={{
                transformOrigin: "center",
                transform: "rotate(-90deg)",
              }}
            />
          );
        })}
      </svg>

      <div className="space-y-2">
        {data.map((slice) => {
          const pct = total > 0 ? Math.round((slice.value / total) * 100) : 0;
          return (
            <div key={slice.label} className="flex items-center gap-2 text-sm">
              <div
                className="h-3 w-3 rounded-sm"
                style={{ backgroundColor: slice.color }}
              />
              <span className="text-muted-foreground">
                {slice.label}: {slice.value} ({pct}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
