"use client";
import { useState } from "react";
import { subHours, format } from "date-fns";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import type { MetricSeries } from "@/types";
import { cn } from "@/lib/utils/cn";

const METRIC_OPTIONS = [
  { key: "cpu_percent_mean", label: "CPU", color: "#ef4444", unit: "%" },
  { key: "mem_used_ratio", label: "Memory", color: "#f97316", unit: "%" },
  { key: "disk_io_util", label: "Disk I/O", color: "#eab308", unit: "%" },
  { key: "net_bytes_recv_rate", label: "Net Recv", color: "#3b82f6", unit: "B/s" },
  { key: "load_avg_1m", label: "Load 1m", color: "#8b5cf6", unit: "" },
  { key: "http_latency_p99", label: "HTTP p99", color: "#10b981", unit: "ms" },
];

function generateSampleMetric(baseValue: number, hours = 24, points = 48): MetricSeries["data"] {
  return Array.from({ length: points }, (_, i) => ({
    timestamp: subHours(new Date(), hours - (hours / points) * i).toISOString(),
    value: Math.max(0, baseValue + (Math.random() - 0.45) * baseValue * 0.3),
  }));
}

interface MetricChartProps {
  hostId: string;
  anomalyAt?: string;
}

export function MetricChart({ anomalyAt }: MetricChartProps) {
  const [selected, setSelected] = useState("cpu_percent_mean");
  const selectedMeta = METRIC_OPTIONS.find((m) => m.key === selected)!;

  // Generate sample data based on metric key
  const baseValues: Record<string, number> = {
    cpu_percent_mean: 45, mem_used_ratio: 0.62, disk_io_util: 30,
    net_bytes_recv_rate: 50000, load_avg_1m: 2.4, http_latency_p99: 85,
  };
  const data = generateSampleMetric(baseValues[selected] ?? 50).map((d) => ({
    time: format(new Date(d.timestamp), "HH:mm"),
    value: d.value,
  }));

  const anomalyLabel = anomalyAt ? format(new Date(anomalyAt), "HH:mm") : undefined;

  return (
    <div>
      {/* Metric selector */}
      <div className="flex flex-wrap gap-2 mb-4">
        {METRIC_OPTIONS.map((m) => (
          <button
            key={m.key}
            onClick={() => setSelected(m.key)}
            className={cn(
              "text-xs px-3 py-1.5 rounded-lg border transition-all font-medium",
              selected === m.key
                ? "border-primary/50 bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-muted-foreground"
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="time"
            tick={{ fill: "#71717a", fontSize: 10, fontFamily: "JetBrains Mono" }}
            tickLine={false}
            axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
            interval={5}
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
            formatter={(v: unknown) => {
              const val = typeof v === "number" ? v : Number(v) || 0;
              return [`${val.toFixed(2)} ${selectedMeta.unit}`, selectedMeta.label];
            }}
          />
          {anomalyLabel && (
            <ReferenceLine
              x={anomalyLabel}
              stroke="#ef4444"
              strokeDasharray="3 2"
              label={{ value: "Anomaly", fill: "#ef4444", fontSize: 9 }}
            />
          )}
          <Line
            type="monotone"
            dataKey="value"
            stroke={selectedMeta.color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
