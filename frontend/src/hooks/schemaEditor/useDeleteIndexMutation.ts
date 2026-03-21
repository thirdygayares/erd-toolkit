"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/queryKeys";
import { SchemaEditorService } from "@/services/schemaEditorService";

const schemaEditorServiceInstance = new SchemaEditorService();

interface DeleteIndexInput {
  diagramId: string;
  tableId: string;
  indexId: string;
}

export function useDeleteIndexMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ diagramId, tableId, indexId }: DeleteIndexInput) =>
      schemaEditorServiceInstance.deleteIndex(diagramId, tableId, indexId),
    onSuccess: (_index, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.diagram.byId(variables.diagramId),
      });
    },
  });
}
