"use client";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Legend,
} from "recharts";
import { format } from "date-fns";
import type { MetricSnapshot } from "@/types";

interface AnomalyChartProps {
  metricSnapshot: MetricSnapshot;
  detectedAt: string;
}

const CHART_METRICS = [
  { key: "cpu_percent_mean", label: "CPU %", color: "#ef4444" },
  { key: "mem_used_ratio", label: "Memory %", color: "#f97316" },
  { key: "disk_io_util", label: "Disk I/O", color: "#eab308" },
  { key: "net_drop_rate", label: "Net Drop Rate", color: "#8b5cf6" },
  { key: "load_avg_1m", label: "Load 1m", color: "#3b82f6" },
];

function generateChartData(snapshot: MetricSnapshot, detectedAt: string) {
  const detectedTime = new Date(detectedAt).getTime();
  // Simulate 30 data points: 15min before detection to 15min after
  return Array.from({ length: 30 }, (_, i) => {
    const t = detectedTime - (29 - i) * 60_000;
    const isAnomaly = i >= 24;
    const factor = isAnomaly ? 1 + (i - 24) * 0.15 : 0.85 + Math.random() * 0.15;
    return {
      time: format(new Date(t), "HH:mm"),
      cpu_percent_mean: Math.min(100, snapshot.cpu_percent_mean * factor + (Math.random() - 0.5) * 5),
      mem_used_ratio: Math.min(1, snapshot.mem_used_ratio * (isAnomaly ? 1 + (i - 24) * 0.08 : 0.9 + Math.random() * 0.1)),
      disk_io_util: Math.min(100, snapshot.disk_io_util * factor),
      net_drop_rate: Math.max(0, snapshot.net_drop_rate * factor),
      load_avg_1m: Math.max(0, snapshot.load_avg_1m * factor),
    };
  });
}

export function AnomalyChart({ metricSnapshot, detectedAt }: AnomalyChartProps) {
  const data = generateChartData(metricSnapshot, detectedAt);
  const detectionLabel = format(new Date(detectedAt), "HH:mm");

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="time"
            tick={{ fill: "#71717a", fontSize: 11, fontFamily: "JetBrains Mono" }}
            tickLine={false}
            axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
          />
          <YAxis
            tick={{ fill: "#71717a", fontSize: 11, fontFamily: "JetBrains Mono" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "#111111",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              fontSize: "11px",
              fontFamily: "JetBrains Mono",
            }}
            labelStyle={{ color: "#a1a1aa" }}
          />
          <Legend
            wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
          />
          {/* Detection timestamp reference line */}
          <ReferenceLine
            x={detectionLabel}
            stroke="#ef4444"
            strokeDasharray="4 2"
            label={{ value: "Detected", fill: "#ef4444", fontSize: 10, position: "insideTopLeft" }}
          />
          {CHART_METRICS.map((m) => (
            <Line
              key={m.key}
              type="monotone"
              dataKey={m.key}
              name={m.label}
              stroke={m.color}
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
