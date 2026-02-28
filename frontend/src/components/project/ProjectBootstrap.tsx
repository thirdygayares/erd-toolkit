"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { DiagramService } from "@/services/diagramService";
import { ProjectService } from "@/services/projectService";
import { WorkspaceService } from "@/services/workspaceService";

const sessionStorageKey = {
  workspaceId: "ERD_WORKSPACE_ID",
  projectId: "ERD_PROJECT_ID",
  diagramId: "ERD_DIAGRAM_ID",
  shareSlug: "ERD_SHARE_SLUG",
} as const;

function buildGuestName(prefix: string): string {
  const now = new Date();
  return `${prefix} ${now.getHours().toString().padStart(2, "0")}${now
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}

const workspaceService = new WorkspaceService();
const projectService = new ProjectService();
const diagramService = new DiagramService();

export function ProjectBootstrap() {
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
      const url = new URL(window.location.href);
      const shareSlug = url.searchParams.get("share")?.trim();

      if (shareSlug) {
        router.replace(`/share/${shareSlug}`);
        return;
      }

      const existingProjectId =
        window.localStorage.getItem(sessionStorageKey.projectId) ?? "";
      if (existingProjectId) {
        router.replace(`/project/${existingProjectId}`);
        return;
      }

      setStatus("Creating guest workspace...");
      const workspace = await workspaceService.createWorkspace({
        name: buildGuestName("Guest Workspace"),
        workspace_mode: "guest",
      });

      setStatus("Creating public project...");
      const project = await projectService.createProject({
        workspace_id: workspace.workspace_id,
        name: buildGuestName("ERD Project"),
        visibility: "public",
        allow_anonymous_edit: true,
      });

      setStatus("Creating main diagram...");
      const diagram = await diagramService.createDiagram({
        workspace_id: workspace.workspace_id,
        project_id: project.project_id,
        name: "Main Diagram",
      });

      window.localStorage.setItem(
        sessionStorageKey.workspaceId,
        workspace.workspace_id,
      );
      window.localStorage.setItem(
        sessionStorageKey.projectId,
        project.project_id,
      );
      window.localStorage.setItem(
        sessionStorageKey.diagramId,
        diagram.diagram_id,
      );
      if (project.share_slug) {
        window.localStorage.setItem(
          sessionStorageKey.shareSlug,
          project.share_slug,
        );
      }

      router.replace(`/project/${project.project_id}`);
    };

    bootstrap().catch((error) => {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to initialize project.";
      setErrorMessage(message);
    });
  }, [router]);

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
              window.localStorage.removeItem(sessionStorageKey.workspaceId);
              window.localStorage.removeItem(sessionStorageKey.projectId);
              window.localStorage.removeItem(sessionStorageKey.diagramId);
              window.localStorage.removeItem(sessionStorageKey.shareSlug);
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
