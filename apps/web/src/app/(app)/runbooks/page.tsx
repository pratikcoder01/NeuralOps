"use client";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Cpu, Server, HardDrive, RefreshCw, Key, CircuitBoard } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils/format";
import type { Runbook } from "@/types";

const ACTION_ICONS: Record<string, React.ElementType> = {
  SCALE_OUT: Server,
  RESTART_SERVICE: RefreshCw,
  PURGE_LOGS: HardDrive,
  ROTATE_SECRET: Key,
  DRAIN_NODE: CircuitBoard,
  CUSTOM: Cpu,
};

const SAMPLE_RUNBOOKS: Runbook[] = [
  {
    id: "rb-001",
    title: "Scale Out K8s Node Group",
    description: "Adds one or more nodes to the specified Kubernetes node group when CPU utilization exceeds 85% sustained for >5 minutes.",
    triggerConditions: ["cpu_percent_p95 > 0.85", "load_avg_1m > cpu_count * 0.9"],
    tags: ["kubernetes", "cpu", "scaling"],
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    usageCount: 47,
    steps: [
      { order: 1, title: "Verify anomaly score", description: "Confirm score > 0.75", actionType: undefined },
      { order: 2, title: "Scale node group", description: "Add 1 node via AWS ASG", actionType: "SCALE_OUT", params: { count: 1 } },
      { order: 3, title: "Verify node ready", description: "Wait for node to join cluster", actionType: undefined },
    ],
  },
  {
    id: "rb-002",
    title: "Restart OOM Service",
    description: "Gracefully restarts the affected service when memory pressure indicates OOM risk.",
    triggerConditions: ["mem_pressure > 0.90", "mem_used_ratio > 0.95"],
    tags: ["memory", "oom", "service"],
    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    usageCount: 31,
    steps: [
      { order: 1, title: "Identify top memory process", description: "Find the highest memory consumer", actionType: undefined },
      { order: 2, title: "Drain connections", description: "Load balancer drain", actionType: undefined },
      { order: 3, title: "Restart service", description: "SIGTERM + wait + SIGKILL if needed", actionType: "RESTART_SERVICE" },
    ],
  },
  {
    id: "rb-003",
    title: "Purge Application Logs",
    description: "Cleans up large log files when disk utilization exceeds 90%.",
    triggerConditions: ["disk_io_util > 0.90", "disk_await_ms > 100"],
    tags: ["disk", "logs", "cleanup"],
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    usageCount: 22,
    steps: [
      { order: 1, title: "Identify large log files", description: "Find files > 1GB in /var/log", actionType: undefined },
      { order: 2, title: "Rotate and compress", description: "logrotate --force", actionType: "PURGE_LOGS" },
    ],
  },
];

export default function RunbooksPage() {
  return (
    <div className="max-w-[1200px] space-y-6">
      <PageHeader
        title="Runbook Library"
        description={`${SAMPLE_RUNBOOKS.length} automated remediation runbooks`}
        breadcrumbs={[{ label: "Runbooks" }]}
      />

      <div className="space-y-4">
        {SAMPLE_RUNBOOKS.map((rb) => (
          <Card key={rb.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                    <BookOpen className="h-4 w-4 text-blue-400" />
                  </div>
                  <div>
                    <CardTitle className="text-sm">{rb.title}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Used {rb.usageCount} times · Updated {formatRelativeTime(rb.updatedAt)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1.5 flex-wrap justify-end">
                  {rb.tags.map((t) => (
                    <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">{rb.description}</p>

              {/* Trigger conditions */}
              <div className="mb-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Trigger Conditions</p>
                <div className="flex flex-wrap gap-2">
                  {rb.triggerConditions.map((cond) => (
                    <code key={cond} className="text-[11px] px-2 py-1 rounded bg-muted text-foreground/80 font-mono border border-border">
                      {cond}
                    </code>
                  ))}
                </div>
              </div>

              {/* Steps */}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Steps</p>
                <div className="space-y-2">
                  {rb.steps.map((step) => {
                    const StepIcon = step.actionType ? (ACTION_ICONS[step.actionType] ?? Cpu) : Cpu;
                    return (
                      <div key={step.order} className="flex items-start gap-3">
                        <div className="flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-muted text-muted-foreground text-[10px] font-bold mt-0.5">
                          {step.order}
                        </div>
                        <div>
                          <p className="text-xs font-medium">{step.title}</p>
                          <p className="text-xs text-muted-foreground">{step.description}</p>
                          {step.actionType && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono mt-0.5">
                              <StepIcon className="h-3 w-3" /> {step.actionType}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
