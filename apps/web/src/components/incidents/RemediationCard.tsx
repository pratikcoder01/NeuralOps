"use client";
import { useState } from "react";
import { CheckCircle, XCircle, Clock, AlertCircle, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useApproveRemediation, useRejectRemediation } from "@/lib/hooks/useIncidents";
import { formatDateTime, formatDuration } from "@/lib/utils/format";
import { actionStatusColor } from "@/lib/utils/severity";
import { cn } from "@/lib/utils/cn";
import type { RemediationAction } from "@/types";
import toast from "react-hot-toast";

interface RemediationCardProps {
  action: RemediationAction;
}

const STATUS_ICONS = {
  PENDING: Clock,
  PENDING_APPROVAL: AlertCircle,
  APPROVED: CheckCircle,
  RUNNING: Loader2,
  SUCCESS: CheckCircle,
  FAILED: XCircle,
  REJECTED: XCircle,
};

export function RemediationCard({ action }: RemediationCardProps) {
  const [logExpanded, setLogExpanded] = useState(false);
  const [confirmApprove, setConfirmApprove] = useState(false);
  const [confirmReject, setConfirmReject] = useState(false);

  const { mutate: approve, isPending: approving } = useApproveRemediation();
  const { mutate: reject, isPending: rejecting } = useRejectRemediation();

  const StatusIcon = STATUS_ICONS[action.status] ?? Clock;

  const handleApprove = () => {
    approve(action.id, {
      onSuccess: () => { toast.success("Remediation approved"); setConfirmApprove(false); },
      onError: () => { toast.error("Failed to approve"); setConfirmApprove(false); },
    });
  };

  const handleReject = () => {
    reject(action.id, {
      onSuccess: () => { toast.success("Remediation rejected"); setConfirmReject(false); },
      onError: () => { toast.error("Failed to reject"); setConfirmReject(false); },
    });
  };

  return (
    <div className={cn(
      "rounded-xl border bg-card",
      action.status === "PENDING_APPROVAL" ? "border-yellow-500/30 glow-medium" : "border-border"
    )}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
        <div className={cn(
          "h-8 w-8 rounded-lg flex items-center justify-center",
          action.status === "SUCCESS" ? "bg-green-500/10" :
          action.status === "FAILED" ? "bg-red-500/10" :
          action.status === "PENDING_APPROVAL" ? "bg-yellow-500/10" :
          "bg-blue-500/10"
        )}>
          <StatusIcon
            className={cn(
              "h-4 w-4",
              actionStatusColor(action.status),
              action.status === "RUNNING" && "animate-spin"
            )}
          />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm">{action.actionType.replace(/_/g, " ")}</p>
          <p className={cn("text-xs font-mono font-semibold", actionStatusColor(action.status))}>
            {action.status}
            {action.durationSeconds !== undefined && ` · ${formatDuration(action.durationSeconds)}`}
          </p>
        </div>
        {action.executedAt && (
          <span className="text-xs text-muted-foreground">{formatDateTime(action.executedAt)}</span>
        )}
      </div>

      {/* Action params */}
      <div className="px-5 py-4">
        <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide font-semibold">Parameters</p>
        <div className="rounded-lg bg-background border border-border p-3 font-mono text-xs text-muted-foreground">
          <pre className="whitespace-pre-wrap">{JSON.stringify(action.actionParams, null, 2)}</pre>
        </div>
      </div>

      {/* Pending approval CTA */}
      {action.status === "PENDING_APPROVAL" && (
        <div className="px-5 pb-4">
          <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4 mb-4">
            <p className="text-sm font-medium text-yellow-400 mb-1">⚠ Approval Required</p>
            <p className="text-xs text-muted-foreground">
              This remediation action requires explicit approval before execution.
              Review the parameters above before proceeding.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              className="flex-1"
              variant="success"
              onClick={() => setConfirmApprove(true)}
            >
              <CheckCircle className="h-4 w-4" /> Approve & Execute
            </Button>
            <Button
              variant="critical"
              onClick={() => setConfirmReject(true)}
            >
              <XCircle className="h-4 w-4" /> Reject
            </Button>
          </div>
        </div>
      )}

      {/* Execution log */}
      {action.resultLog && (
        <div className="px-5 pb-4 border-t border-border pt-4">
          <button
            onClick={() => setLogExpanded(!logExpanded)}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground mb-2"
          >
            {logExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            Execution Log
          </button>
          {logExpanded && (
            <div className="rounded-lg bg-black border border-border p-3 max-h-48 overflow-auto">
              <pre className="terminal-text text-green-400 whitespace-pre-wrap">{action.resultLog}</pre>
            </div>
          )}
        </div>
      )}

      {/* Confirm dialogs */}
      <ConfirmDialog
        isOpen={confirmApprove}
        title="Approve remediation?"
        description={`This will execute: ${action.actionType.replace(/_/g, " ")}. This action cannot be undone.`}
        confirmLabel="Approve & Execute"
        variant="default"
        isLoading={approving}
        onConfirm={handleApprove}
        onCancel={() => setConfirmApprove(false)}
      />
      <ConfirmDialog
        isOpen={confirmReject}
        title="Reject remediation?"
        description="The remediation action will be cancelled."
        confirmLabel="Reject"
        variant="destructive"
        isLoading={rejecting}
        onConfirm={handleReject}
        onCancel={() => setConfirmReject(false)}
      />
    </div>
  );
}
