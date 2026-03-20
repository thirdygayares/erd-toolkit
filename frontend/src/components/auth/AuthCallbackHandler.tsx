"use client";

import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuthSessionQuery } from "@/hooks/auth/useAuthSessionQuery";
import { useClaimGuestMutation } from "@/hooks/auth/useClaimGuestMutation";
import { useRefreshSessionMutation } from "@/hooks/auth/useRefreshSessionMutation";
import { getApiErrorMessage } from "@/lib/apiError";
import {
  clearStoredProjectContext,
  getBrowserCookie,
  getStoredProjectContext,
} from "@/lib/authStorage";

import { GuestClaimDialog } from "./GuestClaimDialog";

export function AuthCallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const canReadCsrfCookie = Boolean(getBrowserCookie("erd_csrf_token"));
  const sessionQuery = useAuthSessionQuery();
  const refreshSessionMutation = useRefreshSessionMutation();
  const claimGuestMutation = useClaimGuestMutation();
  const [refreshAttempted, setRefreshAttempted] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  const storedContext = useMemo(() => getStoredProjectContext(), []);
  const provider = searchParams.get("provider") ?? "email";
  const loginError = searchParams.get("error");

  useEffect(() => {
    if (!canReadCsrfCookie || !sessionQuery.isError || refreshAttempted) {
      return;
    }

    setRefreshAttempted(true);
    refreshSessionMutation
      .mutateAsync()
      .then(() => sessionQuery.refetch())
      .catch(() => {
        return undefined;
      });
  }, [
    canReadCsrfCookie,
    refreshAttempted,
    refreshSessionMutation,
    sessionQuery,
  ]);

  useEffect(() => {
    if (!sessionQuery.data?.user || claimGuestMutation.isSuccess) {
      return;
    }

    if (storedContext.workspaceId) {
      return;
    }

    if (storedContext.projectId) {
      router.replace(`/project/${storedContext.projectId}`);
      return;
    }

    router.replace("/projects");
  }, [
    claimGuestMutation.isSuccess,
    router,
    sessionQuery.data?.user,
    storedContext.projectId,
    storedContext.workspaceId,
  ]);

  async function handleClaimWorkspace() {
    if (!storedContext.workspaceId) {
      router.replace("/projects");
      return;
    }

    try {
      setClaimError(null);
      await claimGuestMutation.mutateAsync({
        workspace_id: storedContext.workspaceId,
      });
      if (storedContext.projectId) {
        router.replace(`/project/${storedContext.projectId}`);
        return;
      }
      router.replace("/projects");
    } catch (error) {
      setClaimError(
        getApiErrorMessage(error, "Unable to claim guest workspace."),
      );
    }
  }

  function handleSkipClaim() {
    if (storedContext.projectId) {
      router.replace(`/project/${storedContext.projectId}`);
      return;
    }
    router.replace("/projects");
  }

  function handleReset() {
    clearStoredProjectContext();
    router.replace("/projects");
  }

  if (loginError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(244,63,94,0.16),_transparent_25%),linear-gradient(180deg,_#fff7ed_0%,_#f8fafc_100%)] px-4">
        <Card className="w-full max-w-xl">
          <CardHeader>
            <CardTitle>Authentication was not completed</CardTitle>
            <CardDescription>
              {provider} sign-in returned an error before the app session could
              be created.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button onClick={() => router.replace("/auth/login")}>
              Back to sign in
            </Button>
            <Button onClick={handleReset} variant="outline">
              Clear local session
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (sessionQuery.isLoading || refreshSessionMutation.isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.18),_transparent_25%),linear-gradient(180deg,_#fffaf3_0%,_#f8fafc_100%)] px-4">
        <Card className="w-full max-w-lg">
          <CardContent className="flex items-center gap-3 p-7">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Finalizing your authenticated session...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (sessionQuery.isError || !sessionQuery.data?.user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(244,63,94,0.16),_transparent_25%),linear-gradient(180deg,_#fff7ed_0%,_#f8fafc_100%)] px-4">
        <Card className="w-full max-w-xl">
          <CardHeader>
            <CardTitle>We could not restore your session</CardTitle>
            <CardDescription>
              The backend cookies were not available yet or the session expired
              during the redirect flow.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button onClick={() => router.replace("/auth/login")}>
              Back to sign in
            </Button>
            <Button onClick={handleReset} variant="outline">
              Clear local session
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (storedContext.workspaceId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.2),_transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(34,197,94,0.15),_transparent_22%),linear-gradient(180deg,_#fffaf3_0%,_#f8fafc_100%)] px-4 py-12">
        <GuestClaimDialog
          errorMessage={claimError}
          isPending={claimGuestMutation.isPending}
          onClaim={() => void handleClaimWorkspace()}
          onSkip={handleSkipClaim}
          workspaceId={storedContext.workspaceId}
        />
      </div>
    );
  }

  return null;
}
