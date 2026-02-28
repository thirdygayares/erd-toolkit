"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/queryKeys";
import type { ProjectCreateRequest } from "@/lib/types";
import { ProjectService } from "@/services/projectService";

const ProjectServiceInstance = new ProjectService();

export function useCreateProjectMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ProjectCreateRequest) =>
      ProjectServiceInstance.createProject(payload),
    onSuccess: (project) => {
      queryClient.setQueryData(
        queryKeys.project.byId(project.project_id),
        project,
      );
      if (project.share_slug) {
        queryClient.setQueryData(
          queryKeys.project.byShareSlug(project.share_slug),
          project,
        );
      }
    },
  });
}
