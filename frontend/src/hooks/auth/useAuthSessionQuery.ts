"use client";

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/queryKeys";
import { AuthService } from "@/services/authService";

const authService = new AuthService();

export function useAuthSessionQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.auth.session(),
    queryFn: () => authService.getSession(),
    enabled,
    retry: false,
  });
}
