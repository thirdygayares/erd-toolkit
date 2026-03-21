"use client";

import { useMutation } from "@tanstack/react-query";

import type { ExportDictionaryRequest } from "@/lib/types";
import { ExportService } from "@/services/exportService";

const ExportServiceInstance = new ExportService();

interface ExportDictionaryInput {
  diagramId: string;
  payload: ExportDictionaryRequest;
}

export function useExportDictionaryMutation() {
  return useMutation({
    mutationFn: ({ diagramId, payload }: ExportDictionaryInput) =>
      ExportServiceInstance.exportDictionary(diagramId, payload),
  });
}
