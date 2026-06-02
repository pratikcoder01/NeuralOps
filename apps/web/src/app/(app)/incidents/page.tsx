"use client";
import { PageHeader } from "@/components/layout/PageHeader";
import { IncidentFilters } from "@/components/incidents/IncidentFilters";
import { IncidentCard } from "@/components/incidents/IncidentCard";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { useIncidents, SAMPLE_INCIDENTS } from "@/lib/hooks/useIncidents";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFiltersStore } from "@/store/filters";

export default function IncidentsPage() {
  const { data, isLoading, isError } = useIncidents();
  const { filters, setFilter } = useFiltersStore();
  const incidents = data?.items ?? SAMPLE_INCIDENTS;

  return (
    <div className="space-y-0 max-w-[1400px]">
      <div className="mb-4">
        <PageHeader
          title="Incidents"
          description={`${data?.total ?? incidents.length} total incidents`}
          breadcrumbs={[{ label: "Incidents" }]}
        />
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <IncidentFilters />

        {isLoading ? (
          <PageLoader />
        ) : isError ? (
          <EmptyState
            icon={AlertTriangle}
            title="Failed to load incidents"
            description="Could not connect to the backend."
          />
        ) : incidents.length === 0 ? (
          <EmptyState
            icon={AlertTriangle}
            title="No incidents found"
            description="Try clearing filters or check back later."
            action={{ label: "Clear filters", onClick: () => useFiltersStore.getState().resetFilters() }}
          />
        ) : (
          <div>
            {incidents.map((inc, i) => (
              <IncidentCard key={inc.id} incident={inc} index={i} />
            ))}

            {/* Pagination */}
            {data && data.hasNext && (
              <div className="flex items-center justify-center py-4 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilter("page", filters.page + 1)}
                >
                  Load more
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
