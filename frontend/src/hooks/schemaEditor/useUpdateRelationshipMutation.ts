"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/queryKeys";
import type { RelationshipUpdateRequest } from "@/lib/types";
import { SchemaEditorService } from "@/services/schemaEditorService";

const SchemaEditorServiceInstance = new SchemaEditorService();

interface UpdateRelationshipInput {
  diagramId: string;
  relationshipId: string;
  payload: RelationshipUpdateRequest;
}

export function useUpdateRelationshipMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      diagramId,
      relationshipId,
      payload,
    }: UpdateRelationshipInput) =>
      SchemaEditorServiceInstance.updateRelationship(
        diagramId,
        relationshipId,
        payload,
      ),
    onSuccess: (relationship) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.diagram.byId(relationship.diagram_id),
      });
    },
  });
}
