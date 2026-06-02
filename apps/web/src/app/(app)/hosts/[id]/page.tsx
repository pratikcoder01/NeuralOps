"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Server, Cloud, Tag, Clock } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { MetricChart } from "@/components/hosts/MetricChart";
import { IncidentCard } from "@/components/incidents/IncidentCard";
import { useHost, SAMPLE_HOSTS } from "@/lib/hooks/useHosts";
import { SAMPLE_INCIDENTS } from "@/lib/hooks/useIncidents";
import { formatRelativeTime } from "@/lib/utils/format";
import { HOST_STATUS_MAP, healthScoreHex } from "@/lib/utils/severity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

export default function HostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: host } = useHost(id);
  const h = host ?? SAMPLE_HOSTS.find((s) => s.id === id) ?? SAMPLE_HOSTS[0];
  const statusMeta = HOST_STATUS_MAP[h.status];
  const score = h.healthScore ?? 0.8;
  const hostIncidents = SAMPLE_INCIDENTS.filter((i) => i.hostId === h.id);

  return (
    <div className="max-w-[1400px] space-y-6">
      <Link
        href="/hosts"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> All Hosts
      </Link>

      <PageHeader
        title={h.hostname}
        description={h.ipAddress}
        breadcrumbs={[{ label: "Hosts", href: "/hosts" }, { label: h.hostname }]}
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: host info */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Host Details</CardTitle>
                <div className="flex items-center gap-1.5">
                  <span className={cn("h-2 w-2 rounded-full", statusMeta.dotColor)} />
                  <span className={cn("text-xs", statusMeta.color)}>{statusMeta.label}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Health Score</span>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-20 rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${score * 100}%`, backgroundColor: healthScoreHex(score) }}
                    />
                  </div>
                  <span className="text-xs font-mono" style={{ color: healthScoreHex(score) }}>
                    {(score * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              {[
                { label: "Cloud", value: h.cloudProvider, icon: Cloud },
                { label: "Region", value: h.region ?? "—", icon: Server },
                { label: "Last Heartbeat", value: formatRelativeTime(h.lastHeartbeat), icon: Clock },
                { label: "Agent Version", value: `v${h.agentVersion}`, icon: Server },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Icon className="h-3 w-3" /> {label}
                  </span>
                  <span className="text-xs font-mono">{value}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Tags */}
          {Object.keys(h.tags).length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5" /> Tags
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(h.tags).map(([k, v]) => (
                    <span key={k} className="text-xs px-2 py-1 rounded-lg bg-muted font-mono">
                      {k}:{v}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: charts + incidents */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Metrics — Last 24 hours</CardTitle>
            </CardHeader>
            <CardContent>
              <MetricChart hostId={h.id} />
            </CardContent>
          </Card>

          {hostIncidents.length > 0 && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-4 py-3.5 border-b border-border">
                <p className="text-sm font-semibold">Recent Incidents</p>
              </div>
              {hostIncidents.map((inc, i) => (
                <IncidentCard key={inc.id} incident={inc} index={i} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
