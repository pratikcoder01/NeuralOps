"use client";
import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IncidentHeatmap } from "@/components/charts/IncidentHeatmap";
import { SeverityPie } from "@/components/charts/SeverityPie";
import { TimeSeriesChart } from "@/components/charts/TimeSeriesChart";
import {
  useAnalyticsSummary, useIncidentsByDay, useMttdMttrTrend,
  useTopHosts, useAnomalyDistribution,
} from "@/lib/hooks/useAnalytics";
import { formatDuration, formatCurrency, formatPercent } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import {
  AlertTriangle, Clock, CheckCircle, DollarSign,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const RANGE_OPTIONS = [
  { label: "7d", value: 7 },
  { label: "30d", value: 30 },
  { label: "90d", value: 90 },
];

export default function AnalyticsPage() {
  const [days, setDays] = useState(30);

  const { data: summary } = useAnalyticsSummary(days);
  const { data: byDay } = useIncidentsByDay(days);
  const { data: trend } = useMttdMttrTrend(days);
  const { data: topHosts } = useTopHosts(days);
  const { data: anomalyDist } = useAnomalyDistribution(days);

  const trendSeries = trend
    ? [
        { name: "MTTD (s)", unit: "s", data: trend.map((d) => ({ timestamp: d.date, value: d.mttdSeconds })) },
        { name: "MTTR (s)", unit: "s", data: trend.map((d) => ({ timestamp: d.date, value: d.mttrSeconds })) },
      ]
    : [];

  return (
    <div className="max-w-[1400px] space-y-6">
      <PageHeader
        title="Analytics"
        description="Infrastructure intelligence and trend analysis"
        actions={
          <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setDays(opt.value)}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-md transition-all",
                  days === opt.value
                    ? "bg-primary text-white"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          {
            label: "Total Incidents",
            value: summary?.totalIncidents.toLocaleString() ?? "—",
            icon: AlertTriangle,
            color: "bg-red-500/10 text-red-400",
          },
          {
            label: "Avg MTTD",
            value: summary ? formatDuration(summary.avgMttdSeconds) : "—",
            icon: Clock,
            color: "bg-blue-500/10 text-blue-400",
          },
          {
            label: "Avg MTTR",
            value: summary ? formatDuration(summary.avgMttrSeconds) : "—",
            icon: CheckCircle,
            color: "bg-green-500/10 text-green-400",
          },
          {
            label: "Auto-Resolved",
            value: summary ? formatPercent(summary.autoResolvedPercent) : "—",
            icon: CheckCircle,
            color: "bg-violet-500/10 text-violet-400",
          },
        ].map((card) => (
          <Card key={card.label}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0", card.color)}>
                <card.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xl font-bold font-mono">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Cost Savings */}
      {summary && (
        <Card className="border-green-500/20 bg-green-500/5">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-extrabold font-mono text-green-400">
                {formatCurrency(summary.estimatedCostSavings)}
              </p>
              <p className="text-sm text-muted-foreground">
                Estimated cost savings in the last {days} days
                <span className="text-xs ml-2 text-muted-foreground/60">
                  (baseline MTTR × incidents × $5,600/min)
                </span>
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Incident Calendar Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          {byDay && <IncidentHeatmap data={byDay} />}
        </CardContent>
      </Card>

      {/* MTTD/MTTR Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">MTTD / MTTR Trend</CardTitle>
        </CardHeader>
        <CardContent>
          {trendSeries.length > 0 && (
            <TimeSeriesChart series={trendSeries} colors={["#3b82f6", "#22c55e"]} />
          )}
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Hosts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Top 10 Hosts by Incident Count</CardTitle>
          </CardHeader>
          <CardContent>
            {topHosts && (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topHosts} layout="vertical" margin={{ left: 20, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: "#71717a", fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis
                      type="category" dataKey="hostname" width={150}
                      tick={{ fill: "#a1a1aa", fontSize: 10 }} tickLine={false} axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "11px" }}
                    />
                    <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} fillOpacity={0.8} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Anomaly Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Anomaly Type Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {anomalyDist && <SeverityPie data={anomalyDist} />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
