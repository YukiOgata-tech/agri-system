"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileHeader } from "@/components/layout/mobile-header";
import { AgriAppProvider } from "@/components/providers/agri-app-provider";
import { useAppSession } from "@/components/providers/app-session-provider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { authUser, loading, needsOnboarding } = useAppSession();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!authUser) {
        router.replace("/login");
        return;
      }
      if (needsOnboarding) {
        router.replace("/onboarding");
      }
    }
  }, [authUser, loading, needsOnboarding, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!authUser || needsOnboarding) return null;

  return (
    <AgriAppProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <div className="hidden lg:flex lg:flex-shrink-0">
          <Sidebar />
        </div>
        <div className="flex flex-1 flex-col overflow-hidden">
          <MobileHeader />
          <main className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
            {children}
          </main>
        </div>
      </div>
    </AgriAppProvider>
  );
}
