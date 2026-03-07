"use client";

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/queryKeys";
import { ProjectService } from "@/services/projectService";

const ProjectServiceInstance = new ProjectService();

export function useListProjectsQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.project.list(),
    queryFn: () => ProjectServiceInstance.listProjects(),
    enabled,
  });
}
