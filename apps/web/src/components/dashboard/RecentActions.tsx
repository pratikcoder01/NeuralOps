"use client";
import { CheckCircle, XCircle, Loader2, Clock } from "lucide-react";
import { formatRelativeTime, formatDuration } from "@/lib/utils/format";
import { actionStatusColor } from "@/lib/utils/severity";
import { cn } from "@/lib/utils/cn";

const SAMPLE_ACTIONS = [
  { id: "a-001", actionType: "SCALE_OUT", status: "SUCCESS", incidentId: "inc-004", executedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(), durationSeconds: 47 },
  { id: "a-002", actionType: "PURGE_LOGS", status: "RUNNING", incidentId: "inc-003", executedAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(), durationSeconds: undefined },
  { id: "a-003", actionType: "RESTART_SERVICE", status: "PENDING_APPROVAL", incidentId: "inc-002", executedAt: undefined, durationSeconds: undefined },
  { id: "a-004", actionType: "ROTATE_SECRET", status: "SUCCESS", incidentId: "inc-005", executedAt: new Date(Date.now() - 3.6 * 60 * 60 * 1000).toISOString(), durationSeconds: 12 },
  { id: "a-005", actionType: "DRAIN_NODE", status: "FAILED", incidentId: "inc-001", executedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), durationSeconds: 120 },
];

const STATUS_ICONS: Record<string, React.ElementType> = {
  SUCCESS: CheckCircle,
  FAILED: XCircle,
  RUNNING: Loader2,
  PENDING_APPROVAL: Clock,
  PENDING: Clock,
};

export function RecentActions() {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="px-4 py-3.5 border-b border-border">
        <p className="font-semibold text-sm">Recent Remediation Actions</p>
        <p className="text-xs text-muted-foreground mt-0.5">Last 5 automated responses</p>
      </div>
      <div className="divide-y divide-border">
        {SAMPLE_ACTIONS.map((action) => {
          const StatusIcon = STATUS_ICONS[action.status] ?? Clock;
          return (
            <div key={action.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
              <StatusIcon
                className={cn(
                  "h-4 w-4 flex-shrink-0",
                  actionStatusColor(action.status),
                  action.status === "RUNNING" && "animate-spin"
                )}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">
                  {action.actionType.replace(/_/g, " ")}
                </p>
                <p className="text-[10px] text-muted-foreground font-mono">
                  {action.incidentId}
                  {action.durationSeconds !== undefined && ` · ${formatDuration(action.durationSeconds)}`}
                </p>
              </div>
              <div className="flex-shrink-0 text-right">
                <p className={cn("text-[10px] font-semibold uppercase", actionStatusColor(action.status))}>
                  {action.status.replace(/_/g, " ")}
                </p>
                {action.executedAt && (
                  <p className="text-[10px] text-muted-foreground">
                    {formatRelativeTime(action.executedAt)}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
