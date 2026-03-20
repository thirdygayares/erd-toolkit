import { axiosInstance } from "@/lib/axiosInstance";
import type {
  ProjectCreateRequest,
  ProjectListResponse,
  ProjectResponse,
  ProjectVisibilityUpdateRequest,
} from "@/lib/types";

export class ProjectService {
  async createProject(payload: ProjectCreateRequest): Promise<ProjectResponse> {
    const { data } = await axiosInstance.post<ProjectResponse>(
      "/projects",
      payload,
    );
    return data;
  }

  async listProjects(): Promise<ProjectListResponse[]> {
    const { data } =
      await axiosInstance.get<ProjectListResponse[]>("/projects");
    return data;
  }

  async getProject(projectId: string): Promise<ProjectResponse> {
    const { data } = await axiosInstance.get<ProjectResponse>(
      `/projects/${projectId}`,
    );
    return data;
  }

  async getProjectByShareSlug(shareSlug: string): Promise<ProjectResponse> {
    const { data } = await axiosInstance.get<ProjectResponse>(
      `/share/${shareSlug}`,
    );
    return data;
  }

  async updateProjectVisibility(
    projectId: string,
    payload: ProjectVisibilityUpdateRequest,
  ): Promise<ProjectResponse> {
    const { data } = await axiosInstance.patch<ProjectResponse>(
      `/projects/${projectId}/visibility`,
      payload,
    );
    return data;
  }

  async duplicateProject(
    projectId: string,
    payload: { name: string },
  ): Promise<ProjectResponse> {
    const { data } = await axiosInstance.post<ProjectResponse>(
      `/projects/${projectId}/duplicate`,
      payload,
    );
    return data;
  }
}
