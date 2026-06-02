"use client";
import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Mail, Trash2, ShieldAlert } from "lucide-react";
import toast from "react-hot-toast";

interface Member {
  id: string;
  name: string;
  email: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  status: "ACTIVE" | "PENDING";
}

const INITIAL_MEMBERS: Member[] = [
  { id: "mem-1", name: "Pratik Patel", email: "pratik@neuralops.io", role: "OWNER", status: "ACTIVE" },
  { id: "mem-2", name: "Sarah Connor", email: "sarah.connor@neuralops.io", role: "ADMIN", status: "ACTIVE" },
  { id: "mem-3", name: "John Doe", email: "john.doe@neuralops.io", role: "MEMBER", status: "ACTIVE" },
  { id: "mem-4", name: "Jane Smith", email: "jane.smith@neuralops.io", role: "MEMBER", status: "PENDING" },
];

export default function TeamSettingsPage() {
  const [members, setMembers] = useState<Member[]>(INITIAL_MEMBERS);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "MEMBER">("MEMBER");

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    // Simulate creation
    const newMember: Member = {
      id: `mem-${Date.now()}`,
      name: inviteEmail.split("@")[0],
      email: inviteEmail,
      role: inviteRole,
      status: "PENDING",
    };

    setMembers([...members, newMember]);
    setInviteEmail("");
    toast.success(`Invite sent to ${inviteEmail}`);
  };

  const handleRemove = (id: string) => {
    const member = members.find((m) => m.id === id);
    if (member?.role === "OWNER") {
      toast.error("The workspace owner cannot be removed");
      return;
    }
    setMembers(members.filter((m) => m.id !== id));
    toast.success("Team member removed successfully");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team Management"
        description="Invite and manage access permissions for your team members."
      />

      <div className="grid gap-6">
        {/* Invite Member Section */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Invite Team Member</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3 max-w-2xl">
              <div className="flex-1 relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="name@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="pl-9 bg-surface"
                  required
                />
              </div>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as "ADMIN" | "MEMBER")}
                className="flex h-9 rounded-md border border-input bg-surface px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="MEMBER">Member (Read/Write)</option>
                <option value="ADMIN">Admin (All Actions)</option>
              </select>
              <Button type="submit" className="gap-2 flex-shrink-0">
                <Plus className="h-4 w-4" /> Send Invite
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Members List Table */}
        <Card className="border-border bg-card overflow-hidden">
          <CardHeader className="border-b border-border bg-muted/10 py-4">
            <CardTitle className="text-sm font-semibold">Workspace Members ({members.length})</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/20 text-xs font-semibold text-muted-foreground uppercase">
                  <th className="px-5 py-3">Member</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-5 py-4 font-medium flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs uppercase">
                        {m.name.slice(0, 2)}
                      </div>
                      {m.name}
                    </td>
                    <td className="px-5 py-4 text-muted-foreground font-mono text-xs">{m.email}</td>
                    <td className="px-5 py-4">
                      <Badge
                        variant="outline"
                        className={
                          m.role === "OWNER"
                            ? "border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs"
                            : m.role === "ADMIN"
                            ? "border-violet-500/30 bg-violet-500/10 text-violet-400 text-xs"
                            : "border-muted bg-muted/30 text-muted-foreground text-xs"
                        }
                      >
                        {m.role}
                      </Badge>
                    </td>
                    <td className="px-5 py-4">
                      <Badge
                        variant="outline"
                        className={
                          m.status === "ACTIVE"
                            ? "border-green-500/30 bg-green-500/10 text-green-400 text-xs"
                            : "border-yellow-500/30 bg-yellow-500/10 text-yellow-400 text-xs"
                        }
                      >
                        {m.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {m.role !== "OWNER" ? (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleRemove(m.id)}
                          className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10 border-border hover:border-red-500/30"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : (
                        <ShieldAlert className="h-4 w-4 text-muted-foreground inline-block mr-2" />
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
