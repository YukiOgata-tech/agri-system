"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppSession } from "@/components/providers/app-session-provider";

export default function RootPage() {
  const { authUser, loading, needsOnboarding } = useAppSession();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      router.replace(authUser ? (needsOnboarding ? "/onboarding" : "/dashboard") : "/login");
    }
  }, [authUser, loading, needsOnboarding, router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}
