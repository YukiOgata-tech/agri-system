import { Suspense } from "react";
import { OnboardingPageClient } from "./onboarding-page-client";

function OnboardingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<OnboardingFallback />}>
      <OnboardingPageClient />
    </Suspense>
  );
}
