export const queryKeys = {
  project: {
    byId: (projectId: string) => ["Project", "ById", projectId] as const,
    byShareSlug: (shareSlug: string) =>
      ["Project", "ByShareSlug", shareSlug] as const,
  },
  diagram: {
    byId: (diagramId: string) => ["Diagram", "ById", diagramId] as const,
    listByWorkspace: (workspaceId: string) =>
      ["Diagram", "ListByWorkspace", workspaceId] as const,
  },
};
