"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/queryKeys";
import type { CustomTypeCreateRequest } from "@/lib/types";
import { SchemaEditorService } from "@/services/schemaEditorService";

const schemaEditorServiceInstance = new SchemaEditorService();

interface CreateCustomTypeInput {
  diagramId: string;
  payload: CustomTypeCreateRequest;
}

export function useCreateCustomTypeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ diagramId, payload }: CreateCustomTypeInput) =>
      schemaEditorServiceInstance.createCustomType(diagramId, payload),
    onSuccess: (_customType, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.diagram.byId(variables.diagramId),
      });
    },
  });
}
