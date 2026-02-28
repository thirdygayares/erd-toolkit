"use client";

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/queryKeys";
import { DiagramService } from "@/services/diagramService";

const DiagramServiceInstance = new DiagramService();

export function useListDiagramsByWorkspaceQuery(workspaceId: string) {
  return useQuery({
    queryKey: queryKeys.diagram.listByWorkspace(workspaceId),
    queryFn: () => DiagramServiceInstance.listDiagramsByWorkspace(workspaceId),
    enabled: Boolean(workspaceId),
  });
}
