interface BarData {
  label: string;
  value: number;
  color?: string;
}

export function BarChart({
  data,
  height = 220,
  formatValue = (v: number) => `${v}%`,
  maxValue,
}: {
  data: BarData[];
  height?: number;
  formatValue?: (v: number) => string;
  maxValue?: number;
}) {
  if (data.length === 0) return null;

  const max = maxValue ?? Math.max(...data.map((d) => d.value), 1);
  const barWidth = Math.min(60, Math.max(24, 300 / data.length));
  const gap = 8;
  const totalWidth = data.length * (barWidth + gap) - gap;
  const labelHeight = 28;

  return (
    <div className="w-full overflow-x-auto">
      <svg
        width={Math.max(totalWidth, 200)}
        height={height + labelHeight}
        className="mx-auto block"
      >
        {data.map((bar, i) => {
          const barHeight = (bar.value / max) * (height - 30);
          const x = i * (barWidth + gap);
          const y = height - barHeight - 4;
          const color = bar.color ?? "#22c55e";

          return (
            <g key={bar.label}>
              {/* Animated bar */}
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={4}
                fill={color}
                className="transition-all duration-500 ease-out"
              />
              {/* Value label */}
              <text
                x={x + barWidth / 2}
                y={y - 6}
                textAnchor="middle"
                className="fill-foreground text-xs"
                fontSize={11}
              >
                {formatValue(bar.value)}
              </text>
              {/* X-axis label */}
              <text
                x={x + barWidth / 2}
                y={height + 16}
                textAnchor="middle"
                className="fill-muted-foreground text-xs"
                fontSize={11}
              >
                {bar.label.length > 10
                  ? bar.label.substring(0, 9) + "..."
                  : bar.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
