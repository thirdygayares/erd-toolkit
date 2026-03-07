"use client";

import { AlertCircle, ArrowRight, BriefcaseBusiness } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface GuestClaimDialogProps {
  isPending: boolean;
  workspaceId: string;
  errorMessage: string | null;
  onClaim: () => void;
  onSkip: () => void;
}

export function GuestClaimDialog({
  isPending,
  workspaceId,
  errorMessage,
  onClaim,
  onSkip,
}: GuestClaimDialogProps) {
  return (
    <Card className="w-full max-w-2xl border-amber-200/70 bg-white/95">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-amber-100 p-3 text-amber-700">
            <BriefcaseBusiness className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>Claim This Guest Workspace</CardTitle>
            <CardDescription>
              Move your current guest project under your authenticated account
              without losing the diagram you already started.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-2xl border border-border/70 bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Workspace ID:{" "}
          <span className="font-mono text-foreground">{workspaceId}</span>
        </div>

        {errorMessage ? (
          <Alert className="border-rose-200 bg-rose-50 text-rose-900">
            <AlertTitle className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Claim failed
            </AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button className="flex-1" disabled={isPending} onClick={onClaim}>
            {isPending ? "Claiming workspace..." : "Claim Workspace"}
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            className="flex-1"
            disabled={isPending}
            onClick={onSkip}
            variant="outline"
          >
            Skip For Now
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
