"use client";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import type { MetricSeries } from "@/types";
import { formatDateTime } from "@/lib/utils/format";

interface TimeSeriesChartProps {
  series: MetricSeries[];
  height?: number;
  colors?: string[];
}

const DEFAULT_COLORS = ["#3b82f6", "#ef4444", "#f97316", "#22c55e", "#8b5cf6", "#eab308"];

export function TimeSeriesChart({ series, height = 280, colors = DEFAULT_COLORS }: TimeSeriesChartProps) {
  // Merge all series into unified time-keyed data
  const allTimestamps = Array.from(new Set(series.flatMap((s) => s.data.map((d) => d.timestamp)))).sort();
  const data = allTimestamps.map((ts) => {
    const point: Record<string, string | number> = { timestamp: formatDateTime(ts) };
    series.forEach((s) => {
      const found = s.data.find((d) => d.timestamp === ts);
      point[s.name] = found?.value ?? 0;
    });
    return point;
  });

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis
          dataKey="timestamp"
          tick={{ fill: "#71717a", fontSize: 10, fontFamily: "JetBrains Mono" }}
          tickLine={false}
          axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: "#71717a", fontSize: 10, fontFamily: "JetBrains Mono" }}
          tickLine={false}
          axisLine={false}
          width={35}
        />
        <Tooltip
          contentStyle={{
            background: "#111111",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "8px",
            fontSize: "11px",
            fontFamily: "JetBrains Mono",
          }}
          labelStyle={{ color: "#a1a1aa", marginBottom: "4px" }}
        />
        <Legend wrapperStyle={{ fontSize: "11px" }} />
        {series.map((s, i) => (
          <Line
            key={s.name}
            type="monotone"
            dataKey={s.name}
            stroke={colors[i % colors.length]}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
