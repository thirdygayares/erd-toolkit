"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/queryKeys";
import { SchemaEditorService } from "@/services/schemaEditorService";

const schemaEditorServiceInstance = new SchemaEditorService();

interface DeleteCustomTypeInput {
  diagramId: string;
  customTypeId: string;
}

export function useDeleteCustomTypeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ diagramId, customTypeId }: DeleteCustomTypeInput) =>
      schemaEditorServiceInstance.deleteCustomType(diagramId, customTypeId),
    onSuccess: (_customType, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.diagram.byId(variables.diagramId),
      });
    },
  });
}
