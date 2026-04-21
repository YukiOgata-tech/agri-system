"use client";

import { useState } from "react";
import { Menu, Sprout, X } from "lucide-react";
import { Sidebar } from "./sidebar";

export function MobileHeader() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="flex h-16 items-center gap-4 border-b border-border bg-card px-4 lg:hidden">
        <button onClick={() => setOpen(true)} className="rounded-md p-2 text-muted-foreground hover:bg-accent">
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
            <Sprout className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-sm">FarmUp</span>
        </div>
      </header>

      {/* モバイルドロワー */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="fixed left-0 top-0 h-full w-64 shadow-xl">
            <div className="absolute right-3 top-3 z-10">
              <button onClick={() => setOpen(false)} className="rounded-md p-1 text-muted-foreground hover:bg-accent">
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
