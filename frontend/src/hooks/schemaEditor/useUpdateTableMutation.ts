"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/queryKeys";
import type { TableUpdateRequest } from "@/lib/types";
import { SchemaEditorService } from "@/services/schemaEditorService";

const SchemaEditorServiceInstance = new SchemaEditorService();

interface UpdateTableInput {
  diagramId: string;
  tableId: string;
  payload: TableUpdateRequest;
}

export function useUpdateTableMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ diagramId, tableId, payload }: UpdateTableInput) =>
      SchemaEditorServiceInstance.updateTable(diagramId, tableId, payload),
    onSuccess: (table) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.diagram.byId(table.diagram_id),
      });
    },
  });
}
