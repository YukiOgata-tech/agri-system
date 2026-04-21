"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
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
import { logOut } from "@/lib/auth";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/harvest", label: "収穫記録", icon: Wheat },
  { href: "/work-logs", label: "作業記録", icon: ClipboardList },
  { href: "/environment", label: "環境記録", icon: Thermometer },
  { href: "/diseases", label: "病害虫記録", icon: Bug },
  { href: "/shipments", label: "出荷記録", icon: Package },
  { href: "/greenhouses", label: "ハウス管理", icon: Home },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
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
      {/* ロゴ */}
      <div className="flex h-16 items-center gap-3 border-b border-border px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Sprout className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">FarmUp</p>
          <p className="text-xs text-muted-foreground">農業ナビ</p>
        </div>
      </div>

      {/* ナビゲーション */}
      <ScrollArea className="flex-1 px-3 py-4">
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

      {/* 設定 */}
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

      {/* ユーザー */}
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
            className="rounded-md p-1 text-muted-foreground hover:text-destructive transition-colors"
            title="ログアウト"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
