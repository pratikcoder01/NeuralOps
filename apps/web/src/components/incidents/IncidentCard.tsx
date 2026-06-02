"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { Server, Clock, TrendingUp } from "lucide-react";
import { SeverityBadge } from "./SeverityBadge";
import { formatRelativeTime, formatDuration, formatScore } from "@/lib/utils/format";
import { incidentStatusColor } from "@/lib/utils/severity";
import { cn } from "@/lib/utils/cn";
import type { IncidentListItem } from "@/types";

interface IncidentCardProps {
  incident: IncidentListItem;
  index?: number;
}

export function IncidentCard({ incident, index = 0 }: IncidentCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.03 }}
    >
      <Link
        href={`/incidents/${incident.id}`}
        className={cn(
          "group flex items-center gap-4 px-4 py-3.5 border-b border-border",
          "hover:bg-muted/30 transition-colors duration-150",
          "relative"
        )}
      >
        {/* Severity indicator bar */}
        <div
          className={cn(
            "absolute left-0 top-0 bottom-0 w-0.5",
            incident.severity === "CRITICAL" && "bg-red-500",
            incident.severity === "HIGH" && "bg-orange-500",
            incident.severity === "MEDIUM" && "bg-yellow-500",
            incident.severity === "LOW" && "bg-green-500"
          )}
        />

        {/* Severity badge */}
        <SeverityBadge severity={incident.severity} size="sm" />

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
            {incident.title}
          </p>
          <div className="flex items-center gap-3 mt-0.5">
            {incident.hostname && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Server className="h-3 w-3" />
                {incident.hostname}
              </span>
            )}
            {incident.anomalyType && (
              <span className="text-xs text-muted-foreground font-mono">
                {incident.anomalyType.replace(/_/g, " ")}
              </span>
            )}
          </div>
        </div>

        {/* Anomaly score */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <TrendingUp className="h-3 w-3" />
            <span className="font-mono font-semibold text-foreground">
              {formatScore(incident.anomalyScore)}
            </span>
          </div>

          {/* Status */}
          <span
            className={cn(
              "text-[10px] px-1.5 py-0.5 rounded border font-semibold uppercase tracking-wide",
              incidentStatusColor(incident.status)
            )}
          >
            {incident.status}
          </span>
        </div>

        {/* Time */}
        <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground flex-shrink-0 w-20">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatRelativeTime(incident.detectedAt)}
          </span>
          {incident.ttdSeconds !== undefined && (
            <span className="font-mono">TTD {formatDuration(incident.ttdSeconds)}</span>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
