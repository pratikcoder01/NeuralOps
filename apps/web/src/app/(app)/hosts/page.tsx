"use client";
import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { HostCard } from "@/components/hosts/HostCard";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { Input } from "@/components/ui/input";
import { useHosts, SAMPLE_HOSTS } from "@/lib/hooks/useHosts";
import { Server, Search } from "lucide-react";

export default function HostsPage() {
  const { data, isLoading } = useHosts({ pageSize: 50 });
  const hosts = data?.items ?? SAMPLE_HOSTS;
  const [search, setSearch] = useState("");

  const filtered = hosts.filter(
    (h) =>
      h.hostname.toLowerCase().includes(search.toLowerCase()) ||
      h.ipAddress.includes(search)
  );

  return (
    <div className="max-w-[1400px] space-y-6">
      <PageHeader
        title="Hosts"
        description={`${hosts.length} registered hosts`}
        breadcrumbs={[{ label: "Hosts" }]}
      />

      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search hosts…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 text-sm"
        />
      </div>

      {isLoading ? (
        <PageLoader />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Server} title="No hosts found" description="No hosts match your search." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((host) => (
            <HostCard key={host.id} host={host} />
          ))}
        </div>
      )}
    </div>
  );
}
