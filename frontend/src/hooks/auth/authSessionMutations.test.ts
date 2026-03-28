import { beforeEach, describe, expect, it, vi } from "vitest";

const { useMutationMock, queryClient, setStoredCsrfTokenMock, queryKeysMock } =
  vi.hoisted(() => ({
    useMutationMock: vi.fn((options) => options),
    queryClient: {
      cancelQueries: vi.fn(),
      setQueryData: vi.fn(),
      removeQueries: vi.fn(),
      invalidateQueries: vi.fn(),
    },
    setStoredCsrfTokenMock: vi.fn(),
    queryKeysMock: {
      auth: {
        session: () => ["Auth", "Session"] as const,
      },
    },
  }));

vi.mock("@tanstack/react-query", () => ({
  useMutation: useMutationMock,
  useQueryClient: () => queryClient,
}));

vi.mock("@/lib/authStorage", () => ({
  setStoredCsrfToken: setStoredCsrfTokenMock,
}));

vi.mock("@/lib/queryKeys", () => ({
  queryKeys: queryKeysMock,
}));

vi.mock("@/services/authService", () => ({
  AuthService: vi.fn().mockImplementation(() => ({
    logout: vi.fn(),
    refreshSession: vi.fn(),
  })),
}));

import { useLogoutMutation } from "./useLogoutMutation";
import { useRefreshSessionMutation } from "./useRefreshSessionMutation";

describe("auth session mutations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.cancelQueries.mockResolvedValue(undefined);
  });

  it("clears the active auth session immediately on logout", async () => {
    const mutation = useLogoutMutation();

    await mutation.onSuccess?.(undefined, undefined, undefined);

    expect(queryClient.cancelQueries).toHaveBeenCalledWith({
      queryKey: queryKeysMock.auth.session(),
    });
    expect(setStoredCsrfTokenMock).toHaveBeenCalledWith(null);
    expect(queryClient.setQueryData).toHaveBeenCalledWith(
      queryKeysMock.auth.session(),
      undefined,
    );

    const removePredicate = queryClient.removeQueries.mock.calls[0]?.[0]
      ?.predicate as (query: { queryKey: readonly string[] }) => boolean;
    expect(removePredicate({ queryKey: ["Auth", "Session"] })).toBe(false);
    expect(removePredicate({ queryKey: ["Project", "ById", "123"] })).toBe(
      true,
    );
  });

  it("invalidates protected queries after a successful refresh", () => {
    const mutation = useRefreshSessionMutation();
    const session = {
      user: {
        user_id: "user-1",
        email: "demo@example.com",
        display_name: "Demo",
        status: "active",
        primary_auth_provider: "email" as const,
        email_verified_at: null,
        last_login_at: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
      session_id: "session-1",
      access_token_expires_at: "2026-01-01T00:15:00Z",
      refresh_token_expires_at: "2027-01-01T00:00:00Z",
      csrf_token: "csrf-token",
    };

    mutation.onSuccess?.(session, undefined, undefined);

    expect(setStoredCsrfTokenMock).toHaveBeenCalledWith("csrf-token");
    expect(queryClient.setQueryData).toHaveBeenCalledWith(
      queryKeysMock.auth.session(),
      {
        user: session.user,
        csrf_token: "csrf-token",
      },
    );

    const invalidatePredicate = queryClient.invalidateQueries.mock.calls[0]?.[0]
      ?.predicate as (query: { queryKey: readonly string[] }) => boolean;
    expect(invalidatePredicate({ queryKey: ["Auth", "Session"] })).toBe(false);
    expect(invalidatePredicate({ queryKey: ["Workspace", "List"] })).toBe(true);
  });
});
