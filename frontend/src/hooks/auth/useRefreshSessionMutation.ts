"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/queryKeys";
import { AuthService } from "@/services/authService";

const authService = new AuthService();

export function useRefreshSessionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authService.refreshSession(),
    onSuccess: (session) => {
      queryClient.setQueryData(queryKeys.auth.session(), {
        user: session.user,
      });
    },
  });
}
