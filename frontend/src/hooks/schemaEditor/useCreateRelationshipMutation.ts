"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/queryKeys";
import type { RelationshipCreateRequest } from "@/lib/types";
import { SchemaEditorService } from "@/services/schemaEditorService";

const SchemaEditorServiceInstance = new SchemaEditorService();

interface CreateRelationshipInput {
  diagramId: string;
  payload: RelationshipCreateRequest;
}

export function useCreateRelationshipMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ diagramId, payload }: CreateRelationshipInput) =>
      SchemaEditorServiceInstance.createRelationship(diagramId, payload),
    onSuccess: (relationship) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.diagram.byId(relationship.diagram_id),
      });
    },
  });
}
