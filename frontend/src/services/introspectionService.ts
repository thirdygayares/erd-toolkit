import { axiosInstance } from "@/lib/axiosInstance";
import type {
  ImportPostgresRequest,
  ImportPostgresResponse,
  ImportSqlRawRequest,
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

  async importSqlRaw(
    diagramId: string,
    payload: ImportSqlRawRequest,
  ): Promise<ImportPostgresResponse> {
    const { data } = await axiosInstance.post<ImportPostgresResponse>(
      `/diagrams/${diagramId}/import/sql/raw`,
      payload,
    );
    return data;
  }

  async importSqlFile(
    diagramId: string,
    file: File,
  ): Promise<ImportPostgresResponse> {
    const formData = new FormData();
    formData.append("file", file);

    const { data } = await axiosInstance.post<ImportPostgresResponse>(
      `/diagrams/${diagramId}/import/sql/file`,
      formData,
    );
    return data;
  }
}
