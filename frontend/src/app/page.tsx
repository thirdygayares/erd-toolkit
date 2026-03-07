import { Suspense } from "react";

import { LandingPage } from "@/components/landing/LandingPage";

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <LandingPage />
    </Suspense>
  );
}
