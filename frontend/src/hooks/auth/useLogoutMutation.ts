"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { setStoredCsrfToken } from "@/lib/authStorage";
import { queryKeys } from "@/lib/queryKeys";
import { AuthService } from "@/services/authService";

const authService = new AuthService();

export function useLogoutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      setStoredCsrfToken(null);
      queryClient.removeQueries({ queryKey: queryKeys.auth.session() });
    },
  });
}
