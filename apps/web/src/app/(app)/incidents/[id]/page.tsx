"use client";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Server, Clock, Hash, ArrowLeft, CheckCircle, Shield, GitBranch, ListOrdered, FileText
} from "lucide-react";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SeverityBadge } from "@/components/incidents/SeverityBadge";
import { AnomalyChart } from "@/components/incidents/AnomalyChart";
import { LLMExplanation } from "@/components/incidents/LLMExplanation";
import { DependencyGraph } from "@/components/incidents/DependencyGraph";
import { RemediationCard } from "@/components/incidents/RemediationCard";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { useIncident } from "@/lib/hooks/useIncidents";
import { formatTimestamp, formatDuration, formatScore } from "@/lib/utils/format";
import { incidentStatusColor } from "@/lib/utils/severity";
import { cn } from "@/lib/utils/cn";
import type { Incident, RemediationAction } from "@/types";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

// ─── Sample data for development ────────────────────────────

const SAMPLE_INCIDENT: Incident = {
  id: "inc-001",
  workspaceId: "ws-001",
  hostId: "host-001",
  host: {
    id: "host-001",
    workspaceId: "ws-001",
    hostname: "k8s-node-primary-01",
    ipAddress: "10.0.1.10",
    cloudProvider: "AWS",
    region: "us-east-1",
    tags: { env: "production" },
    agentVersion: "2.4.1",
    lastHeartbeat: new Date(Date.now() - 25000).toISOString(),
    status: "ONLINE",
  },
  title: "CPU spike detected — k8s-node-primary-01",
  severity: "CRITICAL",
  status: "OPEN",
  anomalyScore: 0.94,
  anomalyType: "CPU_SPIKE",
  metricSnapshot: {
    cpu_percent_mean: 89.3,
    cpu_percent_std: 12.4,
    cpu_percent_p95: 97.1,
    mem_used_ratio: 0.78,
    mem_pressure: 0.82,
    disk_io_util: 45.2,
    disk_await_ms: 18.3,
    net_bytes_recv_rate: 125000,
    net_bytes_sent_rate: 89000,
    net_drop_rate: 0.003,
    load_avg_1m: 7.8,
    load_avg_5m: 6.2,
    process_count_delta: 12,
    http_latency_p99: 420,
    tcp_retransmit_rate: 0.0012,
  },
  llmExplanation: `The anomaly on k8s-node-primary-01 is driven primarily by a CPU spike (p95: 97.1%) correlated with a 12-process delta, suggesting a runaway process or container escape.

Memory pressure (0.82) indicates the JVM heap in the payment-service pod has grown beyond its limits, triggering aggressive GC cycles that amplify CPU load. This is consistent with a memory leak in the payment-service v2.3.1 deployed 2 hours prior.

The load average of 7.8 (1m) against an 8-core node indicates near-total CPU saturation. HTTP p99 latency has spiked to 420ms (3× normal), confirming user-facing impact.

**Recommended action**: Scale out k8s node group and restart payment-service pod to clear heap state. Monitor heap growth rate post-restart.`,
  rootCauseTags: ["JVM_HEAP_LEAK", "CONTAINER_CPU_THROTTLE", "GC_PRESSURE"],
  featureImportance: {
    cpu_percent_p95: 0.34,
    load_avg_1m: 0.28,
    process_count_delta: 0.18,
    mem_pressure: 0.12,
    http_latency_p99: 0.08,
  },
  detectedAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
  ttdSeconds: 45,
  remediationActions: [
    {
      id: "act-001",
      incidentId: "inc-001",
      workspaceId: "ws-001",
      actionType: "SCALE_OUT",
      actionParams: { node_group: "k8s-production", count: 1, region: "us-east-1" },
      approvalRequired: true,
      status: "PENDING_APPROVAL",
    },
  ],
};

const AUDIT_LOG = [
  { id: 1, action: "INCIDENT_CREATED", resource: "Incident", userName: "system", createdAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(), payload: {} },
  { id: 2, action: "LLM_ANALYSIS_COMPLETED", resource: "Incident", userName: "system", createdAt: new Date(Date.now() - 11.5 * 60 * 1000).toISOString(), payload: {} },
  { id: 3, action: "RUNBOOK_MATCHED", resource: "Runbook", userName: "system", createdAt: new Date(Date.now() - 11 * 60 * 1000).toISOString(), payload: { runbook: "SCALE_OUT_K8S" } },
  { id: 4, action: "APPROVAL_REQUESTED", resource: "RemediationAction", userName: "system", createdAt: new Date(Date.now() - 10.5 * 60 * 1000).toISOString(), payload: {} },
];

const TIMELINE = [
  { event: "Anomaly Detected", time: new Date(Date.now() - 12 * 60 * 1000).toISOString(), icon: "🔍", color: "text-red-400" },
  { event: "Agent Triggered", time: new Date(Date.now() - 11.8 * 60 * 1000).toISOString(), icon: "⚡", color: "text-blue-400" },
  { event: "Runbooks Retrieved", time: new Date(Date.now() - 11.5 * 60 * 1000).toISOString(), icon: "📖", color: "text-blue-400" },
  { event: "Action Selected: SCALE_OUT", time: new Date(Date.now() - 11 * 60 * 1000).toISOString(), icon: "🎯", color: "text-violet-400" },
  { event: "Approval Requested", time: new Date(Date.now() - 10.5 * 60 * 1000).toISOString(), icon: "⏳", color: "text-yellow-400" },
];

