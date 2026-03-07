import { axiosInstance } from "@/lib/axiosInstance";
import type {
  WorkspaceCreateRequest,
  WorkspaceEnsureDefaultResponse,
  WorkspaceListResponse,
  WorkspaceResponse,
} from "@/lib/types";

export class WorkspaceService {
  async createWorkspace(
    payload: WorkspaceCreateRequest,
  ): Promise<WorkspaceResponse> {
    const { data } = await axiosInstance.post<WorkspaceResponse>(
      "/workspaces",
      payload,
    );
    return data;
  }

  async listWorkspaces(): Promise<WorkspaceListResponse[]> {
    const { data } =
      await axiosInstance.get<WorkspaceListResponse[]>("/workspaces");
    return data;
  }

  async ensureDefaultWorkspace(): Promise<WorkspaceEnsureDefaultResponse> {
    const { data } = await axiosInstance.post<WorkspaceEnsureDefaultResponse>(
      "/workspaces/ensure-default",
    );
    return data;
  }
}
