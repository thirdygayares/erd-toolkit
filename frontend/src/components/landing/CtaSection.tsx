"use client";

import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CtaSectionProps {
  onGuestClick: () => void;
  onWorkspaceClick: () => void;
  isAuthenticated: boolean;
}

export function CtaSection({
  onGuestClick,
  onWorkspaceClick,
  isAuthenticated,
}: CtaSectionProps) {
  return (
    <section className="bg-gradient-to-b from-white to-slate-50 px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-4xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
          Start with the structure before the complexity starts
        </h2>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
          Whether you are sketching an early idea or preparing a more serious
          system, ERD Toolkit helps you think through the database before
          implementation pressure takes over.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-4">
          {isAuthenticated ? (
            <Button onClick={onWorkspaceClick} size="lg">
              Workspace
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <>
              <Button onClick={onGuestClick} size="lg">
                Start as Guest
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button onClick={onWorkspaceClick} size="lg" variant="outline">
                Create Private Workspace
              </Button>
            </>
          )}
        </div>

        <p className="mt-8 text-sm text-muted-foreground/70">
          Plan visually. Document clearly. Build with fewer schema surprises.
        </p>
      </div>
    </section>
  );
}
