"use client";

import { useMutation } from "@tanstack/react-query";

import type { PostgresConnectionRequest } from "@/lib/types";
import { IntrospectionService } from "@/services/introspectionService";

const introspectionServiceInstance = new IntrospectionService();

interface TestPostgresConnectionInput {
  diagramId: string;
  payload: PostgresConnectionRequest;
}

export function useTestPostgresConnectionMutation() {
  return useMutation({
    mutationFn: ({ diagramId, payload }: TestPostgresConnectionInput) =>
      introspectionServiceInstance.testPostgresConnection(diagramId, payload),
  });
}
