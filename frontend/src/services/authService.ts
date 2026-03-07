import { axiosInstance } from "@/lib/axiosInstance";
import type {
  AuthSessionResponse,
  AuthStatusResponse,
  EmailLoginRequest,
  EmailRegisterRequest,
  GuestClaimRequest,
  GuestClaimResponse,
  OAuthStartRequest,
  OAuthStartResponse,
} from "@/lib/types";

export class AuthService {
  async registerEmail(
    payload: EmailRegisterRequest,
  ): Promise<AuthSessionResponse> {
    const { data } = await axiosInstance.post<AuthSessionResponse>(
      "/auth/email/register",
      payload,
    );
    return data;
  }

  async loginEmail(payload: EmailLoginRequest): Promise<AuthSessionResponse> {
    const { data } = await axiosInstance.post<AuthSessionResponse>(
      "/auth/email/login",
      payload,
    );
    return data;
  }

  async getSession(): Promise<AuthStatusResponse> {
    const { data } =
      await axiosInstance.get<AuthStatusResponse>("/auth/session");
    return data;
  }

  async refreshSession(): Promise<AuthSessionResponse> {
    const { data } =
      await axiosInstance.post<AuthSessionResponse>("/auth/refresh");
    return data;
  }

  async logout(): Promise<void> {
    await axiosInstance.post("/auth/logout");
  }

  async startOAuth(
    provider: "google" | "github",
    payload: OAuthStartRequest,
  ): Promise<OAuthStartResponse> {
    const { data } = await axiosInstance.post<OAuthStartResponse>(
      `/auth/oauth/${provider}/start`,
      payload,
    );
    return data;
  }

  async claimGuestWorkspace(
    payload: GuestClaimRequest,
  ): Promise<GuestClaimResponse> {
    const { data } = await axiosInstance.post<GuestClaimResponse>(
      "/auth/claim-guest",
      payload,
    );
    return data;
  }
}
