"use client";

import { useMutation } from "@tanstack/react-query";

import type { GuestClaimRequest } from "@/lib/types";
import { AuthService } from "@/services/authService";

const authService = new AuthService();

export function useClaimGuestMutation() {
  return useMutation({
    mutationFn: (payload: GuestClaimRequest) =>
      authService.claimGuestWorkspace(payload),
  });
}
