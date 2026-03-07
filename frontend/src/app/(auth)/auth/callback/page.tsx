import { Suspense } from "react";

import { AuthCallbackHandler } from "@/components/auth/AuthCallbackHandler";

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <AuthCallbackHandler />
    </Suspense>
  );
}
