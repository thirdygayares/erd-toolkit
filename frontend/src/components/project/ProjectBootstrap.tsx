"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import {
  clearStoredProjectContext,
  setStoredProjectContext,
} from "@/lib/authStorage";
import { DiagramService } from "@/services/diagramService";
import { ProjectService } from "@/services/projectService";
import { WorkspaceService } from "@/services/workspaceService";

type BootstrapWorkspaceMode = "guest" | "personal";
type BootstrapProjectVisibility = "public" | "private";

function buildProjectName(prefix: string): string {
  const now = new Date();
  return `${prefix} ${now.getHours().toString().padStart(2, "0")}${now
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}

const workspaceService = new WorkspaceService();
const projectService = new ProjectService();
const diagramService = new DiagramService();

interface ProjectBootstrapProps {
  workspaceMode: BootstrapWorkspaceMode;
  projectVisibility: BootstrapProjectVisibility;
}

export function ProjectBootstrap({
  workspaceMode,
  projectVisibility,
}: ProjectBootstrapProps) {
  const router = useRouter();
  const initializedRef = useRef(false);
  const [status, setStatus] = useState("Preparing workspace...");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (initializedRef.current || typeof window === "undefined") {
      return;
    }

    initializedRef.current = true;

    const bootstrap = async () => {
      setStatus(
        workspaceMode === "guest"
          ? "Creating guest workspace..."
          : "Creating personal workspace...",
      );
      const workspace = await workspaceService.createWorkspace({
        name:
          workspaceMode === "guest"
            ? buildProjectName("Guest Workspace")
            : buildProjectName("Personal Workspace"),
        workspace_mode: workspaceMode,
      });

      setStatus(
        projectVisibility === "public"
          ? "Creating public project..."
          : "Creating private project...",
      );
      const project = await projectService.createProject({
        workspace_id: workspace.workspace_id,
        name:
          workspaceMode === "guest"
            ? buildProjectName("Guest ERD Project")
            : buildProjectName("Private ERD Project"),
        visibility: projectVisibility,
        allow_anonymous_edit: projectVisibility === "public",
      });

      setStatus("Creating main diagram...");
      const diagram = await diagramService.createDiagram({
        workspace_id: workspace.workspace_id,
        project_id: project.project_id,
        name: "Main Diagram",
      });

      setStoredProjectContext({
        workspaceId: workspace.workspace_id,
        projectId: project.project_id,
        diagramId: diagram.diagram_id,
        shareSlug: projectVisibility === "public" ? project.share_slug : null,
      });

      router.replace(`/project/${project.project_id}`);
    };

    bootstrap().catch((error) => {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to initialize project.";
      setErrorMessage(message);
    });
  }, [projectVisibility, router, workspaceMode]);

  if (errorMessage) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <div className="w-full max-w-lg rounded-xl border border-rose-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-rose-700">
            Bootstrap failed
          </h1>
          <p className="mt-2 text-sm text-slate-600">{errorMessage}</p>
          <button
            type="button"
            onClick={() => {
              clearStoredProjectContext();
              window.location.reload();
            }}
            className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
      <div className="rounded-xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <div className="flex items-center gap-3 text-slate-700">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="font-medium">{status}</span>
        </div>
      </div>
    </div>
  );
}
