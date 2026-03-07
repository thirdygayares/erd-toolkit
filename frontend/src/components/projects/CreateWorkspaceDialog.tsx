"use client";

import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Loader2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateWorkspaceMutation } from "@/hooks/workspace/useCreateWorkspaceMutation";
import { queryKeys } from "@/lib/queryKeys";

interface CreateWorkspaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateWorkspaceDialog({
  open,
  onOpenChange,
}: CreateWorkspaceDialogProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const createWorkspaceMutation = useCreateWorkspaceMutation();

  if (!open) {
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      return;
    }

    createWorkspaceMutation.mutate(
      {
        name: name.trim(),
        workspace_mode: "personal",
      },
      {
        onSuccess: () => {
          setName("");
          onOpenChange(false);
          queryClient.invalidateQueries({
            queryKey: queryKeys.workspace.list(),
          });
        },
      },
    );
  };

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
      role="dialog"
    >
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create New Workspace</CardTitle>
          <p className="text-sm text-muted-foreground">
            Create a new workspace to organize your projects.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="workspace-name">Workspace Name</Label>
              <Input
                id="workspace-name"
                placeholder="e.g., My Company"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={createWorkspaceMutation.isPending}
                required
              />
            </div>

            {createWorkspaceMutation.isError && (
              <div className="flex gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <div>Failed to create workspace. Please try again.</div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createWorkspaceMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!name.trim() || createWorkspaceMutation.isPending}
                className="gap-2"
              >
                {createWorkspaceMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Create Workspace
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
