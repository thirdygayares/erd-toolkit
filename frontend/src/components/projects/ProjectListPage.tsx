"use client";

import { FolderPlus, Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuthSessionQuery } from "@/hooks/auth/useAuthSessionQuery";
import { useRefreshSessionMutation } from "@/hooks/auth/useRefreshSessionMutation";
import { useListProjectsQuery } from "@/hooks/project/useListProjectsQuery";
import { useEnsureDefaultWorkspaceMutation } from "@/hooks/workspace/useEnsureDefaultWorkspaceMutation";
import { useListWorkspacesQuery } from "@/hooks/workspace/useListWorkspacesQuery";
import { getBrowserCookie } from "@/lib/authStorage";
import type { ProjectListResponse, WorkspaceListResponse } from "@/lib/types";
import { CreateProjectDialog } from "./CreateProjectDialog";
import { CreateWorkspaceDialog } from "./CreateWorkspaceDialog";

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

  const canReadCsrfCookie = Boolean(getBrowserCookie("erd_csrf_token"));
  const sessionQuery = useAuthSessionQuery();
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

  useEffect(() => {
    setIsClient(true);
  }, []);

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

  // Group projects by workspace
  const projectsByWorkspace = workspaces.reduce(
    (acc, workspace) => {
      const workspaceProjects = projects.filter(
        (p) => p.workspace_id === workspace.workspace_id,
      );
      acc[workspace.workspace_id] = {
        workspace,
        projects: workspaceProjects,
      };
      return acc;
    },
    {} as Record<
      string,
      {
        workspace: WorkspaceListResponse;
        projects: ProjectListResponse[];
      }
    >,
  );

  const isEmpty = projects.length === 0;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),_transparent_40%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.12),_transparent_35%),linear-gradient(180deg,_#fffaf3_0%,_#f8fafc_55%,_#eff6ff_100%)]">
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="rounded-3xl border border-white/70 bg-white/85 p-8 shadow-sm">
            <Badge
              className="w-fit bg-amber-100/60 text-amber-900"
              variant="outline"
            >
              Workspace hub
            </Badge>
            <h1 className="mt-4 text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
              Start with the structure before the complexity starts.
            </h1>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              Manage your projects and workspaces in one place, then jump back
              into the diagram editor when you are ready.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
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
            <div className="mt-6 flex flex-wrap gap-2">
              {[
                "Workspace overview",
                "Project grouping",
                "Owner-only view",
              ].map((chip) => (
                <span
                  className="rounded-full border border-border/60 bg-white/70 px-3 py-1.5 text-xs text-muted-foreground"
                  key={chip}
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/70 bg-white/75 p-6 shadow-sm">
            <div className="grid gap-3">
              <div className="rounded-2xl border border-border/60 bg-white/85 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Workspaces
                </p>
                <p className="mt-2 text-2xl font-semibold">
                  {workspaces.length}
                </p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-white/85 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Projects
                </p>
                <p className="mt-2 text-2xl font-semibold">{projects.length}</p>
              </div>
            </div>
            <div className="mt-4 rounded-2xl border border-border/60 bg-white/80 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Default workspace
              </p>
              <p className="mt-2 text-sm font-semibold text-foreground">
                {defaultWorkspaceLabel}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-10">
          {isEmpty ? (
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
          ) : (
            <div className="space-y-8">
              {Object.values(projectsByWorkspace).map(
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
                          {workspace.workspace_mode} workspace
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
                            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="rounded-full border border-border/60 bg-white px-2 py-1 capitalize">
                                {workspace.workspace_mode}
                              </span>
                              {project.is_archived && (
                                <span className="rounded-full bg-destructive/10 px-2 py-1 font-medium text-destructive">
                                  Archived
                                </span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </section>
                ),
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
