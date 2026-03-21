"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/queryKeys";
import type { ImportSqlRawRequest } from "@/lib/types";
import { IntrospectionService } from "@/services/introspectionService";

const introspectionServiceInstance = new IntrospectionService();

interface ImportSqlRawInput {
  diagramId: string;
  payload: ImportSqlRawRequest;
}

export function useImportSqlRawMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ diagramId, payload }: ImportSqlRawInput) =>
      introspectionServiceInstance.importSqlRaw(diagramId, payload),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.diagram.byId(variables.diagramId),
      });
    },
  });
}
