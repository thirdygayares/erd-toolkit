"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/queryKeys";
import type { DiagramCreateRequest } from "@/lib/types";
import { DiagramService } from "@/services/diagramService";

const DiagramServiceInstance = new DiagramService();

export function useCreateDiagramMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: DiagramCreateRequest) =>
      DiagramServiceInstance.createDiagram(payload),
    onSuccess: (diagram) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.diagram.listByWorkspace(diagram.workspace_id),
      });
      queryClient.setQueryData(queryKeys.diagram.byId(diagram.diagram_id), {
        diagram,
        tables: [],
        relationships: [],
      });
    },
  });
}