export default function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: incident, isLoading } = useIncident(id);
  const inc = incident ?? SAMPLE_INCIDENT;

  if (isLoading) return <PageLoader />;

  const featureData = Object.entries(inc.featureImportance ?? {})
    .sort(([, a], [, b]) => b - a)
    .map(([name, score]) => ({ name: name.replace(/_/g, " "), score: (score * 100).toFixed(1) }));

  return (
    <div className="max-w-[1400px] space-y-6">
      {/* Back link */}
      <Link
        href="/incidents"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> All Incidents
      </Link>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-border bg-card p-5"
      >
        <div className="flex flex-wrap items-start gap-3 mb-3">
          <SeverityBadge severity={inc.severity} />
          <span className={cn(
            "text-xs px-2.5 py-1 rounded-full border font-semibold uppercase",
            incidentStatusColor(inc.status)
          )}>
            {inc.status}
          </span>
        </div>
        <h1 className="text-xl font-bold mb-4">{inc.title}</h1>
        <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Server className="h-4 w-4" />
            {inc.host?.hostname ?? inc.hostId}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            {formatTimestamp(inc.detectedAt)}
          </span>
          <span className="flex items-center gap-1.5 font-mono text-foreground">
            <Hash className="h-4 w-4" />
            Score: {formatScore(inc.anomalyScore)}
          </span>
          {inc.ttdSeconds !== undefined && (
            <span className="flex items-center gap-1.5">
              TTD: <span className="font-mono text-foreground">{formatDuration(inc.ttdSeconds)}</span>
            </span>
          )}
        </div>
        {inc.rootCauseTags.length > 0 && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {inc.rootCauseTags.map((tag) => (
              <span key={tag} className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                {tag}
              </span>
            ))}
          </div>
        )}
      </motion.div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="w-full justify-start bg-card border border-border px-2 py-1.5 h-auto rounded-xl gap-1">
          <TabsTrigger value="overview" className="text-xs gap-1.5">
            <CheckCircle className="h-3.5 w-3.5" /> Overview
          </TabsTrigger>
          <TabsTrigger value="rootcause" className="text-xs gap-1.5">
            <GitBranch className="h-3.5 w-3.5" /> Root Cause
          </TabsTrigger>
          <TabsTrigger value="remediation" className="text-xs gap-1.5">
            <Shield className="h-3.5 w-3.5" /> Remediation
          </TabsTrigger>
          <TabsTrigger value="timeline" className="text-xs gap-1.5">
            <ListOrdered className="h-3.5 w-3.5" /> Timeline
          </TabsTrigger>
          <TabsTrigger value="audit" className="text-xs gap-1.5">
            <FileText className="h-3.5 w-3.5" /> Audit Log
          </TabsTrigger>
        </TabsList>

        {/* ─── Overview ─── */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-sm font-semibold mb-4">Metric Values at Detection</p>
            <AnomalyChart metricSnapshot={inc.metricSnapshot} detectedAt={inc.detectedAt} />
          </div>
          <LLMExplanation explanation={inc.llmExplanation} />
        </TabsContent>

        {/* ─── Root Cause ─── */}
        <TabsContent value="rootcause" className="mt-4 space-y-4">
          {featureData.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="text-sm font-semibold mb-4">Feature Importance Scores</p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={featureData} layout="vertical" margin={{ left: 20, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                    <XAxis
                      type="number" domain={[0, 40]}
                      tick={{ fill: "#71717a", fontSize: 10, fontFamily: "JetBrains Mono" }}
                      tickLine={false} axisLine={false}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <YAxis
                      type="category" dataKey="name"
                      tick={{ fill: "#a1a1aa", fontSize: 10 }}
                      tickLine={false} axisLine={false} width={130}
                    />
                    <Tooltip
                      contentStyle={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "11px", fontFamily: "JetBrains Mono" }}
                      formatter={(v) => [`${v}%`, "Importance"]}
                    />
                    <Bar dataKey="score" fill="#ef4444" radius={[0, 4, 4, 0]} fillOpacity={0.8} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          <DependencyGraph />
        </TabsContent>

        {/* ─── Remediation ─── */}
        <TabsContent value="remediation" className="mt-4 space-y-4">
          {inc.remediationActions && inc.remediationActions.length > 0 ? (
            inc.remediationActions.map((action) => (
              <RemediationCard key={action.id} action={action as RemediationAction} />
            ))
          ) : (
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <Shield className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No remediation actions yet</p>
            </div>
          )}
        </TabsContent>

        {/* ─── Timeline ─── */}
        <TabsContent value="timeline" className="mt-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-sm font-semibold mb-6">Incident Timeline</p>
            <div className="relative pl-6">
              <div className="absolute left-2 top-0 bottom-0 w-px bg-border" />
              {TIMELINE.map((item, i) => (
                <div key={i} className="relative mb-6 last:mb-0">
                  <div className="absolute -left-4 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-card border border-border text-xs">
                    {item.icon}
                  </div>
                  <div className="pl-3">
                    <p className={cn("text-sm font-medium", item.color)}>{item.event}</p>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                      {formatTimestamp(item.time)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ─── Audit Log ─── */}
        <TabsContent value="audit" className="mt-4">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border">
              <p className="text-sm font-semibold">Audit Log</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b border-border bg-muted/20">
                  <tr>
                    {["Time", "Action", "Resource", "Actor", "IP"].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left font-medium text-muted-foreground">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {AUDIT_LOG.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-mono text-muted-foreground">
                        {formatTimestamp(log.createdAt)}
                      </td>
                      <td className="px-4 py-3 font-mono text-primary">{log.action}</td>
                      <td className="px-4 py-3">{log.resource}</td>
                      <td className="px-4 py-3 text-muted-foreground">{log.userName}</td>
                      <td className="px-4 py-3 text-muted-foreground">—</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
