"use client";

import { Github, Loader2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useStartOAuthMutation } from "@/hooks/auth/useStartOAuthMutation";
import { getApiErrorMessage } from "@/lib/apiError";
import { getStoredProjectContext } from "@/lib/authStorage";

interface OAuthButtonGroupProps {
  redirectPath?: string;
}

export function OAuthButtonGroup({
  redirectPath = "/auth/callback",
}: OAuthButtonGroupProps) {
  const googleMutation = useStartOAuthMutation("google");
  const githubMutation = useStartOAuthMutation("github");
  const [errorMessage, setErrorMessage] = useState("");

  async function startOAuth(provider: "google" | "github") {
    const guestContext = getStoredProjectContext();
    const mutation = provider === "google" ? googleMutation : githubMutation;

    try {
      setErrorMessage("");
      const response = await mutation.mutateAsync({
        redirect_path: redirectPath,
        guest_workspace_id: guestContext.workspaceId,
        guest_project_id: guestContext.projectId,
      });
      window.location.href = response.authorization_url;
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(error, `Unable to start ${provider} sign-in.`),
      );
    }
  }

  const isPending = googleMutation.isPending || githubMutation.isPending;

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Button
          className="justify-center rounded-2xl"
          disabled={isPending}
          onClick={() => void startOAuth("google")}
          type="button"
          variant="outline"
        >
          {googleMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <span className="text-base font-semibold">G</span>
          )}
          Continue with Google
        </Button>
        <Button
          className="justify-center rounded-2xl"
          disabled={isPending}
          onClick={() => void startOAuth("github")}
          type="button"
          variant="outline"
        >
          {githubMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Github className="h-4 w-4" />
          )}
          Continue with GitHub
        </Button>
      </div>

      {errorMessage ? (
        <p className="text-sm text-rose-600">{errorMessage}</p>
      ) : null}
    </div>
  );
}
