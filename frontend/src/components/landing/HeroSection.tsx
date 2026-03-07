"use client";

import { ArrowRight } from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface HeroSectionProps {
  onGuestClick: () => void;
  onWorkspaceClick: () => void;
}

export function HeroSection({
  onGuestClick,
  onWorkspaceClick,
}: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),_transparent_40%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.12),_transparent_35%)] px-4 py-20 sm:px-6 sm:py-28 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="max-w-2xl">
            <Badge className="mb-6">Database-first planning</Badge>

            <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Architect the data first before development gets expensive.
            </h1>

            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              ERD Toolkit helps you plan the structure of your system before
              implementation starts. Map tables, define relationships, review
              fields in detail, and move toward development with a clearer
              database foundation.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button onClick={onGuestClick} size="lg">
                Start Free as Guest
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button onClick={onWorkspaceClick} size="lg" variant="outline">
                Create Private Workspace
              </Button>
            </div>

            <div className="mt-8 flex flex-wrap gap-2">
              {[
                "ERD + Data Dictionary",
                "Relationship Mapping",
                "Export SQL",
                "Guest or Private",
              ].map((chip) => (
                <span
                  className="rounded-full border border-border/60 bg-white/60 px-3 py-1.5 text-xs text-muted-foreground"
                  key={chip}
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="overflow-hidden rounded-2xl border border-border/40 bg-white shadow-2xl shadow-slate-900/10">
              <Image
                alt="ERD Toolkit — visual schema editor showing tables and relationships"
                className="w-full"
                height={954}
                priority
                src="/image/erd_showcase.png"
                unoptimized
                width={1697}
              />
            </div>
            <div className="absolute -bottom-4 -right-4 -z-10 h-full w-full rounded-2xl bg-gradient-to-br from-amber-100/40 to-sky-100/40" />
          </div>
        </div>
      </div>
    </section>
  );
}
