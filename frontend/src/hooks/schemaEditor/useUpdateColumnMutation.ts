"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/queryKeys";
import type { ColumnUpdateRequest } from "@/lib/types";
import { SchemaEditorService } from "@/services/schemaEditorService";

const SchemaEditorServiceInstance = new SchemaEditorService();

interface UpdateColumnInput {
  diagramId: string;
  tableId: string;
  columnId: string;
  payload: ColumnUpdateRequest;
}

export function useUpdateColumnMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      diagramId,
      tableId,
      columnId,
      payload,
    }: UpdateColumnInput) =>
      SchemaEditorServiceInstance.updateColumn(
        diagramId,
        tableId,
        columnId,
        payload,
      ),
    onSuccess: (_column, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.diagram.byId(variables.diagramId),
      });
    },
  });
}
