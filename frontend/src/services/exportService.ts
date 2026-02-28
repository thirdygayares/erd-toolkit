import { axiosInstance } from "@/lib/axiosInstance";
import type { ExportSqlRequest, ExportSqlResponse } from "@/lib/types";

export class ExportService {
  async exportSql(
    diagramId: string,
    payload: ExportSqlRequest,
  ): Promise<ExportSqlResponse> {
    const { data } = await axiosInstance.post<ExportSqlResponse>(
      `/diagrams/${diagramId}/export/sql`,
      payload,
    );
    return data;
  }
}
