"use client";

// ============================================================================
// SVG Chart Components — Ocean-themed, no external charting library
// Used by the flashcard statistics page.
// ============================================================================

import { useMemo } from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// Bar Chart
// ============================================================================
export interface BarChartDatum {
  label: string;
  value: number;
  color?: string;
}

export function BarChart({
  data,
  height = 200,
  barColor = "rgba(42, 169, 160, 0.6)",
  labelLimit = 30,
  showValues = true,
  className,
}: {
  data: BarChartDatum[];
  height?: number;
  barColor?: string;
  labelLimit?: number;
  showValues?: boolean;
  className?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const displayData = data.slice(0, labelLimit);
  const barWidth = Math.max(
    6,
    Math.min(40, (600 - 60) / displayData.length - 2),
  );
  const chartWidth = Math.max(300, displayData.length * (barWidth + 4) + 60);

  return (
    <div className={cn("overflow-x-auto", className)}>
      <svg
        viewBox={`0 0 ${chartWidth} ${height + 30}`}
        className="w-full"
        style={{ minWidth: 200 }}
      >
        {/* Y-axis gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const y = height - frac * height + 10;
          return (
            <g key={frac}>
              <line
                x1={45}
                y1={y}
                x2={chartWidth - 10}
                y2={y}
                stroke="rgba(255,255,255,0.05)"
              />
              <text
                x={40}
                y={y + 4}
                textAnchor="end"
                className="fill-white/20 text-[9px]"
              >
                {Math.round(max * frac)}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {displayData.map((d, i) => {
          const x = 50 + i * (barWidth + 4);
          const barH = (d.value / max) * height;
          const y = height - barH + 10;
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barH}
                rx={2}
                fill={d.color || barColor}
                className="transition-all duration-300"
              />
              {showValues && d.value > 0 && (
                <text
                  x={x + barWidth / 2}
                  y={y - 4}
                  textAnchor="middle"
                  className="fill-white/40 text-[8px]"
                >
                  {d.value}
                </text>
              )}
              <text
                x={x + barWidth / 2}
                y={height + 22}
                textAnchor="middle"
                className="fill-white/30 text-[7px]"
                transform={
                  displayData.length > 15
                    ? `rotate(-45, ${x + barWidth / 2}, ${height + 22})`
                    : undefined
                }
              >
                {d.label.length > 6 ? d.label.slice(0, 5) + "…" : d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ============================================================================
// Line Chart (for review history / forecast)
// ============================================================================
export interface LineChartDatum {
  label: string;
  value: number;
}

export interface LineChartSeries {
  data: LineChartDatum[];
  color: string;
  label: string;
}

export function LineChart({
  series,
  height = 200,
  className,
}: {
  series: LineChartSeries[];
  height?: number;
  className?: string;
}) {
  const allValues = series.flatMap((s) => s.data.map((d) => d.value));
  const max = Math.max(...allValues, 1);
  const maxPoints = Math.max(...series.map((s) => s.data.length));
  const chartWidth = Math.max(300, maxPoints * 20 + 60);

  return (
    <div className={cn("overflow-x-auto", className)}>
      <svg
        viewBox={`0 0 ${chartWidth} ${height + 40}`}
        className="w-full"
        style={{ minWidth: 200 }}
      >
        {/* Y-axis gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const y = height - frac * height + 10;
          return (
            <g key={frac}>
              <line
                x1={45}
                y1={y}
                x2={chartWidth - 10}
                y2={y}
                stroke="rgba(255,255,255,0.05)"
              />
              <text
                x={40}
                y={y + 4}
                textAnchor="end"
                className="fill-white/20 text-[9px]"
              >
                {Math.round(max * frac)}
              </text>
            </g>
          );
        })}

        {/* Lines */}
        {series.map((s, si) => {
          if (s.data.length === 0) return null;
          const step = (chartWidth - 60) / Math.max(s.data.length - 1, 1);
          const points = s.data.map((d, i) => ({
            x: 50 + i * step,
            y: height - (d.value / max) * height + 10,
          }));

          const pathD = points
            .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
            .join(" ");

          // Area fill
          const areaD = `${pathD} L ${points[points.length - 1].x} ${height + 10} L ${points[0].x} ${height + 10} Z`;

          return (
            <g key={si}>
              <path d={areaD} fill={s.color} opacity={0.1} />
              <path
                d={pathD}
                fill="none"
                stroke={s.color}
                strokeWidth={2}
                strokeLinecap="round"
              />
              {points.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={2.5} fill={s.color} />
              ))}
            </g>
          );
        })}

        {/* X-axis labels */}
        {series[0]?.data.map((d, i) => {
          const step =
            (chartWidth - 60) / Math.max(series[0].data.length - 1, 1);
          const showLabel =
            series[0].data.length <= 15 ||
            i % Math.ceil(series[0].data.length / 15) === 0;
          if (!showLabel) return null;
          return (
            <text
              key={i}
              x={50 + i * step}
              y={height + 26}
              textAnchor="middle"
              className="fill-white/30 text-[7px]"
            >
              {d.label}
            </text>
          );
        })}

        {/* Legend */}
        {series.length > 1 && (
          <g transform={`translate(${chartWidth - 10}, 15)`}>
            {series.map((s, i) => (
              <g
                key={i}
                transform={`translate(-${(series.length - i) * 80}, 0)`}
              >
                <rect width={10} height={10} rx={2} fill={s.color} />
                <text x={14} y={9} className="fill-white/40 text-[8px]">
                  {s.label}
                </text>
              </g>
            ))}
          </g>
        )}
      </svg>
    </div>
  );
}

