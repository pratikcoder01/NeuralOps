"use client";
import Link from "next/link";
import { Server, AlertTriangle, Clock } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatRelativeTime } from "@/lib/utils/format";
import { healthScoreColor, healthScoreHex, HOST_STATUS_MAP } from "@/lib/utils/severity";
import type { Host } from "@/types";

interface HostCardProps {
  host: Host;
}

export function HostCard({ host }: HostCardProps) {
  const statusMeta = HOST_STATUS_MAP[host.status];
  const score = host.healthScore ?? 0.8;

  return (
    <Link
      href={`/hosts/${host.id}`}
      className={cn(
        "group rounded-xl border bg-card p-4 transition-all duration-200 hover:border-primary/30",
        host.status === "OFFLINE" ? "opacity-70" : ""
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", healthScoreColor(score))}>
            <Server className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate max-w-[160px] group-hover:text-primary transition-colors">
              {host.hostname}
            </p>
            <p className="text-xs text-muted-foreground font-mono">{host.ipAddress}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className={cn("h-1.5 w-1.5 rounded-full", statusMeta.dotColor)} />
          <span className={cn("text-xs", statusMeta.color)}>{statusMeta.label}</span>
        </div>
      </div>

      {/* Health bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
          <span>Health Score</span>
          <span className="font-mono" style={{ color: healthScoreHex(score) }}>
            {(score * 100).toFixed(0)}%
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${score * 100}%`, backgroundColor: healthScoreHex(score) }}
          />
        </div>
      </div>

      {/* Metadata */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatRelativeTime(host.lastHeartbeat)}
        </span>
        <div className="flex items-center gap-2">
          {host.openIncidents !== undefined && host.openIncidents > 0 && (
            <span className="flex items-center gap-0.5 text-red-400">
              <AlertTriangle className="h-3 w-3" />
              {host.openIncidents}
            </span>
          )}
          <span className="text-muted-foreground/50">v{host.agentVersion}</span>
        </div>
      </div>

      {/* Tags */}
      {Object.entries(host.tags).slice(0, 3).length > 0 && (
        <div className="flex gap-1 flex-wrap mt-3">
          {Object.entries(host.tags).slice(0, 3).map(([k, v]) => (
            <span
              key={k}
              className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono"
            >
              {k}:{v}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
