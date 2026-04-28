"use client";

import { useState } from "react";
import { Menu, Sprout, X } from "lucide-react";
import { Sidebar } from "./sidebar";
import { useAgriApp } from "@/components/providers/agri-app-provider";
import { useAppSession } from "@/components/providers/app-session-provider";
import { CropSwitcher } from "./crop-switcher";
import { DevDataSourceSwitcher } from "./dev-data-source-switcher";

export function MobileHeader() {
  const [open, setOpen] = useState(false);
  const { selectedCrop } = useAgriApp();
  const { activeOrganizationName } = useAppSession();

  return (
    <>
      <header className="border-b border-border bg-card lg:hidden">
        <div className="flex h-16 items-center gap-4 px-4">
          <button
            onClick={() => setOpen(true)}
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
              <Sprout className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm">Agri System</p>
              <p className="truncate text-xs text-muted-foreground">
                {activeOrganizationName ?? "未所属"} / {selectedCrop?.name ?? "全作物"}
              </p>
            </div>
          </div>
        </div>
        <div className="border-t border-border px-4 py-3">
          <CropSwitcher compact />
          <div className="mt-3">
            <DevDataSourceSwitcher />
          </div>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="fixed left-0 top-0 h-full w-64 shadow-xl">
            <div className="absolute right-3 top-3 z-10">
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <Sidebar />
          </div>
        </div>
      )}
    </>
  );
}
