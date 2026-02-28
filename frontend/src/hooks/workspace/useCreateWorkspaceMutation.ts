"use client";

import { useMutation } from "@tanstack/react-query";

import type { WorkspaceCreateRequest } from "@/lib/types";
import { WorkspaceService } from "@/services/workspaceService";

const WorkspaceServiceInstance = new WorkspaceService();

export function useCreateWorkspaceMutation() {
  return useMutation({
    mutationFn: (payload: WorkspaceCreateRequest) =>
      WorkspaceServiceInstance.createWorkspace(payload),
  });
}
