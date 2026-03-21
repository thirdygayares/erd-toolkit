"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { setStoredCsrfToken } from "@/lib/authStorage";
import { queryKeys } from "@/lib/queryKeys";
import type { EmailRegisterRequest } from "@/lib/types";
import { AuthService } from "@/services/authService";

const authService = new AuthService();

export function useRegisterMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: EmailRegisterRequest) =>
      authService.registerEmail(payload),
    onSuccess: (session) => {
      setStoredCsrfToken(session.csrf_token ?? null);
      queryClient.setQueryData(queryKeys.auth.session(), {
        user: session.user,
        csrf_token: session.csrf_token ?? null,
      });
    },
  });
}
