import { axiosInstance } from "@/lib/axiosInstance";
import type {
  DiagramCreateRequest,
  DiagramDetailResponse,
  DiagramSummary,
  SnapshotCreateRequest,
  SnapshotResponse,
} from "@/lib/types";

export class DiagramService {
  async createDiagram(payload: DiagramCreateRequest): Promise<DiagramSummary> {
    const { data } = await axiosInstance.post<DiagramSummary>(
      "/diagrams",
      payload,
    );
    return data;
  }

  async listDiagramsByWorkspace(
    workspaceId: string,
  ): Promise<DiagramSummary[]> {
    const { data } = await axiosInstance.get<DiagramSummary[]>(
      `/workspaces/${workspaceId}/diagrams`,
    );
    return data;
  }

  async getDiagram(diagramId: string): Promise<DiagramDetailResponse> {
    const { data } = await axiosInstance.get<DiagramDetailResponse>(
      `/diagrams/${diagramId}`,
    );
    return data;
  }

  async createSnapshot(
    diagramId: string,
    payload: SnapshotCreateRequest,
  ): Promise<SnapshotResponse> {
    const { data } = await axiosInstance.post<SnapshotResponse>(
      `/diagrams/${diagramId}/snapshots`,
      payload,
    );
    return data;
  }
}
