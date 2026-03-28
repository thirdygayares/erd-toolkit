"use client";

import { X } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface WorkspaceAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAuthenticated: boolean;
  userEmail: string | null;
  storedProjectId: string | null | undefined;
  isLoggingOut: boolean;
  oauthActions: ReactNode;
  onResumeProject: () => void;
  onGoToProjects: () => void;
  onGuestWorkspace: () => void;
  onLogout: () => void;
}

export function WorkspaceAccessDialog({
  open,
  onOpenChange,
  isAuthenticated,
  userEmail,
  storedProjectId,
  isLoggingOut,
  oauthActions,
  onResumeProject,
  onGoToProjects,
  onGuestWorkspace,
  onLogout,
}: WorkspaceAccessDialogProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [onOpenChange, open]);

  if (!open) {
    return null;
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
    >
      <button
        aria-label="Close workspace dialog"
        className="absolute inset-0 bg-slate-950/55"
        onClick={() => onOpenChange(false)}
        type="button"
      />
      <Card className="relative w-full max-w-[34rem] border-border/60 bg-white/95 shadow-2xl shadow-slate-900/10">
        <button
          aria-label="Close workspace dialog"
          className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          onClick={() => onOpenChange(false)}
          type="button"
        >
          <X className="h-4 w-4" />
        </button>

        <CardHeader>
          <div className="flex items-center justify-between gap-3 pr-10">
            <div>
              <CardTitle>
                {isAuthenticated ? "Signed in" : "Create your workspace"}
              </CardTitle>
              <CardDescription>
                {isAuthenticated
                  ? `Authenticated as ${userEmail}`
                  : "Sign in to create a private workspace with full features."}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {storedProjectId ? (
            <div className="rounded-[1.5rem] border border-border/70 bg-muted/40 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                Current local project
              </p>
              <p className="mt-2 text-sm text-foreground">
                Resume the project already stored in this browser.
              </p>
              <Button
                className="mt-4 w-full"
                onClick={onResumeProject}
                variant="secondary"
              >
                Resume Current Project
              </Button>
            </div>
          ) : null}

          {isAuthenticated ? (
            <div className="space-y-3">
              <Button className="w-full" onClick={onGoToProjects}>
                Go to My Projects
              </Button>
              <Button
                className="w-full"
                onClick={onGuestWorkspace}
                variant="outline"
              >
                Start Public Guest Workspace
              </Button>
              <Button
                className="w-full"
                disabled={isLoggingOut}
                onClick={onLogout}
                variant="ghost"
              >
                {isLoggingOut ? "Signing out..." : "Sign Out"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {oauthActions}

              <div className="grid gap-3 sm:grid-cols-2">
                <Link
                  className={cn(
                    buttonVariants({ variant: "secondary" }),
                    "w-full",
                  )}
                  href="/auth/login"
                  onClick={() => onOpenChange(false)}
                >
                  Continue with Email
                </Link>
                <Link
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "w-full",
                  )}
                  href="/auth/register"
                  onClick={() => onOpenChange(false)}
                >
                  Create Account
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
