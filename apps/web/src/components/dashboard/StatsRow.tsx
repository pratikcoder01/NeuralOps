"use client";
import { AlertTriangle, Clock, CheckCircle, Server } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkline } from "@/components/charts/Sparkline";
import { formatDuration, formatCount } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

interface StatsData {
  openIncidents: number;
  avgMttdToday: number;
  avgMttrToday: number;
  hostsOnline: number;
  hostsTotal: number;
}

const SAMPLE_STATS: StatsData = {
  openIncidents: 3,
  avgMttdToday: 43,
  avgMttrToday: 2340,
  hostsOnline: 47,
  hostsTotal: 52,
};

const SAMPLE_SPARKLINES = {
  incidents: [8, 5, 12, 3, 7, 9, 3, 4, 6, 3],
  mttd: [55, 48, 62, 38, 43, 51, 39, 47, 43, 43],
  mttr: [2800, 2500, 3100, 2200, 2400, 2600, 2100, 2800, 2400, 2340],
  hosts: [45, 46, 44, 47, 48, 46, 47, 47, 48, 47],
};

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color: string;
  trend?: number[];
  trendColor?: string;
}

function StatCard({ label, value, sub, icon: Icon, color, trend, trendColor }: StatCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center", color)}>
            <Icon className="h-4 w-4" />
          </div>
          {trend && (
            <div className="h-10 w-20">
              <Sparkline data={trend} color={trendColor ?? "#3b82f6"} />
            </div>
          )}
        </div>
        <p className="text-2xl font-bold font-mono tracking-tight">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        {sub && <p className="text-xs text-muted-foreground/60 mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

interface StatsRowProps {
  stats?: StatsData;
}

export function StatsRow({ stats = SAMPLE_STATS }: StatsRowProps) {
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      <StatCard
        label="Open Incidents"
        value={formatCount(stats.openIncidents)}
        sub="Across all hosts"
        icon={AlertTriangle}
        color="bg-red-500/10 text-red-400"
        trend={SAMPLE_SPARKLINES.incidents}
        trendColor="#ef4444"
      />
      <StatCard
        label="Avg MTTD Today"
        value={formatDuration(stats.avgMttdToday)}
        sub="Time to detect"
        icon={Clock}
        color="bg-blue-500/10 text-blue-400"
        trend={SAMPLE_SPARKLINES.mttd}
        trendColor="#3b82f6"
      />
      <StatCard
        label="Avg MTTR Today"
        value={formatDuration(stats.avgMttrToday)}
        sub="Time to resolve"
        icon={CheckCircle}
        color="bg-green-500/10 text-green-400"
        trend={SAMPLE_SPARKLINES.mttr}
        trendColor="#22c55e"
      />
      <StatCard
        label="Hosts Online"
        value={`${stats.hostsOnline}/${stats.hostsTotal}`}
        sub={`${stats.hostsTotal - stats.hostsOnline} degraded/offline`}
        icon={Server}
        color="bg-violet-500/10 text-violet-400"
        trend={SAMPLE_SPARKLINES.hosts}
        trendColor="#8b5cf6"
      />
    </div>
  );
}
