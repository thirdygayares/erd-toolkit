"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/queryKeys";
import type { WorkspaceListResponse } from "@/lib/types";
import { WorkspaceService } from "@/services/workspaceService";

const WorkspaceServiceInstance = new WorkspaceService();

export function useEnsureDefaultWorkspaceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => WorkspaceServiceInstance.ensureDefaultWorkspace(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.workspace.list(),
      });
      queryClient.setQueryData(
        queryKeys.workspace.list(),
        (old: WorkspaceListResponse[] | undefined) => {
          if (!old) return [data];
          const exists = old.some((w) => w.workspace_id === data.workspace_id);
          return exists ? old : [...old, data];
        },
      );
    },
  });
}
