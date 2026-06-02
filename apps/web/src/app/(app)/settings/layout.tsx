"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { Settings, Users, Bell, Key } from "lucide-react";

const SETTINGS_TABS = [
  { href: "/settings", icon: Settings, label: "Workspace" },
  { href: "/settings/team", icon: Users, label: "Team" },
  { href: "/settings/notifications", icon: Bell, label: "Notifications" },
  { href: "/settings/api-keys", icon: Key, label: "API Keys" },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="max-w-[1200px] mx-auto space-y-6">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Left Side Navigation */}
        <aside className="w-full md:w-60 flex-shrink-0 flex md:flex-col gap-1 bg-card p-2 rounded-xl border border-border h-fit">
          {SETTINGS_TABS.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all w-full",
                  active
                    ? "bg-primary/10 text-primary border-l-2 border-l-primary rounded-l-none"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </aside>

        {/* Settings Content */}
        <div className="flex-1 min-w-0">
          {children}
        </div>
      </div>
    </div>
  );
}
