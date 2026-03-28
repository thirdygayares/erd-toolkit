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
    onSuccess: async () => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.auth.session(),
      });
      setStoredCsrfToken(null);
      queryClient.setQueryData(queryKeys.auth.session(), undefined);
      queryClient.removeQueries({
        predicate: (query) => query.queryKey[0] !== "Auth",
      });
    },
  });
}
