"use client";

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/queryKeys";
import { ProjectService } from "@/services/projectService";

const ProjectServiceInstance = new ProjectService();

export function useGetProjectQuery(projectId: string) {
  return useQuery({
    queryKey: queryKeys.project.byId(projectId),
    queryFn: () => ProjectServiceInstance.getProject(projectId),
    enabled: Boolean(projectId),
  });
}
