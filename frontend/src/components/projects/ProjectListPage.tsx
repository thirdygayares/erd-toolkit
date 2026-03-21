"use client";

import {
  ChevronDown,
  ChevronRight,
  FolderPlus,
  LayoutGrid,
  List,
  Loader2,
  LogOut,
  Plus,
  Search,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthSessionQuery } from "@/hooks/auth/useAuthSessionQuery";
import { useLogoutMutation } from "@/hooks/auth/useLogoutMutation";
import { useRefreshSessionMutation } from "@/hooks/auth/useRefreshSessionMutation";
import { useListProjectsQuery } from "@/hooks/project/useListProjectsQuery";
import { useEnsureDefaultWorkspaceMutation } from "@/hooks/workspace/useEnsureDefaultWorkspaceMutation";
import { useListWorkspacesQuery } from "@/hooks/workspace/useListWorkspacesQuery";
import { getBrowserCookie } from "@/lib/authStorage";
import { cn } from "@/lib/utils";
import { CreateProjectDialog } from "./CreateProjectDialog";
import { CreateWorkspaceDialog } from "./CreateWorkspaceDialog";

type ViewMode = "grid" | "list";

function formatLastModified(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

export function ProjectListPage() {
  const router = useRouter();
  const ensuredUserIdRef = useRef<string | null>(null);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(
    null,
  );
  const [isClient, setIsClient] = useState(false);
  const [refreshAttempted, setRefreshAttempted] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [collapsedWorkspaceIds, setCollapsedWorkspaceIds] = useState<
    Record<string, boolean>
  >({});

  const canReadCsrfCookie = Boolean(getBrowserCookie("erd_csrf_token"));
  const sessionQuery = useAuthSessionQuery();
  const logoutMutation = useLogoutMutation();
  const refreshSessionMutation = useRefreshSessionMutation();
  const { data: authSession, isLoading: authLoading } = sessionQuery;
  const userId = authSession?.user.user_id ?? null;
  const isAuthenticated = Boolean(authSession?.user);
  const { data: workspaces = [], isLoading: workspacesLoading } =
    useListWorkspacesQuery(isAuthenticated);
  const { data: projects = [], isLoading: projectsLoading } =
    useListProjectsQuery(isAuthenticated);
  const ensureDefaultMutation = useEnsureDefaultWorkspaceMutation();
  const { mutate: ensureDefaultWorkspace } = ensureDefaultMutation;
  const isSessionRecoveryPending =
    canReadCsrfCookie && sessionQuery.isError && !refreshAttempted;

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredProjects = useMemo(() => {
    if (!normalizedSearch) {
      return projects;
    }

    return projects.filter((project) =>
      project.name.toLowerCase().includes(normalizedSearch),
    );
  }, [projects, normalizedSearch]);

  const projectsByWorkspace = useMemo(
    () =>
      workspaces.map((workspace) => ({
        workspace,
        projects: filteredProjects.filter(
          (project) => project.workspace_id === workspace.workspace_id,
        ),
      })),
    [filteredProjects, workspaces],
  );

  const defaultWorkspace = workspaces.find(
    (workspace) =>
      workspace.workspace_mode === "personal" &&
      workspace.owner_user_id === userId,
  );
  const defaultWorkspaceLabel =
    defaultWorkspace?.name ??
    (ensureDefaultMutation.isPending
      ? "Setting up your default workspace..."
      : "No personal workspace yet");

  const handleCreateProject = (workspaceId?: string | null) => {
    if (workspaceId) {
      setSelectedWorkspaceId(workspaceId);
    } else if (defaultWorkspace) {
      setSelectedWorkspaceId(defaultWorkspace.workspace_id);
    } else {
      setSelectedWorkspaceId(null);
    }
    setShowCreateProject(true);
  };

  const handleLogout = () => {
    logoutMutation
      .mutateAsync()
      .then(() => router.push("/"))
      .catch(() => undefined);
  };

  const toggleWorkspaceSection = (workspaceId: string) => {
    setCollapsedWorkspaceIds((current) => ({
      ...current,
      [workspaceId]: !current[workspaceId],
    }));
  };

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    setCollapsedWorkspaceIds((current) => {
      const next = { ...current };
      for (const workspace of workspaces) {
        if (next[workspace.workspace_id] === undefined) {
          next[workspace.workspace_id] = false;
        }
      }
      return next;
    });
  }, [workspaces]);

  useEffect(() => {
    if (!canReadCsrfCookie || !sessionQuery.isError || refreshAttempted) {
      return;
    }

    setRefreshAttempted(true);
    refreshSessionMutation
      .mutateAsync()
      .then(() => sessionQuery.refetch())
      .catch(() => undefined);
  }, [
    canReadCsrfCookie,
    refreshAttempted,
    refreshSessionMutation,
    sessionQuery,
  ]);

  // Ensure default workspace on mount
  useEffect(() => {
    if (!userId || ensuredUserIdRef.current === userId) {
      return;
    }

    ensuredUserIdRef.current = userId;
    ensureDefaultWorkspace();
  }, [ensureDefaultWorkspace, userId]);

  // Redirect to landing if not authenticated
  useEffect(() => {
    if (authLoading || refreshSessionMutation.isPending) {
      return;
    }

    if (!authSession?.user && (!sessionQuery.isError || refreshAttempted)) {
      router.push("/");
      return;
    }

    if (sessionQuery.isError && (!canReadCsrfCookie || refreshAttempted)) {
      router.push("/");
    }
  }, [
    authLoading,
    authSession?.user,
    canReadCsrfCookie,
    refreshAttempted,
    refreshSessionMutation.isPending,
    sessionQuery.isError,
    router,
  ]);

  const hasAnyProjects = projects.length > 0;
  const hasMatchingProjects = filteredProjects.length > 0;
  const hasSearch = normalizedSearch.length > 0;

  if (!isClient) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),_transparent_40%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.12),_transparent_35%),linear-gradient(180deg,_#fffaf3_0%,_#f8fafc_55%,_#eff6ff_100%)] px-6 text-center">
        <div className="rounded-3xl border border-white/70 bg-white/85 px-6 py-5 shadow-sm">
          <div className="flex items-center gap-3 text-slate-700">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="font-medium">Loading your workspaces...</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Preparing your project hub.
          </p>
        </div>
      </div>
    );
  }

  if (
    authLoading ||
    refreshSessionMutation.isPending ||
    isSessionRecoveryPending ||
    (isAuthenticated && (workspacesLoading || projectsLoading))
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),_transparent_40%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.12),_transparent_35%),linear-gradient(180deg,_#fffaf3_0%,_#f8fafc_55%,_#eff6ff_100%)] px-6 text-center">
        <div className="rounded-3xl border border-white/70 bg-white/85 px-6 py-5 shadow-sm">
          <div className="flex items-center gap-3 text-slate-700">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="font-medium">Loading your workspaces...</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Preparing your project hub.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),_transparent_40%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.12),_transparent_35%),linear-gradient(180deg,_#fffaf3_0%,_#f8fafc_55%,_#eff6ff_100%)]">
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6">
        <header className="sticky top-4 z-20 rounded-3xl border border-white/70 bg-white/90 p-4 shadow-sm backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  className="bg-amber-100/60 text-amber-900"
                  variant="outline"
                >
                  Workspace Hub
                </Badge>
                <span className="rounded-full border border-border/60 bg-white px-3 py-1 text-xs text-muted-foreground">
                  Workspaces: {workspaces.length}
                </span>
                <span className="rounded-full border border-border/60 bg-white px-3 py-1 text-xs text-muted-foreground">
                  Projects: {projects.length}
                </span>
                {hasSearch ? (
                  <span className="rounded-full border border-border/60 bg-white px-3 py-1 text-xs text-muted-foreground">
                    Showing: {filteredProjects.length}
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                Default workspace:{" "}
                <span className="font-medium text-foreground">
                  {defaultWorkspaceLabel}
                </span>
              </p>
            </div>

            <Button
              className="gap-2"
              disabled={logoutMutation.isPending}
              onClick={handleLogout}
              variant="outline"
            >
              <LogOut className="h-4 w-4" />
              {logoutMutation.isPending ? "Signing out..." : "Sign out"}
            </Button>
          </div>
        </header>

        <section className="mt-6 rounded-3xl border border-white/70 bg-white/85 p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => handleCreateProject()} className="gap-2">
                <Plus className="h-4 w-4" />
                Create Project
              </Button>
              <Button
                onClick={() => setShowCreateWorkspace(true)}
                variant="outline"
                className="gap-2"
              >
                <FolderPlus className="h-4 w-4" />
                New Workspace
              </Button>
            </div>

            <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">
              <div className="relative min-w-[220px] flex-1 lg:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search projects by name"
                  value={searchTerm}
                />
              </div>
              <div className="inline-flex rounded-xl  bg-white p-1">
                <Button
                  aria-pressed={viewMode === "grid"}
                  className="gap-2"
                  onClick={() => setViewMode("grid")}
                  size="sm"
                  type="button"
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  aria-pressed={viewMode === "list"}
                  className="gap-2"
                  onClick={() => setViewMode("list")}
                  size="sm"
                  type="button"
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-6">
          {!hasAnyProjects ? (
            <div className="relative overflow-hidden rounded-3xl border border-white/70 bg-white/85 p-10 text-center shadow-sm">
              <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-amber-200/30 blur-3xl" />
              <div className="absolute -bottom-24 left-0 h-40 w-40 rounded-full bg-sky-200/30 blur-3xl" />
              <Badge className="mx-auto w-fit bg-white/70" variant="outline">
                Get started
              </Badge>
              <h3 className="mt-4 text-2xl font-semibold text-foreground">
                No projects yet
              </h3>
              <p className="mt-3 text-sm text-muted-foreground">
                Create your first project and keep everything organized by
                workspace.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Button
                  onClick={() => handleCreateProject()}
                  size="lg"
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Create Your First Project
                </Button>
                <Button
                  onClick={() => setShowCreateWorkspace(true)}
                  size="lg"
                  variant="outline"
                  className="gap-2"
                >
                  <FolderPlus className="h-4 w-4" />
                  Create Workspace
                </Button>
              </div>
              <p className="mt-6 text-sm text-muted-foreground/70">
                Plan visually. Document clearly. Build with fewer schema
                surprises.
              </p>
            </div>
          ) : !hasMatchingProjects ? (
            <div className="rounded-3xl border border-white/70 bg-white/85 p-10 text-center shadow-sm">
              <h3 className="text-xl font-semibold text-foreground">
                No projects found
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                No project names matched "{searchTerm}". Try a different search.
              </p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="space-y-6">
              {projectsByWorkspace.map(
                ({ workspace, projects: wsProjects }) => (
                  <section
                    key={workspace.workspace_id}
                    className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-semibold text-foreground">
                          {workspace.name}
                        </h2>
                        <p className="text-sm text-muted-foreground capitalize">
                          {workspace.workspace_mode} workspace ·{" "}
                          {wsProjects.length} project
                          {wsProjects.length === 1 ? "" : "s"}
                        </p>
                      </div>
                      <Button
                        onClick={() =>
                          handleCreateProject(workspace.workspace_id)
                        }
                        variant="outline"
                        size="sm"
                        className="gap-2"
                      >
                        <Plus className="h-3 w-3" />
                        Add Project
                      </Button>
                    </div>

                    {wsProjects.length === 0 ? (
                      <div className="mt-5 rounded-2xl border border-dashed border-muted-foreground/30 bg-muted/40 p-8 text-center">
                        <p className="mb-4 text-sm text-muted-foreground">
                          No projects in this workspace yet.
                        </p>
                        <Button
                          onClick={() =>
                            handleCreateProject(workspace.workspace_id)
                          }
                          variant="outline"
                          size="sm"
                          className="gap-2"
                        >
                          <Plus className="h-3 w-3" />
                          Add Project
                        </Button>
                      </div>
                    ) : (
                      <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {wsProjects.map((project) => (
                          <button
                            key={project.project_id}
                            type="button"
                            className="group relative overflow-hidden rounded-2xl border border-border/60 bg-white/90 p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                            onClick={() =>
                              router.push(`/project/${project.project_id}`)
                            }
                          >
                            <div className="flex items-start justify-between gap-3">
                              <h3 className="truncate font-semibold text-foreground">
                                {project.name}
                              </h3>
                              <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium capitalize text-muted-foreground">
                                {project.visibility}
                              </span>
                            </div>
                            {project.description ? (
                              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                                {project.description}
                              </p>
                            ) : (
                              <p className="mt-2 text-sm text-muted-foreground/70">
                                No description yet.
                              </p>
                            )}
                            <div className="mt-4 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <span className="rounded-full border border-border/60 bg-white px-2 py-1 capitalize">
                                  {workspace.workspace_mode}
                                </span>
                                <span
                                  className={cn(
                                    "rounded-full px-2 py-1 font-medium",
                                    project.is_archived
                                      ? "bg-destructive/10 text-destructive"
                                      : "bg-emerald-100/80 text-emerald-700",
                                  )}
                                >
                                  {project.is_archived ? "Archived" : "Active"}
                                </span>
                              </div>
                              <span>
                                Updated {formatLastModified(project.updated_at)}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </section>
                ),
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {projectsByWorkspace.map(
                ({ workspace, projects: wsProjects }) => {
                  const isCollapsed =
                    collapsedWorkspaceIds[workspace.workspace_id];

                  return (
                    <section
                      key={workspace.workspace_id}
                      className="rounded-3xl border border-white/70 bg-white/90 p-4 shadow-sm"
                    >
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-4 rounded-2xl px-2 py-2 text-left transition hover:bg-muted/40"
                        onClick={() =>
                          toggleWorkspaceSection(workspace.workspace_id)
                        }
                      >
                        <div>
                          <h2 className="text-lg font-semibold text-foreground">
                            {workspace.name}
                          </h2>
                          <p className="text-sm text-muted-foreground capitalize">
                            {workspace.workspace_mode} workspace
                          </p>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span>
                            {wsProjects.length} project
                            {wsProjects.length === 1 ? "" : "s"}
                          </span>
                          {isCollapsed ? (
                            <ChevronRight className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </button>

                      {!isCollapsed ? (
                        <div className="mt-3 overflow-x-auto rounded-2xl border border-border/60">
                          <table className="w-full min-w-[700px] border-separate border-spacing-0 text-sm">
                            <thead>
                              <tr className="bg-muted/50 text-left text-xs uppercase tracking-[0.18em] text-muted-foreground">
                                <th className="px-4 py-3 font-medium">Name</th>
                                <th className="px-4 py-3 font-medium">
                                  Workspace
                                </th>
                                <th className="px-4 py-3 font-medium">
                                  Visibility
                                </th>
                                <th className="px-4 py-3 font-medium">
                                  Status
                                </th>
                                <th className="px-4 py-3 font-medium">
                                  Last Modified
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {wsProjects.length === 0 ? (
                                <tr>
                                  <td
                                    className="px-4 py-6 text-center text-sm text-muted-foreground"
                                    colSpan={5}
                                  >
                                    No projects in this workspace yet.
                                  </td>
                                </tr>
                              ) : (
                                wsProjects.map((project) => (
                                  <tr
                                    key={project.project_id}
                                    className="border-t border-border/60 bg-white transition hover:bg-muted/20"
                                  >
                                    <td className="px-4 py-3 align-top">
                                      <button
                                        type="button"
                                        className="text-left font-semibold text-foreground hover:underline"
                                        onClick={() =>
                                          router.push(
                                            `/project/${project.project_id}`,
                                          )
                                        }
                                      >
                                        {project.name}
                                      </button>
                                      {project.description ? (
                                        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                                          {project.description}
                                        </p>
                                      ) : null}
                                    </td>
                                    <td className="px-4 py-3 align-top">
                                      {workspace.name}
                                    </td>
                                    <td className="px-4 py-3 align-top capitalize">
                                      {project.visibility}
                                    </td>
                                    <td className="px-4 py-3 align-top">
                                      <span
                                        className={cn(
                                          "inline-flex rounded-full px-2 py-1 text-xs font-medium",
                                          project.is_archived
                                            ? "bg-destructive/10 text-destructive"
                                            : "bg-emerald-100/80 text-emerald-700",
                                        )}
                                      >
                                        {project.is_archived
                                          ? "Archived"
                                          : "Active"}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 align-top text-muted-foreground">
                                      {formatLastModified(project.updated_at)}
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      ) : null}
                    </section>
                  );
                },
              )}
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <CreateProjectDialog
        key={selectedWorkspaceId ?? "default-workspace"}
        open={showCreateProject}
        onOpenChange={setShowCreateProject}
        workspaceId={selectedWorkspaceId}
        workspaces={workspaces}
      />
      <CreateWorkspaceDialog
        open={showCreateWorkspace}
        onOpenChange={setShowCreateWorkspace}
      />
    </div>
  );
}
