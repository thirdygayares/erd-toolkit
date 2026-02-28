"use client";

import { useMutation } from "@tanstack/react-query";

import type { SnapshotCreateRequest } from "@/lib/types";
import { DiagramService } from "@/services/diagramService";

const DiagramServiceInstance = new DiagramService();

interface CreateSnapshotInput {
  diagramId: string;
  payload: SnapshotCreateRequest;
}

export function useCreateSnapshotMutation() {
  return useMutation({
    mutationFn: ({ diagramId, payload }: CreateSnapshotInput) =>
      DiagramServiceInstance.createSnapshot(diagramId, payload),
  });
}
