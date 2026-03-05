import { axiosInstance } from "@/lib/axiosInstance";
import type {
  ImportPostgresRequest,
  ImportPostgresResponse,
  PostgresConnectionRequest,
  PostgresConnectionTestResponse,
  PostgresSchemaListResponse,
} from "@/lib/types";

export class IntrospectionService {
  async testPostgresConnection(
    diagramId: string,
    payload: PostgresConnectionRequest,
  ): Promise<PostgresConnectionTestResponse> {
    const { data } = await axiosInstance.post<PostgresConnectionTestResponse>(
      `/diagrams/${diagramId}/import/postgres/test`,
      payload,
    );
    return data;
  }

  async listPostgresSchemas(
    diagramId: string,
    payload: PostgresConnectionRequest,
  ): Promise<PostgresSchemaListResponse> {
    const { data } = await axiosInstance.post<PostgresSchemaListResponse>(
      `/diagrams/${diagramId}/import/postgres/schemas`,
      payload,
    );
    return data;
  }

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
