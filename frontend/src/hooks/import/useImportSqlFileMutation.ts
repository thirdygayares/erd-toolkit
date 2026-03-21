"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/queryKeys";
import { IntrospectionService } from "@/services/introspectionService";

const introspectionServiceInstance = new IntrospectionService();

interface ImportSqlFileInput {
  diagramId: string;
  file: File;
}

export function useImportSqlFileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ diagramId, file }: ImportSqlFileInput) =>
      introspectionServiceInstance.importSqlFile(diagramId, file),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.diagram.byId(variables.diagramId),
      });
    },
  });
}
