"use client";

import { useMutation } from "@tanstack/react-query";

import type { PostgresConnectionRequest } from "@/lib/types";
import { IntrospectionService } from "@/services/introspectionService";

const introspectionServiceInstance = new IntrospectionService();

interface ListPostgresSchemasInput {
  diagramId: string;
  payload: PostgresConnectionRequest;
}

export function useListPostgresSchemasMutation() {
  return useMutation({
    mutationFn: ({ diagramId, payload }: ListPostgresSchemasInput) =>
      introspectionServiceInstance.listPostgresSchemas(diagramId, payload),
  });
}
