import { axiosInstance } from "@/lib/axiosInstance";
import type {
  ExportDictionaryRequest,
  ExportSqlRequest,
  ExportSqlResponse,
} from "@/lib/types";

interface ExportDictionaryDownload {
  blob: Blob;
  filename: string;
}

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

  async exportDictionary(
    diagramId: string,
    payload: ExportDictionaryRequest,
  ): Promise<ExportDictionaryDownload> {
    const response = await axiosInstance.post<Blob>(
      `/diagrams/${diagramId}/export/dictionary`,
      payload,
      {
        responseType: "blob",
      },
    );

    const contentDisposition = response.headers["content-disposition"] as
      | string
      | undefined;
    const filenameMatch =
      contentDisposition?.match(/filename="([^"]+)"/i) ??
      contentDisposition?.match(/filename=([^;]+)/i);
    const rawFilename = filenameMatch?.[1]?.trim() ?? "";
    const sanitizedFilename = rawFilename.replace(/^"|"$/g, "");
    const fallbackExtension = payload.file_type === "xlsx" ? "xlsx" : "csv";

    return {
      blob: response.data,
      filename:
        sanitizedFilename ||
        `erd_data_dictionary_download.${fallbackExtension}`,
    };
  }
}
