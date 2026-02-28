"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/queryKeys";
import { SchemaEditorService } from "@/services/schemaEditorService";

const schemaEditorServiceInstance = new SchemaEditorService();

interface DeleteRelationshipInput {
  diagramId: string;
  relationshipId: string;
}

export function useDeleteRelationshipMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ diagramId, relationshipId }: DeleteRelationshipInput) =>
      schemaEditorServiceInstance.deleteRelationship(diagramId, relationshipId),
    onSuccess: (relationship) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.diagram.byId(relationship.diagram_id),
      });
    },
  });
}
