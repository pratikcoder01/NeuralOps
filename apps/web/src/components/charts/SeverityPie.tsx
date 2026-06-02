"use client";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { AnomalyTypeDistribution } from "@/types";

const COLORS = ["#ef4444", "#f97316", "#eab308", "#3b82f6", "#8b5cf6", "#22c55e"];

interface SeverityPieProps {
  data: AnomalyTypeDistribution[];
}

export function SeverityPie({ data }: SeverityPieProps) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="45%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={3}
          dataKey="count"
          nameKey="type"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.85} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: "#111111",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "8px",
            fontSize: "11px",
            fontFamily: "JetBrains Mono",
          }}
          formatter={(value, name) => [value, name]}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: "11px", paddingTop: "12px" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
