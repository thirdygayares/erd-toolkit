"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/queryKeys";
import type { IndexUpdateRequest } from "@/lib/types";
import { SchemaEditorService } from "@/services/schemaEditorService";

const schemaEditorServiceInstance = new SchemaEditorService();

interface UpdateIndexInput {
  diagramId: string;
  tableId: string;
  indexId: string;
  payload: IndexUpdateRequest;
}

export function useUpdateIndexMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ diagramId, tableId, indexId, payload }: UpdateIndexInput) =>
      schemaEditorServiceInstance.updateIndex(
        diagramId,
        tableId,
        indexId,
        payload,
      ),
    onSuccess: (_index, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.diagram.byId(variables.diagramId),
      });
    },
  });
}
