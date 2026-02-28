import { axiosInstance } from "@/lib/axiosInstance";
import type { WorkspaceCreateRequest, WorkspaceResponse } from "@/lib/types";

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
}