// ============================================================================
// Histogram
// ============================================================================
export function Histogram({
  data,
  height = 180,
  color = "rgba(42, 169, 160, 0.6)",
  bucketLabel = "value",
  className,
}: {
  data: { bucket: string; count: number }[];
  height?: number;
  color?: string;
  bucketLabel?: string;
  className?: string;
}) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const barWidth = Math.max(12, Math.min(50, 500 / data.length - 2));
  const chartWidth = Math.max(300, data.length * (barWidth + 3) + 60);

  return (
    <div className={cn("overflow-x-auto", className)}>
      <svg
        viewBox={`0 0 ${chartWidth} ${height + 30}`}
        className="w-full"
        style={{ minWidth: 200 }}
      >
        {[0, 0.5, 1].map((frac) => {
          const y = height - frac * height + 10;
          return (
            <g key={frac}>
              <line
                x1={45}
                y1={y}
                x2={chartWidth - 10}
                y2={y}
                stroke="rgba(255,255,255,0.05)"
              />
              <text
                x={40}
                y={y + 4}
                textAnchor="end"
                className="fill-white/20 text-[9px]"
              >
                {Math.round(max * frac)}
              </text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const x = 50 + i * (barWidth + 3);
          const h = (d.count / max) * height;
          return (
            <g key={i}>
              <rect
                x={x}
                y={height - h + 10}
                width={barWidth}
                height={h}
                fill={color}
                rx={1}
              />
              {d.count > 0 && (
                <text
                  x={x + barWidth / 2}
                  y={height - h + 6}
                  textAnchor="middle"
                  className="fill-white/40 text-[7px]"
                >
                  {d.count}
                </text>
              )}
              <text
                x={x + barWidth / 2}
                y={height + 22}
                textAnchor="middle"
                className="fill-white/30 text-[7px]"
              >
                {d.bucket}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ============================================================================
// Pie / Donut Chart
// ============================================================================
export interface PieSlice {
  label: string;
  value: number;
  color: string;
}

export function DonutChart({
  data,
  size = 160,
  innerRadius = 50,
  className,
}: {
  data: PieSlice[];
  size?: number;
  innerRadius?: number;
  className?: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) {
    return (
      <div
        className={cn("flex items-center justify-center", className)}
        style={{ width: size, height: size }}
      >
        <span className="text-white/20 text-xs">No data</span>
      </div>
    );
  }

  const center = size / 2;
  const radius = (size - 10) / 2;

  let cumAngle = -Math.PI / 2;
  const arcs = data
    .filter((d) => d.value > 0)
    .map((d) => {
      const angle = (d.value / total) * Math.PI * 2;
      const startAngle = cumAngle;
      cumAngle += angle;
      const endAngle = cumAngle;

      const x1 = center + radius * Math.cos(startAngle);
      const y1 = center + radius * Math.sin(startAngle);
      const x2 = center + radius * Math.cos(endAngle);
      const y2 = center + radius * Math.sin(endAngle);
      const ix1 = center + innerRadius * Math.cos(startAngle);
      const iy1 = center + innerRadius * Math.sin(startAngle);
      const ix2 = center + innerRadius * Math.cos(endAngle);
      const iy2 = center + innerRadius * Math.sin(endAngle);

      const largeArc = angle > Math.PI ? 1 : 0;

      const path = [
        `M ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
        `L ${ix2} ${iy2}`,
        `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix1} ${iy1}`,
        "Z",
      ].join(" ");

      return { ...d, path };
    });

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {arcs.map((arc, i) => (
          <path
            key={i}
            d={arc.path}
            fill={arc.color}
            stroke="rgba(0,0,0,0.3)"
            strokeWidth={1}
          />
        ))}
        <text
          x={center}
          y={center - 4}
          textAnchor="middle"
          className="fill-white text-lg font-light"
        >
          {total}
        </text>
        <text
          x={center}
          y={center + 12}
          textAnchor="middle"
          className="fill-white/40 text-[9px]"
        >
          total
        </text>
      </svg>
      <div className="space-y-1">
        {data
          .filter((d) => d.value > 0)
          .map((d) => (
            <div key={d.label} className="flex items-center gap-2 text-xs">
              <span
                className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                style={{ backgroundColor: d.color }}
              />
              <span className="text-white/60">{d.label}</span>
              <span className="text-white/30 ml-auto">{d.value}</span>
            </div>
          ))}
      </div>
    </div>
  );
}

// ============================================================================
// Heatmap Calendar (for streak / daily review activity)
// ============================================================================
export function HeatmapCalendar({
  data,
  className,
}: {
  data: Map<string, number>; // key: "YYYY-MM-DD", value: count
  className?: string;
}) {
  const cellSize = 12;
  const gap = 2;
  const weeksToShow = 26; // ~6 months

  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - weeksToShow * 7);

  const max = Math.max(...Array.from(data.values()), 1);

  const cells: { x: number; y: number; date: string; count: number }[] = [];
  const d = new Date(startDate);
  // Align to start of week (Sunday)
  d.setDate(d.getDate() - d.getDay());

  let week = 0;
  while (d <= endDate) {
    const dayOfWeek = d.getDay();
    const dateStr = d.toISOString().slice(0, 10);
    cells.push({
      x: week * (cellSize + gap),
      y: dayOfWeek * (cellSize + gap),
      date: dateStr,
      count: data.get(dateStr) || 0,
    });
    d.setDate(d.getDate() + 1);
    if (d.getDay() === 0) week++;
  }

  const width = (week + 1) * (cellSize + gap) + 30;
  const height = 7 * (cellSize + gap) + 20;

  const getColor = (count: number) => {
    if (count === 0) return "rgba(255,255,255,0.03)";
    const intensity = Math.min(count / max, 1);
    if (intensity < 0.25) return "rgba(42, 169, 160, 0.2)";
    if (intensity < 0.5) return "rgba(42, 169, 160, 0.4)";
    if (intensity < 0.75) return "rgba(42, 169, 160, 0.6)";
    return "rgba(42, 169, 160, 0.85)";
  };

  return (
    <div className={cn("overflow-x-auto", className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ minWidth: 200 }}
      >
        {/* Day labels */}
        {["S", "M", "T", "W", "T", "F", "S"].map((label, i) => (
          <text
            key={i}
            x={0}
            y={i * (cellSize + gap) + cellSize - 1}
            className="fill-white/20 text-[7px]"
          >
            {i % 2 === 1 ? label : ""}
          </text>
        ))}
        {/* Cells */}
        {cells.map((cell) => (
          <rect
            key={cell.date}
            x={cell.x + 18}
            y={cell.y}
            width={cellSize}
            height={cellSize}
            rx={2}
            fill={getColor(cell.count)}
          >
            <title>{`${cell.date}: ${cell.count} reviews`}</title>
          </rect>
        ))}
      </svg>
    </div>
  );
}

// ============================================================================
// Stacked Bar Chart (answer button distribution)
// ============================================================================
export interface StackedBarDatum {
  label: string;
  segments: { value: number; color: string; label: string }[];
}

export function StackedBarChart({
  data,
  height = 180,
  className,
}: {
  data: StackedBarDatum[];
  height?: number;
  className?: string;
}) {
  const maxTotal = Math.max(
    ...data.map((d) => d.segments.reduce((s, seg) => s + seg.value, 0)),
    1,
  );
  const barWidth = Math.max(12, Math.min(40, 500 / data.length - 3));
  const chartWidth = Math.max(300, data.length * (barWidth + 4) + 60);

  return (
    <div className={cn("overflow-x-auto", className)}>
      <svg
        viewBox={`0 0 ${chartWidth} ${height + 30}`}
        className="w-full"
        style={{ minWidth: 200 }}
      >
        {[0, 0.5, 1].map((frac) => {
          const y = height - frac * height + 10;
          return (
            <g key={frac}>
              <line
                x1={45}
                y1={y}
                x2={chartWidth - 10}
                y2={y}
                stroke="rgba(255,255,255,0.05)"
              />
              <text
                x={40}
                y={y + 4}
                textAnchor="end"
                className="fill-white/20 text-[9px]"
              >
                {Math.round(maxTotal * frac)}
              </text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const x = 50 + i * (barWidth + 4);
          let yOffset = height + 10;
          return (
            <g key={i}>
              {d.segments.map((seg, si) => {
                const h = (seg.value / maxTotal) * height;
                yOffset -= h;
                return (
                  <rect
                    key={si}
                    x={x}
                    y={yOffset}
                    width={barWidth}
                    height={h}
                    fill={seg.color}
                    rx={1}
                  >
                    <title>{`${seg.label}: ${seg.value}`}</title>
                  </rect>
                );
              })}
              <text
                x={x + barWidth / 2}
                y={height + 22}
                textAnchor="middle"
                className="fill-white/30 text-[7px]"
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ============================================================================
// Forecast Bar Chart (upcoming workload with dual-color bars)
// ============================================================================
export function ForecastChart({
  data,
  height = 180,
  className,
}: {
  data: { date: string; review: number; newCards: number }[];
  height?: number;
  className?: string;
}) {
  const maxTotal = Math.max(...data.map((d) => d.review + d.newCards), 1);
  const barWidth = Math.max(10, Math.min(30, 500 / data.length - 2));
  const chartWidth = Math.max(300, data.length * (barWidth + 3) + 60);

  return (
    <div className={cn("overflow-x-auto", className)}>
      <svg
        viewBox={`0 0 ${chartWidth} ${height + 30}`}
        className="w-full"
        style={{ minWidth: 200 }}
      >
        {[0, 0.5, 1].map((frac) => {
          const y = height - frac * height + 10;
          return (
            <g key={frac}>
              <line
                x1={45}
                y1={y}
                x2={chartWidth - 10}
                y2={y}
                stroke="rgba(255,255,255,0.05)"
              />
              <text
                x={40}
                y={y + 4}
                textAnchor="end"
                className="fill-white/20 text-[9px]"
              >
                {Math.round(maxTotal * frac)}
              </text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const x = 50 + i * (barWidth + 3);
          const reviewH = (d.review / maxTotal) * height;
          const newH = (d.newCards / maxTotal) * height;
          const totalH = reviewH + newH;
          return (
            <g key={i}>
              <rect
                x={x}
                y={height - totalH + 10}
                width={barWidth}
                height={newH}
                fill="rgba(59, 130, 246, 0.6)"
                rx={1}
              />
              <rect
                x={x}
                y={height - reviewH + 10}
                width={barWidth}
                height={reviewH}
                fill="rgba(42, 169, 160, 0.6)"
                rx={1}
              />
              {i % Math.ceil(data.length / 15) === 0 && (
                <text
                  x={x + barWidth / 2}
                  y={height + 22}
                  textAnchor="middle"
                  className="fill-white/30 text-[7px]"
                >
                  {d.date.slice(5)}
                </text>
              )}
            </g>
          );
        })}
        {/* Legend */}
        <g transform={`translate(${chartWidth - 150}, 5)`}>
          <rect width={8} height={8} rx={1} fill="rgba(42, 169, 160, 0.6)" />
          <text x={12} y={8} className="fill-white/40 text-[8px]">
            Review
          </text>
          <rect
            x={60}
            width={8}
            height={8}
            rx={1}
            fill="rgba(59, 130, 246, 0.6)"
          />
          <text x={72} y={8} className="fill-white/40 text-[8px]">
            New
          </text>
        </g>
      </svg>
    </div>
  );
}

// ============================================================================
// Stat Card
// ============================================================================
export function StatCard({
  label,
  value,
  subvalue,
  icon,
  color = "text-teal-300",
  className,
}: {
  label: string;
  value: string | number;
  subvalue?: string;
  icon?: React.ReactNode;
  color?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl bg-white/[0.03] border border-white/10 p-4",
        className,
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        {icon && <span className="text-white/30">{icon}</span>}
        <span className="text-white/40 text-xs">{label}</span>
      </div>
      <div className={cn("text-2xl font-light", color)}>{value}</div>
      {subvalue && (
        <div className="text-white/30 text-xs mt-0.5">{subvalue}</div>
      )}
    </div>
  );
}
