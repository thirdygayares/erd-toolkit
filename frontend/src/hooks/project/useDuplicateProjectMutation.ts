"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/queryKeys";
import { ProjectService } from "@/services/projectService";

const ProjectServiceInstance = new ProjectService();

export function useDuplicateProjectMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      payload,
    }: {
      projectId: string;
      payload: { name: string };
    }) => ProjectServiceInstance.duplicateProject(projectId, payload),
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
      queryClient.invalidateQueries({ queryKey: queryKeys.project.all() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.diagram.listByWorkspace(project.workspace_id),
      });
    },
  });
}
