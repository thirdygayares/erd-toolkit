"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useSessionProvider } from "@/components/providers/SessionProvider";
import { useLogoutMutation } from "@/hooks/auth/useLogoutMutation";
import { getStoredProjectContext } from "@/lib/authStorage";
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
import { WorkspaceAccessDialog } from "./WorkspaceAccessDialog";

type BootstrapChoice = "guest" | "personal" | null;

export function LandingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    recoveryReason,
    recoveryMessage,
    sessionQuery,
    isSessionUnauthorized,
  } = useSessionProvider();
  const logoutMutation = useLogoutMutation();
  const [bootstrapChoice, setBootstrapChoice] = useState<BootstrapChoice>(null);
  const [showWorkspaceDialog, setShowWorkspaceDialog] = useState(false);

  const storedContext = useMemo(() => getStoredProjectContext(), []);
  const shareSlug = searchParams.get("share");

  useEffect(() => {
    if (!shareSlug) {
      return;
    }
    router.replace(`/share/${shareSlug}`);
  }, [router, shareSlug]);

  const user = sessionQuery.data?.user ?? null;
  const isAuthenticated = Boolean(user);
  const showSessionNotice =
    !isAuthenticated && (recoveryReason || isSessionUnauthorized);

  useEffect(() => {
    if (isAuthenticated) {
      setShowWorkspaceDialog(false);
    }
  }, [isAuthenticated]);

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

  const handleGuestClick = () => {
    setBootstrapChoice("guest");
  };

  const handleWorkspaceClick = () => {
    if (isAuthenticated) {
      router.push("/projects");
    } else {
      setShowWorkspaceDialog(true);
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
        isAuthenticated={isAuthenticated}
        onGuestClick={handleGuestClick}
        onWorkspaceClick={handleWorkspaceClick}
      />

      {showSessionNotice ? (
        <section className="mx-auto mt-6 w-full max-w-4xl px-4 sm:px-6">
          <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900">
            <p className="font-medium">Session expired</p>
            <p className="mt-1">
              {recoveryMessage ??
                "Sign in again to continue with your private workspace."}
            </p>
          </div>
        </section>
      ) : null}

      <WhySection />
      <FeaturesSection />
      <WorkflowSection />
      <UseCasesSection />
      <CtaSection
        isAuthenticated={isAuthenticated}
        onGuestClick={handleGuestClick}
        onWorkspaceClick={handleWorkspaceClick}
      />

      <WorkspaceAccessDialog
        isAuthenticated={isAuthenticated}
        isLoggingOut={logoutMutation.isPending}
        oauthActions={<OAuthButtonGroup />}
        onGoToProjects={() => router.push("/projects")}
        onGuestWorkspace={() => {
          setShowWorkspaceDialog(false);
          setBootstrapChoice("guest");
        }}
        onLogout={() => {
          logoutMutation
            .mutateAsync()
            .then(() => {
              if (typeof window !== "undefined") {
                window.location.replace("/");
                return;
              }
              router.push("/");
            })
            .catch(() => undefined);
        }}
        onOpenChange={setShowWorkspaceDialog}
        onResumeProject={() => {
          if (storedContext.projectId) {
            router.push(`/project/${storedContext.projectId}`);
          }
        }}
        open={showWorkspaceDialog}
        storedProjectId={storedContext.projectId}
        userEmail={user?.email ?? null}
      />

      <Footer />
    </div>
  );
}
