"use client";

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/queryKeys";
import { WorkspaceService } from "@/services/workspaceService";

const WorkspaceServiceInstance = new WorkspaceService();

export function useListWorkspacesQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.workspace.list(),
    queryFn: () => WorkspaceServiceInstance.listWorkspaces(),
    enabled,
  });
}
