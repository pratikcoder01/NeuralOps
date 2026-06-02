"use client";
import { useState } from "react";
import { Bell, ChevronDown, LogOut, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { useLogout } from "@/lib/hooks/useAuth";
import { cn } from "@/lib/utils/cn";

export function Topbar() {
  const { user, workspace } = useAuthStore();
  const { mutate: logout } = useLogout();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between h-14 px-4 border-b border-border bg-background/80 backdrop-blur-md">
      {/* Workspace name */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">
          {workspace?.name ?? "NeuralOps"}
        </span>
        <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-mono">
          {workspace?.plan ?? "STARTER"}
        </span>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <Bell className="h-4 w-4" />
            {/* Unread dot */}
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-400" />
          </button>
          {notifOpen && (
            <div className="absolute right-0 mt-1 w-72 rounded-xl border border-border bg-card shadow-xl p-4 z-50">
              <p className="text-xs font-semibold text-muted-foreground mb-3">NOTIFICATIONS</p>
              <div className="space-y-2">
                {[
                  { text: "Critical incident detected on k8s-node-primary-01", time: "2m ago", dot: "bg-red-400" },
                  { text: "Remediation approved for inc-002", time: "15m ago", dot: "bg-green-400" },
                  { text: "Model v2.4 deployed to production", time: "1h ago", dot: "bg-blue-400" },
                ].map((n, i) => (
                  <div key={i} className="flex items-start gap-2 py-1.5">
                    <span className={cn("mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0", n.dot)} />
                    <div>
                      <p className="text-xs text-foreground leading-snug">{n.text}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{n.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/50 transition-colors"
          >
            <div className="h-6 w-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
              <span className="text-xs font-bold text-primary">
                {user?.name?.[0]?.toUpperCase() ?? "U"}
              </span>
            </div>
            <span className="text-sm font-medium hidden sm:block">{user?.name ?? "User"}</span>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-1 w-48 rounded-xl border border-border bg-card shadow-xl py-1 z-50">
              <div className="px-3 py-2 border-b border-border">
                <p className="text-xs font-medium">{user?.name}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <button
                onClick={() => { setMenuOpen(false); router.push("/settings"); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                <Settings className="h-4 w-4" /> Settings
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
