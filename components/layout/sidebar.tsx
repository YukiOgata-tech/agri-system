"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Layers3,
  Sprout,
  ClipboardList,
  Thermometer,
  Bug,
  Package,
  Settings,
  LogOut,
  Home,
  Wheat,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/components/providers/auth-provider";
import { useAppSession } from "@/components/providers/app-session-provider";
import { useAgriApp } from "@/components/providers/agri-app-provider";
import { logOut } from "@/lib/auth";
import { useState } from "react";
import { CropSwitcher } from "./crop-switcher";
import { DevDataSourceSwitcher } from "./dev-data-source-switcher";
import { getCropPricingSummary } from "@/lib/agri-mock-data";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const navItems = [
  { href: "/dashboard", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/cultivation-cycles", label: "作付設定", icon: Layers3 },
  { href: "/harvest", label: "収穫記録", icon: Wheat },
  { href: "/work-logs", label: "作業記録", icon: ClipboardList },
  { href: "/environment", label: "環境記録", icon: Thermometer },
  { href: "/diseases", label: "病気・害虫記録", icon: Bug },
  { href: "/shipments", label: "出荷記録", icon: Package },
  { href: "/greenhouses", label: "生産エリア管理", icon: Home },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const {
    memberships,
    activeOrganizationId,
    activeOrganizationName,
    activeRole,
    setActiveOrganization,
  } = useAppSession();
  const { selectedCrop } = useAgriApp();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logOut();
  };

  const initials = user?.displayName
    ? user.displayName.slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() ?? "?";

  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-card">
      <div className="flex h-16 items-center gap-3 border-b border-border px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Sprout className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground">Agri System</p>
          <p className="text-xs text-muted-foreground">農業運用コンソール</p>
        </div>
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        <div className="mb-4 px-1">
          <CropSwitcher compact />
        </div>
        <div className="mb-4">
          <DevDataSourceSwitcher />
        </div>
        <div className="mb-4 rounded-lg border border-border bg-muted/40 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            所属組織
          </p>
          {memberships.length > 1 ? (
            <div className="mt-2">
              <Select
                value={activeOrganizationId ?? undefined}
                onValueChange={(value) => void setActiveOrganization(value)}
              >
                <SelectTrigger className="h-9 bg-background text-left">
                  <SelectValue placeholder="組織を選択" />
                </SelectTrigger>
                <SelectContent>
                  {memberships.map((membership) => (
                    <SelectItem key={membership.organizationId} value={membership.organizationId}>
                      {membership.organizationName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <p className="mt-2 text-sm font-semibold text-foreground">
              {activeOrganizationName ?? "未所属"}
            </p>
          )}
          <p className="mt-1 text-sm text-muted-foreground">
            権限: {activeRole === "owner" ? "オーナー" : activeRole === "manager" ? "管理者" : activeRole === "worker" ? "作業者" : "-"}
          </p>
        </div>
        <div className="mb-4 rounded-lg border border-border bg-muted/40 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            表示対象
          </p>
          <p className="mt-2 text-sm font-semibold text-foreground">{selectedCrop?.name ?? "全作物"}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {selectedCrop
              ? getCropPricingSummary(selectedCrop)
              : "圃場横断で全体を表示"}
          </p>
        </div>
        <nav className="flex flex-col gap-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      <div className="border-t border-border px-3 py-3">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            pathname === "/settings"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
        >
          <Settings className="h-4 w-4" />
          設定
        </Link>
      </div>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.photoURL ?? ""} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user?.displayName ?? user?.email ?? "-"}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email ?? ""}</p>
          </div>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:text-destructive"
            title="ログアウト"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
