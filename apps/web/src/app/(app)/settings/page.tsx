"use client";
import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth";
import { Copy, Check, Save } from "lucide-react";
import toast from "react-hot-toast";

export default function WorkspaceSettingsPage() {
  const workspace = useAuthStore((s) => s.workspace) ?? {
    id: "ws-001",
    name: "Acme Corp Production",
    slug: "acme-corp-prod",
    ownerId: "user-001",
    createdAt: new Date().toISOString(),
  };

  const [wsName, setWsName] = useState(workspace.name);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleCopyId = () => {
    navigator.clipboard.writeText(workspace.id);
    setCopied(true);
    toast.success("Workspace ID copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success("Workspace settings updated successfully");
    }, 800);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workspace Settings"
        description="Configure your workspace details and defaults."
      />

      <div className="grid gap-6">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">General Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground uppercase font-semibold">Workspace Name</label>
              <Input
                value={wsName}
                onChange={(e) => setWsName(e.target.value)}
                placeholder="Enter workspace name"
                className="max-w-md bg-surface"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground uppercase font-semibold">Workspace ID</label>
              <div className="flex gap-2 max-w-md">
                <Input
                  value={workspace.id}
                  readOnly
                  className="bg-muted font-mono text-xs select-all text-muted-foreground"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyId}
                  title="Copy Workspace ID"
                  className="flex-shrink-0"
                >
                  {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="pt-2">
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Anomaly & Retention Defaults</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground uppercase font-semibold">Data Retention (Days)</label>
                <select className="flex h-9 w-full rounded-md border border-input bg-surface px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                  <option value="30">30 Days</option>
                  <option value="90">90 Days</option>
                  <option value="180">180 Days</option>
                  <option value="365">1 Year</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground uppercase font-semibold">Metric Collection Interval</label>
                <select className="flex h-9 w-full rounded-md border border-input bg-surface px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                  <option value="10">10 seconds</option>
                  <option value="30">30 seconds (Default)</option>
                  <option value="60">60 seconds</option>
                </select>
              </div>
            </div>

            <div className="space-y-2 max-w-2xl">
              <label className="text-xs text-muted-foreground uppercase font-semibold">Min Anomaly Threshold Score</label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0.5"
                  max="0.99"
                  step="0.05"
                  defaultValue="0.80"
                  className="flex-1 accent-primary bg-muted rounded-lg h-2 cursor-pointer"
                />
                <span className="font-mono text-sm px-2.5 py-1 bg-muted rounded-md border border-border">0.80</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Any anomalous score below this threshold will not trigger notifications or create incident records.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
