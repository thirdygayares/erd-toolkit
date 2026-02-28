import { axiosInstance } from "@/lib/axiosInstance";
import type {
  ImportPostgresRequest,
  ImportPostgresResponse,
} from "@/lib/types";

export class IntrospectionService {
  async importPostgres(
    diagramId: string,
    payload: ImportPostgresRequest,
  ): Promise<ImportPostgresResponse> {
    const { data } = await axiosInstance.post<ImportPostgresResponse>(
      `/diagrams/${diagramId}/import/postgres`,
      payload,
    );
    return data;
  }
}
