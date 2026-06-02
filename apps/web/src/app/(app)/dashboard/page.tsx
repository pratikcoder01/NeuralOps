import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatsRow } from "@/components/dashboard/StatsRow";
import { MetricHeatmap } from "@/components/dashboard/MetricHeatmap";
import { IncidentFeed } from "@/components/dashboard/IncidentFeed";
import { RecentActions } from "@/components/dashboard/RecentActions";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <div className="space-y-6 max-w-[1600px]">
      <PageHeader
        title="Dashboard"
        description="Real-time infrastructure health overview"
      />
      <StatsRow />
      <MetricHeatmap />
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <IncidentFeed />
        </div>
        <div>
          <RecentActions />
        </div>
      </div>
    </div>
  );
}
