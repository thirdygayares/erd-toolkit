"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/queryKeys";
import type { ColumnCreateRequest } from "@/lib/types";
import { SchemaEditorService } from "@/services/schemaEditorService";

const SchemaEditorServiceInstance = new SchemaEditorService();

interface CreateColumnInput {
  diagramId: string;
  tableId: string;
  payload: ColumnCreateRequest;
}

export function useCreateColumnMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ diagramId, tableId, payload }: CreateColumnInput) =>
      SchemaEditorServiceInstance.createColumn(diagramId, tableId, payload),
    onSuccess: (_column, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.diagram.byId(variables.diagramId),
      });
    },
  });
}
