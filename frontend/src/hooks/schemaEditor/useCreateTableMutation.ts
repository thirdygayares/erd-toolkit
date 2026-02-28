"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/queryKeys";
import type { TableCreateRequest } from "@/lib/types";
import { SchemaEditorService } from "@/services/schemaEditorService";

const SchemaEditorServiceInstance = new SchemaEditorService();

interface CreateTableInput {
  diagramId: string;
  payload: TableCreateRequest;
}

export function useCreateTableMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ diagramId, payload }: CreateTableInput) =>
      SchemaEditorServiceInstance.createTable(diagramId, payload),
    onSuccess: (table) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.diagram.byId(table.diagram_id),
      });
    },
  });
}
