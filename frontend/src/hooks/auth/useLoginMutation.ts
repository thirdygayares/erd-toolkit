"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/queryKeys";
import type { EmailLoginRequest } from "@/lib/types";
import { AuthService } from "@/services/authService";

const authService = new AuthService();

export function useLoginMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: EmailLoginRequest) => authService.loginEmail(payload),
    onSuccess: (session) => {
      queryClient.setQueryData(queryKeys.auth.session(), {
        user: session.user,
      });
    },
  });
}
