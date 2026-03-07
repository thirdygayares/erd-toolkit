"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

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
      queryClient.setQueryData(queryKeys.auth.session(), {
        user: session.user,
      });
    },
  });
}
