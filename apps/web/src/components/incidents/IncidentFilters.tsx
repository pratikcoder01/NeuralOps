"use client";
import { useState } from "react";
import { useFiltersStore } from "@/store/filters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";
import { Search, X, Filter } from "lucide-react";
import type { Severity, IncidentStatus } from "@/types";

const SEVERITIES: Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
const STATUSES: IncidentStatus[] = ["OPEN", "INVESTIGATING", "RESOLVED", "SUPPRESSED"];

const SEVERITY_COLORS: Record<Severity, string> = {
  CRITICAL: "border-red-500/50 text-red-400 bg-red-500/10 data-[active=true]:bg-red-500/20",
  HIGH: "border-orange-500/50 text-orange-400 bg-orange-500/10 data-[active=true]:bg-orange-500/20",
  MEDIUM: "border-yellow-500/50 text-yellow-400 bg-yellow-500/10 data-[active=true]:bg-yellow-500/20",
  LOW: "border-green-500/50 text-green-400 bg-green-500/10 data-[active=true]:bg-green-500/20",
};

export function IncidentFilters() {
  const { filters, setSeverity, setStatus, setFilter, resetFilters } = useFiltersStore();
  const [searchVal, setSearchVal] = useState(filters.search ?? "");

  const toggleSeverity = (s: Severity) => {
    const next = filters.severity.includes(s)
      ? filters.severity.filter((x) => x !== s)
      : [...filters.severity, s];
    setSeverity(next);
  };

  const toggleStatus = (s: IncidentStatus) => {
    const next = filters.status.includes(s)
      ? filters.status.filter((x) => x !== s)
      : [...filters.status, s];
    setStatus(next);
  };

  const hasFilters = filters.severity.length > 0 || filters.status.length > 0 || !!filters.search;

  return (
    <div className="flex flex-wrap items-center gap-2 py-3 px-4 border-b border-border bg-surface">
      {/* Search */}
      <div className="relative flex-1 min-w-48 max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search incidents…"
          value={searchVal}
          onChange={(e) => {
            setSearchVal(e.target.value);
            setFilter("search", e.target.value);
          }}
          className="pl-8 h-8 text-xs bg-background"
        />
      </div>

      {/* Severity chips */}
      <div className="flex items-center gap-1.5">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        {SEVERITIES.map((s) => (
          <button
            key={s}
            data-active={filters.severity.includes(s)}
            onClick={() => toggleSeverity(s)}
            className={cn(
              "text-[10px] px-2 py-1 rounded-full border font-semibold uppercase tracking-wide transition-all",
              SEVERITY_COLORS[s]
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Status chips */}
      <div className="flex items-center gap-1.5">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => toggleStatus(s)}
            className={cn(
              "text-[10px] px-2 py-1 rounded-full border font-semibold uppercase tracking-wide transition-all",
              filters.status.includes(s)
                ? "border-primary/50 bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-muted-foreground"
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Reset */}
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={resetFilters} className="h-7 text-xs gap-1">
          <X className="h-3 w-3" /> Clear
        </Button>
      )}
    </div>
  );
}
