"use client";

import { useQuery } from "@tanstack/react-query";

import { setStoredCsrfToken } from "@/lib/authStorage";
import { queryKeys } from "@/lib/queryKeys";
import { AuthService } from "@/services/authService";

const authService = new AuthService();

export function useAuthSessionQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.auth.session(),
    queryFn: async () => {
      const response = await authService.getSession();
      setStoredCsrfToken(response.csrf_token ?? null);
      return response;
    },
    enabled,
    retry: false,
  });
}
