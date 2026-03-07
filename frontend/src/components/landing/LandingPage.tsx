"use client";

import { Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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
import { OAuthButtonGroup } from "../auth/OAuthButtonGroup";
import { ProjectBootstrap } from "../project/ProjectBootstrap";
import { CtaSection } from "./CtaSection";
import { FeaturesSection } from "./FeaturesSection";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { HeroSection } from "./HeroSection";
import { UseCasesSection } from "./UseCasesSection";
import { WhySection } from "./WhySection";
import { WorkflowSection } from "./WorkflowSection";

type BootstrapChoice = "guest" | "personal" | null;

export function LandingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasSessionCookie = Boolean(getBrowserCookie("erd_csrf_token"));
  const sessionQuery = useAuthSessionQuery(hasSessionCookie);
  const refreshSessionMutation = useRefreshSessionMutation();
  const logoutMutation = useLogoutMutation();
  const [bootstrapChoice, setBootstrapChoice] = useState<BootstrapChoice>(null);
  const [refreshAttempted, setRefreshAttempted] = useState(false);
  const [showAuthCard, setShowAuthCard] = useState(false);

  const storedContext = useMemo(() => getStoredProjectContext(), []);
  const shareSlug = searchParams.get("share");

  useEffect(() => {
    if (!shareSlug) {
      return;
    }
    router.replace(`/share/${shareSlug}`);
  }, [router, shareSlug]);

  useEffect(() => {
    if (!hasSessionCookie || !sessionQuery.isError || refreshAttempted) {
      return;
    }
    setRefreshAttempted(true);
    refreshSessionMutation
      .mutateAsync()
      .then(() => sessionQuery.refetch())
      .catch(() => undefined);
  }, [
    hasSessionCookie,
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

  const handleGuestClick = () => {
    if (isAuthenticated) {
      setBootstrapChoice("guest");
    } else {
      setBootstrapChoice("guest");
    }
  };

  const handleWorkspaceClick = () => {
    if (isAuthenticated) {
      setBootstrapChoice("personal");
    } else {
      setShowAuthCard(true);
      setTimeout(() => {
        document
          .getElementById("auth-section")
          ?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Header
        isAuthenticated={isAuthenticated}
        onGuestClick={handleGuestClick}
        onWorkspaceClick={handleWorkspaceClick}
      />

      <HeroSection
        onGuestClick={handleGuestClick}
        onWorkspaceClick={handleWorkspaceClick}
      />

      <WhySection />
      <FeaturesSection />
      <WorkflowSection />
      <UseCasesSection />
      <CtaSection
        onGuestClick={handleGuestClick}
        onWorkspaceClick={handleWorkspaceClick}
      />

      {showAuthCard && (
        <section className="bg-white px-4 py-16 sm:px-6" id="auth-section">
          <div className="mx-auto max-w-md">
            <Card className="border-border/60 bg-white/95">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle>
                      {isAuthenticated ? "Signed in" : "Create your workspace"}
                    </CardTitle>
                    <CardDescription>
                      {isAuthenticated
                        ? `Authenticated as ${user?.email}`
                        : "Sign in to create a private workspace with full features."}
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
        </section>
      )}

      <Footer />
    </div>
  );
}
