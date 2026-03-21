"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/queryKeys";
import type { ProjectUpdateRequest } from "@/lib/types";
import { ProjectService } from "@/services/projectService";

const ProjectServiceInstance = new ProjectService();

interface UpdateProjectInput {
  projectId: string;
  payload: ProjectUpdateRequest;
}

export function useUpdateProjectMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, payload }: UpdateProjectInput) =>
      ProjectServiceInstance.updateProject(projectId, payload),
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
      queryClient.invalidateQueries({ queryKey: queryKeys.project.list() });
    },
  });
}
