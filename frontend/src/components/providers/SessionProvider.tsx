"use client";

import axios from "axios";
import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuthSessionQuery } from "@/hooks/auth/useAuthSessionQuery";
import { useRefreshSessionMutation } from "@/hooks/auth/useRefreshSessionMutation";
import { getApiErrorMessage } from "@/lib/apiError";
import { getBrowserCookie, getStoredCsrfToken } from "@/lib/authStorage";

type SessionRecoveryReason = "missing-csrf-token" | "refresh-failed" | null;

interface SessionProviderValue {
  sessionQuery: ReturnType<typeof useAuthSessionQuery>;
  canAttemptRefresh: boolean;
  isSessionRecoveryPending: boolean;
  isSessionUnauthorized: boolean;
  recoveryReason: SessionRecoveryReason;
  recoveryMessage: string | null;
}

const SessionContext = createContext<SessionProviderValue | null>(null);

function isUnauthorizedError(error: unknown) {
  return axios.isAxiosError(error) && error.response?.status === 401;
}

interface SessionProviderProps {
  children: ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {
  const sessionQuery = useAuthSessionQuery();
  const refreshSessionMutation = useRefreshSessionMutation();
  const [refreshAttempted, setRefreshAttempted] = useState(false);
  const [recoveryReason, setRecoveryReason] =
    useState<SessionRecoveryReason>(null);
  const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null);

  const canAttemptRefresh = Boolean(
    getBrowserCookie("erd_csrf_token") ?? getStoredCsrfToken(),
  );
  const isSessionUnauthorized =
    sessionQuery.isError && isUnauthorizedError(sessionQuery.error);

  useEffect(() => {
    if (!sessionQuery.isSuccess) {
      return;
    }

    setRefreshAttempted(false);
    setRecoveryReason(null);
    setRecoveryMessage(null);
  }, [sessionQuery.isSuccess]);

  useEffect(() => {
    if (!isSessionUnauthorized || refreshAttempted) {
      return;
    }

    if (!canAttemptRefresh) {
      setRefreshAttempted(true);
      setRecoveryReason("missing-csrf-token");
      setRecoveryMessage(
        "Session refresh requires a CSRF token, but it was not available in this browser.",
      );
      return;
    }

    setRefreshAttempted(true);
    refreshSessionMutation
      .mutateAsync()
      .then(() => sessionQuery.refetch())
      .catch((error) => {
        setRecoveryReason("refresh-failed");
        setRecoveryMessage(
          getApiErrorMessage(error, "Unable to refresh your session."),
        );
      });
  }, [
    canAttemptRefresh,
    isSessionUnauthorized,
    refreshAttempted,
    refreshSessionMutation,
    sessionQuery,
  ]);

  const isSessionRecoveryPending =
    isSessionUnauthorized &&
    canAttemptRefresh &&
    (!refreshAttempted || refreshSessionMutation.isPending);

  const value = useMemo<SessionProviderValue>(
    () => ({
      sessionQuery,
      canAttemptRefresh,
      isSessionRecoveryPending,
      isSessionUnauthorized,
      recoveryReason,
      recoveryMessage,
    }),
    [
      sessionQuery,
      canAttemptRefresh,
      isSessionRecoveryPending,
      isSessionUnauthorized,
      recoveryReason,
      recoveryMessage,
    ],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSessionProvider() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSessionProvider must be used within SessionProvider");
  }
  return context;
}
