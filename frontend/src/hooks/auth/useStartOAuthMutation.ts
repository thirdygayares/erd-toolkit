"use client";

import { useMutation } from "@tanstack/react-query";

import type { OAuthStartRequest } from "@/lib/types";
import { AuthService } from "@/services/authService";

const authService = new AuthService();

export function useStartOAuthMutation(provider: "google" | "github") {
  return useMutation({
    mutationFn: (payload: OAuthStartRequest) =>
      authService.startOAuth(provider, payload),
  });
}
