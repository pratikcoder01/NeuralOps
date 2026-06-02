"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { IncidentCard } from "@/components/incidents/IncidentCard";
import { InlineLoader } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { useIncidents, SAMPLE_INCIDENTS } from "@/lib/hooks/useIncidents";
import { useRealtimeMetrics } from "@/lib/hooks/useRealtimeMetrics";
import { AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import type { IncidentListItem } from "@/types";

export function IncidentFeed() {
  const { data, isLoading, isError } = useIncidents({ pageSize: 15 });
  const [liveIncidents, setLiveIncidents] = useState<IncidentListItem[]>([]);

  // Use sample data as fallback
  const incidents = data?.items ?? SAMPLE_INCIDENTS;

  useRealtimeMetrics({
    onAnomalyDetected: ({ incident }) => {
      setLiveIncidents((prev) => [incident, ...prev]);
      toast.custom(
        (t) => (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: t.visible ? 1 : 0, x: t.visible ? 0 : 50 }}
            className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 shadow-xl max-w-sm"
          >
            <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-400">New Anomaly Detected</p>
              <p className="text-xs text-muted-foreground">{incident.title}</p>
            </div>
          </motion.div>
        ),
        { duration: 6000, position: "top-right" }
      );
    },
  });

  const allIncidents = [...liveIncidents, ...incidents];

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
        <div>
          <p className="font-semibold text-sm">Incident Feed</p>
          <p className="text-xs text-muted-foreground">Sorted by severity · Real-time</p>
        </div>
        {liveIncidents.length > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse">
            {liveIncidents.length} new
          </span>
        )}
      </div>

      {isLoading ? (
        <InlineLoader text="Loading incidents…" />
      ) : isError ? (
        <EmptyState icon={AlertTriangle} title="Failed to load incidents" description="Check your connection and try again." />
      ) : allIncidents.length === 0 ? (
        <EmptyState icon={AlertTriangle} title="No incidents" description="All systems are operating normally." />
      ) : (
        <AnimatePresence initial={false}>
          <div>
            {allIncidents.map((incident, i) => (
              <IncidentCard key={incident.id} incident={incident} index={i} />
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}
