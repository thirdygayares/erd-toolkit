"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/queryKeys";
import type { IndexCreateRequest } from "@/lib/types";
import { SchemaEditorService } from "@/services/schemaEditorService";

const schemaEditorServiceInstance = new SchemaEditorService();

interface CreateIndexInput {
  diagramId: string;
  tableId: string;
  payload: IndexCreateRequest;
}

export function useCreateIndexMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ diagramId, tableId, payload }: CreateIndexInput) =>
      schemaEditorServiceInstance.createIndex(diagramId, tableId, payload),
    onSuccess: (_index, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.diagram.byId(variables.diagramId),
      });
    },
  });
}
