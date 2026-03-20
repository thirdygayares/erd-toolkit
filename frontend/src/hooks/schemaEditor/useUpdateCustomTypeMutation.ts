"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/queryKeys";
import type { CustomTypeUpdateRequest } from "@/lib/types";
import { SchemaEditorService } from "@/services/schemaEditorService";

const schemaEditorServiceInstance = new SchemaEditorService();

interface UpdateCustomTypeInput {
  diagramId: string;
  customTypeId: string;
  payload: CustomTypeUpdateRequest;
}

export function useUpdateCustomTypeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ diagramId, customTypeId, payload }: UpdateCustomTypeInput) =>
      schemaEditorServiceInstance.updateCustomType(
        diagramId,
        customTypeId,
        payload,
      ),
    onSuccess: (_customType, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.diagram.byId(variables.diagramId),
      });
    },
  });
}
