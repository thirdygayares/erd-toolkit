export const queryKeys = {
  auth: {
    session: () => ["Auth", "Session"] as const,
  },
  workspace: {
    all: () => ["Workspace", "All"] as const,
    list: () => ["Workspace", "List"] as const,
    ensureDefault: () => ["Workspace", "EnsureDefault"] as const,
  },
  project: {
    all: () => ["Project", "All"] as const,
    list: () => ["Project", "List"] as const,
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
