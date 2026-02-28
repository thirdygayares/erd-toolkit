"use client";

import { useMutation } from "@tanstack/react-query";

import type { ExportSqlRequest } from "@/lib/types";
import { ExportService } from "@/services/exportService";

const ExportServiceInstance = new ExportService();

interface ExportSqlInput {
  diagramId: string;
  payload: ExportSqlRequest;
}

export function useExportSqlMutation() {
  return useMutation({
    mutationFn: ({ diagramId, payload }: ExportSqlInput) =>
      ExportServiceInstance.exportSql(diagramId, payload),
  });
}
