"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/queryKeys";
import type { ImportPostgresRequest } from "@/lib/types";
import { IntrospectionService } from "@/services/introspectionService";

const IntrospectionServiceInstance = new IntrospectionService();

interface ImportPostgresInput {
  diagramId: string;
  payload: ImportPostgresRequest;
}

export function useImportPostgresMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ diagramId, payload }: ImportPostgresInput) =>
      IntrospectionServiceInstance.importPostgres(diagramId, payload),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.diagram.byId(variables.diagramId),
      });
    },
  });
}
