"use client";
import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Key, Copy, Check, Trash2, Plus, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

interface APIKey {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsed: string;
  status: "ACTIVE" | "REVOKED";
}

const INITIAL_KEYS: APIKey[] = [
  { id: "key-1", name: "Production K8s Clusters", prefix: "nop_live_a1b2...", createdAt: "2026-05-10T12:00:00Z", lastUsed: "2026-06-02T11:58:00Z", status: "ACTIVE" },
  { id: "key-2", name: "Staging Daemonsets", prefix: "nop_live_f8e9...", createdAt: "2026-05-15T08:30:00Z", lastUsed: "2026-06-02T11:55:00Z", status: "ACTIVE" },
  { id: "key-3", name: "Local Development Sandbox", prefix: "nop_live_z5x4...", createdAt: "2026-05-20T14:45:00Z", lastUsed: "2026-05-25T10:12:00Z", status: "REVOKED" },
];

export default function APIKeysSettingsPage() {
  const [keys, setKeys] = useState<APIKey[]>(INITIAL_KEYS);
  const [newKeyName, setNewKeyName] = useState("");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    const rawToken = `nop_live_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`;
    const newKey: APIKey = {
      id: `key-${Date.now()}`,
      name: newKeyName,
      prefix: `${rawToken.slice(0, 12)}...`,
      createdAt: new Date().toISOString(),
      lastUsed: "NEVER",
      status: "ACTIVE",
    };

    setKeys([newKey, ...keys]);
    setGeneratedKey(rawToken);
    setNewKeyName("");
    toast.success("API key successfully generated!");
  };

  const handleCopyKey = () => {
    if (!generatedKey) return;
    navigator.clipboard.writeText(generatedKey);
    setCopied(true);
    toast.success("API Key copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRevoke = (id: string) => {
    setKeys(
      keys.map((k) => (k.id === id ? { ...k, status: "REVOKED" as const } : k))
    );
    toast.success("API key revoked");
  };

  const handleDelete = (id: string) => {
    setKeys(keys.filter((k) => k.id !== id));
    toast.success("API key deleted from record");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agent API Keys"
        description="Keys used by the NeuralOps agent to authenticate and push metric batches."
      />

      <div className="grid gap-6">
        {/* Generate Key Form */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Generate Agent API Key</CardTitle>
            <CardDescription className="text-xs">
              Give your key a descriptive name (e.g. cluster/environment identifier).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleGenerate} className="flex flex-col sm:flex-row gap-3 max-w-2xl">
              <div className="flex-1 relative">
                <Key className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="e.g. Production K8s Cluster"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="pl-9 bg-surface"
                  required
                />
              </div>
              <Button type="submit" className="gap-2 flex-shrink-0">
                <Plus className="h-4 w-4" /> Generate Key
              </Button>
            </form>

            {generatedKey && (
              <div className="p-4 border border-emerald-500/30 bg-emerald-500/5 rounded-xl space-y-3 max-w-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4" />
                    Copy this key now. It will not be shown again!
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setGeneratedKey(null)}
                    className="h-7 text-xs border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                  >
                    Dismiss
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={generatedKey}
                    readOnly
                    className="font-mono text-xs select-all bg-surface border-emerald-500/20 text-emerald-300"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyKey}
                    className="flex-shrink-0 border-emerald-500/20 hover:bg-emerald-500/10"
                  >
                    {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4 text-emerald-400" />}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Existing Keys Table */}
        <Card className="border-border bg-card overflow-hidden">
          <CardHeader className="border-b border-border bg-muted/10 py-4">
            <CardTitle className="text-sm font-semibold">Active & Revoked Keys ({keys.length})</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/20 text-xs font-semibold text-muted-foreground uppercase">
                  <th className="px-5 py-3">Key Name</th>
                  <th className="px-5 py-3">Prefix</th>
                  <th className="px-5 py-3">Created</th>
                  <th className="px-5 py-3">Last Used</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {keys.map((k) => (
                  <tr key={k.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-5 py-4 font-medium">{k.name}</td>
                    <td className="px-5 py-4 font-mono text-xs text-muted-foreground">{k.prefix}</td>
                    <td className="px-5 py-4 text-muted-foreground text-xs">
                      {new Date(k.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4 text-muted-foreground text-xs">
                      {k.lastUsed === "NEVER" ? (
                        <span className="text-muted-foreground italic font-sans">Never used</span>
                      ) : (
                        <span className="font-mono">{new Date(k.lastUsed).toLocaleDateString()}</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <Badge
                        variant="outline"
                        className={
                          k.status === "ACTIVE"
                            ? "border-green-500/30 bg-green-500/10 text-green-400 text-xs"
                            : "border-red-500/30 bg-red-500/10 text-red-400 text-xs"
                        }
                      >
                        {k.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-right space-x-1">
                      {k.status === "ACTIVE" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRevoke(k.id)}
                          className="h-8 text-xs text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10 border-border"
                        >
                          Revoke
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDelete(k.id)}
                          className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10 border-border hover:border-red-500/30"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
