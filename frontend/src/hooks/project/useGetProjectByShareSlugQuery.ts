"use client";

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/queryKeys";
import { ProjectService } from "@/services/projectService";

const ProjectServiceInstance = new ProjectService();

export function useGetProjectByShareSlugQuery(shareSlug: string) {
  return useQuery({
    queryKey: queryKeys.project.byShareSlug(shareSlug),
    queryFn: () => ProjectServiceInstance.getProjectByShareSlug(shareSlug),
    enabled: Boolean(shareSlug),
  });
}
