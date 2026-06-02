"use client";
import { useMemo } from "react";
import type { IncidentCountByDay } from "@/types";
import { cn } from "@/lib/utils/cn";

interface IncidentHeatmapProps {
  data: IncidentCountByDay[];
}

function getColor(count: number, max: number): string {
  if (count === 0) return "bg-muted/50";
  const intensity = count / max;
  if (intensity >= 0.75) return "bg-red-500";
  if (intensity >= 0.5) return "bg-red-500/70";
  if (intensity >= 0.25) return "bg-red-500/40";
  return "bg-red-500/20";
}

export function IncidentHeatmap({ data }: IncidentHeatmapProps) {
  const max = useMemo(() => Math.max(...data.map((d) => d.count), 1), [data]);

  // Group into weeks (rows of 7)
  const weeks = useMemo(() => {
    const arr = [...data];
    const result: IncidentCountByDay[][] = [];
    for (let i = 0; i < arr.length; i += 7) {
      result.push(arr.slice(i, i + 7));
    }
    return result;
  }, [data]);

  return (
    <div>
      <div className="flex gap-1 flex-wrap">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((day) => (
              <div
                key={day.date}
                title={`${day.date}: ${day.count} incidents`}
                className={cn(
                  "h-3 w-3 rounded-sm transition-all cursor-default",
                  getColor(day.count, max)
                )}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
        <span>Less</span>
        {[0, 0.25, 0.5, 0.75, 1].map((v, i) => (
          <div
            key={i}
            className={cn("h-3 w-3 rounded-sm", getColor(Math.round(v * max), max))}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
