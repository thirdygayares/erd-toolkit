"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/queryKeys";
import type { ProjectVisibilityUpdateRequest } from "@/lib/types";
import { ProjectService } from "@/services/projectService";

const ProjectServiceInstance = new ProjectService();

interface UpdateProjectVisibilityInput {
  projectId: string;
  payload: ProjectVisibilityUpdateRequest;
}

export function useUpdateProjectVisibilityMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, payload }: UpdateProjectVisibilityInput) =>
      ProjectServiceInstance.updateProjectVisibility(projectId, payload),
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
