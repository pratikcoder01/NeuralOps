"use client";
import Link from "next/link";
import { useRealtimeStore } from "@/store/realtime";
import { SAMPLE_HOSTS } from "@/lib/hooks/useHosts";
import { healthScoreColor, healthScoreHex } from "@/lib/utils/severity";
import { formatRelativeTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { Host } from "@/types";

interface HostCellProps {
  host: Host;
}

function HostCell({ host }: HostCellProps) {
  const realtimeData = useRealtimeStore((s) => s.hostData[host.id]);
  const score = realtimeData?.healthScore ?? host.healthScore ?? 0.8;

  return (
    <Link
      href={`/hosts/${host.id}`}
      className={cn(
        "rounded-lg border p-3 cursor-pointer transition-all duration-300 hover:scale-105",
        healthScoreColor(score)
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-mono truncate text-foreground/80 max-w-[70%]">
          {host.hostname}
        </span>
        {host.openIncidents !== undefined && host.openIncidents > 0 && (
          <span className="text-[9px] px-1 rounded bg-red-500/20 text-red-400 border border-red-500/30 font-bold">
            {host.openIncidents}
          </span>
        )}
      </div>
      {/* Health bar */}
      <div className="h-1 w-full rounded-full bg-white/10 mt-1.5">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${score * 100}%`, backgroundColor: healthScoreHex(score) }}
        />
      </div>
      <p className="text-[9px] text-muted-foreground/60 mt-1">
        {realtimeData ? formatRelativeTime(realtimeData.updatedAt) : formatRelativeTime(host.lastHeartbeat)}
      </p>
    </Link>
  );
}

interface MetricHeatmapProps {
  hosts?: Host[];
}

export function MetricHeatmap({ hosts = SAMPLE_HOSTS }: MetricHeatmapProps) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div>
          <p className="font-semibold text-sm">Host Health Grid</p>
          <p className="text-xs text-muted-foreground mt-0.5">Updates every 30s via WebSocket</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded bg-green-500/60 inline-block" /> Healthy
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded bg-yellow-500/60 inline-block" /> Warning
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded bg-red-500/60 inline-block" /> Critical
          </span>
        </div>
      </div>
      <div className="p-5 grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
        {hosts.map((host) => (
          <HostCell key={host.id} host={host} />
        ))}
      </div>
    </div>
  );
}
