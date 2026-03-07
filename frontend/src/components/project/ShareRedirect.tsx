"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useGetProjectByShareSlugQuery } from "@/hooks/project/useGetProjectByShareSlugQuery";
import { setStoredProjectContext } from "@/lib/authStorage";

interface ShareRedirectProps {
  shareSlug: string;
}

export function ShareRedirect({ shareSlug }: ShareRedirectProps) {
  const router = useRouter();
  const projectByShareSlugQuery = useGetProjectByShareSlugQuery(shareSlug);

  useEffect(() => {
    const project = projectByShareSlugQuery.data;
    if (!project || typeof window === "undefined") {
      return;
    }

    setStoredProjectContext({
      shareSlug,
      projectId: project.project_id,
      workspaceId: project.workspace_id,
    });

    router.replace(`/project/${project.project_id}?share=${shareSlug}`);
  }, [projectByShareSlugQuery.data, router, shareSlug]);

  if (projectByShareSlugQuery.isError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <div className="w-full max-w-lg rounded-xl border border-rose-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-rose-700">
            Invalid shared link
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            The shared project was not found or is no longer accessible.
          </p>
          <button
            type="button"
            onClick={() => router.replace("/")}
            className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Go Home
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
          <span className="font-medium">Resolving shared project...</span>
        </div>
      </div>
    </div>
  );
}
