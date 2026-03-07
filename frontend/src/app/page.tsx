import { Suspense } from "react";

import { AuthLanding } from "@/components/auth/AuthLanding";

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <AuthLanding />
    </Suspense>
  );
}
