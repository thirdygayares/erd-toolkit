"use client";

import { Database, LockKeyhole, Orbit, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuthSessionQuery } from "@/hooks/auth/useAuthSessionQuery";
import { useLogoutMutation } from "@/hooks/auth/useLogoutMutation";
import { useRefreshSessionMutation } from "@/hooks/auth/useRefreshSessionMutation";
import { getBrowserCookie, getStoredProjectContext } from "@/lib/authStorage";
import { cn } from "@/lib/utils";
import { ProjectBootstrap } from "../project/ProjectBootstrap";
import { OAuthButtonGroup } from "./OAuthButtonGroup";

type BootstrapChoice = "guest" | "personal" | null;

export function AuthLanding() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const canReadCsrfCookie = Boolean(getBrowserCookie("erd_csrf_token"));
  const sessionQuery = useAuthSessionQuery();
  const refreshSessionMutation = useRefreshSessionMutation();
  const logoutMutation = useLogoutMutation();
  const [bootstrapChoice, setBootstrapChoice] = useState<BootstrapChoice>(null);
  const [refreshAttempted, setRefreshAttempted] = useState(false);

  const storedContext = useMemo(() => getStoredProjectContext(), []);
  const shareSlug = searchParams.get("share");

  useEffect(() => {
    if (!shareSlug) {
      return;
    }

    router.replace(`/share/${shareSlug}`);
  }, [router, shareSlug]);

  useEffect(() => {
    if (!canReadCsrfCookie || !sessionQuery.isError || refreshAttempted) {
      return;
    }

    setRefreshAttempted(true);
    refreshSessionMutation
      .mutateAsync()
      .then(() => sessionQuery.refetch())
      .catch(() => undefined);
  }, [
    canReadCsrfCookie,
    refreshAttempted,
    refreshSessionMutation,
    sessionQuery,
  ]);

  if (bootstrapChoice === "guest") {
    return (
      <ProjectBootstrap projectVisibility="public" workspaceMode="guest" />
    );
  }

  if (bootstrapChoice === "personal") {
    return (
      <ProjectBootstrap projectVisibility="private" workspaceMode="personal" />
    );
  }

  const user = sessionQuery.data?.user ?? null;
  const isAuthenticated = Boolean(user);

  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.24),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.18),_transparent_25%),linear-gradient(180deg,_#fffaf3_0%,_#f8fafc_48%,_#ecfdf5_100%)] px-4 py-8 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl flex-col gap-8">
        <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <Card className="overflow-hidden border-white/70 bg-[linear-gradient(160deg,rgba(15,23,42,0.98),rgba(30,41,59,0.94))] text-white">
            <CardHeader className="space-y-6 p-8 sm:p-10">
              <Badge
                className="w-fit bg-white/10 text-amber-200"
                variant="outline"
              >
                Auth Workflow
              </Badge>
              <div className="space-y-4">
                <CardTitle className="max-w-3xl text-4xl font-semibold leading-tight text-white sm:text-5xl">
                  PostgreSQL-first authentication for guest and private ERD
                  work.
                </CardTitle>
                <CardDescription className="max-w-2xl text-base leading-7 text-slate-300">
                  Keep the fast guest entry, add email and OAuth sign-in, and
                  claim the workspace only when the user is ready to own it.
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="grid gap-4 p-8 pt-0 sm:grid-cols-3 sm:p-10 sm:pt-0">
              <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
                <Database className="h-5 w-5 text-amber-300" />
                <p className="mt-4 font-semibold text-white">
                  DB owns the logic
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Registration, login, session rotation, and guest claiming all
                  flow through Postgres functions.
                </p>
              </div>
              <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
                <Orbit className="h-5 w-5 text-sky-300" />
                <p className="mt-4 font-semibold text-white">OAuth ready</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Google and GitHub start flows are available now; provider app
                  credentials just need to be configured.
                </p>
              </div>
              <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5">
                <LockKeyhole className="h-5 w-5 text-emerald-300" />
                <p className="mt-4 font-semibold text-white">
                  Claimable guest work
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Users can keep sketching as guests, then attach that work to
                  their account after sign-in.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/70 bg-white/90">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>
                    {isAuthenticated ? "Signed in" : "Start your session"}
                  </CardTitle>
                  <CardDescription>
                    {isAuthenticated
                      ? `Authenticated as ${user?.email}`
                      : "Choose between guest mode, email sign-in, or OAuth."}
                  </CardDescription>
                </div>
                <Sparkles className="h-5 w-5 text-amber-500" />
              </div>
            </CardHeader>

            <CardContent className="space-y-5">
              {storedContext.projectId ? (
                <div className="rounded-[1.5rem] border border-border/70 bg-muted/40 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                    Current local project
                  </p>
                  <p className="mt-2 text-sm text-foreground">
                    Resume the project already stored in this browser.
                  </p>
                  <Button
                    className="mt-4 w-full"
                    onClick={() =>
                      router.push(`/project/${storedContext.projectId}`)
                    }
                    variant="secondary"
                  >
                    Resume Current Project
                  </Button>
                </div>
              ) : null}

              {isAuthenticated ? (
                <div className="space-y-3">
                  <Button
                    className="w-full"
                    onClick={() => setBootstrapChoice("personal")}
                  >
                    Create Private Workspace
                  </Button>
                  <Button
                    className="w-full"
                    onClick={() => setBootstrapChoice("guest")}
                    variant="outline"
                  >
                    Start Public Guest Workspace
                  </Button>
                  <Button
                    className="w-full"
                    disabled={logoutMutation.isPending}
                    onClick={() => {
                      logoutMutation
                        .mutateAsync()
                        .then(() => router.refresh())
                        .catch(() => undefined);
                    }}
                    variant="ghost"
                  >
                    {logoutMutation.isPending ? "Signing out..." : "Sign Out"}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Button
                    className="w-full"
                    onClick={() => setBootstrapChoice("guest")}
                  >
                    Continue as Guest
                  </Button>

                  <OAuthButtonGroup />

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Link
                      className={cn(
                        buttonVariants({ variant: "secondary" }),
                        "w-full",
                      )}
                      href="/auth/login"
                    >
                      Continue with Email
                    </Link>
                    <Link
                      className={cn(
                        buttonVariants({ variant: "outline" }),
                        "w-full",
                      )}
                      href="/auth/register"
                    >
                      Create Account
                    </Link>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
