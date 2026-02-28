"use client";

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/queryKeys";
import { DiagramService } from "@/services/diagramService";

const DiagramServiceInstance = new DiagramService();

export function useGetDiagramQuery(diagramId: string) {
  return useQuery({
    queryKey: queryKeys.diagram.byId(diagramId),
    queryFn: () => DiagramServiceInstance.getDiagram(diagramId),
    enabled: Boolean(diagramId),
  });
}
