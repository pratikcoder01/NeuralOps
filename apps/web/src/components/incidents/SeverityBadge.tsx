"use client";
import { cn } from "@/lib/utils/cn";
import { SEVERITY_MAP } from "@/lib/utils/severity";
import type { Severity } from "@/types";

interface SeverityBadgeProps {
  severity: Severity;
  size?: "sm" | "md";
  showDot?: boolean;
  className?: string;
}

export function SeverityBadge({ severity, size = "md", showDot = true, className }: SeverityBadgeProps) {
  const meta = SEVERITY_MAP[severity];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-semibold uppercase tracking-wide",
        meta.bgColor,
        meta.borderColor,
        meta.color,
        size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1",
        className
      )}
    >
      {showDot && (
        <span
          className={cn(
            "rounded-full flex-shrink-0",
            size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2",
            severity === "CRITICAL" ? "bg-red-400 animate-pulse" : "bg-current"
          )}
        />
      )}
      {meta.label}
    </span>
  );
}
