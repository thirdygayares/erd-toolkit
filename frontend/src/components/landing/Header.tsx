"use client";

import { Database, Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface HeaderProps {
  isAuthenticated: boolean;
  onGuestClick: () => void;
  onWorkspaceClick: () => void;
}

const navLinks = [
  { label: "Why Data First", href: "#why" },
  { label: "Features", href: "#features" },
  { label: "Workflow", href: "#workflow" },
  { label: "Use Cases", href: "#use-cases" },
];

export function Header({
  isAuthenticated,
  onGuestClick,
  onWorkspaceClick,
}: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-white/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link className="flex items-center gap-2.5 text-foreground" href="/">
          <Database className="h-5 w-5 text-amber-500" />
          <span className="text-lg font-semibold tracking-tight">
            ERD Toolkit
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <a
              className="rounded-full px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              href={link.href}
              key={link.href}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {isAuthenticated ? (
            <Button onClick={onWorkspaceClick} size="sm">
              Workspace
            </Button>
          ) : (
            <>
              <Button onClick={onGuestClick} size="sm" variant="ghost">
                Continue as Guest
              </Button>
              <Button onClick={onWorkspaceClick} size="sm">
                Create Workspace
              </Button>
            </>
          )}
        </div>

        <button
          className="rounded-lg p-2 text-muted-foreground hover:text-foreground md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          type="button"
        >
          {mobileOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </div>

      <div
        className={cn(
          "overflow-hidden border-t border-border/40 bg-white/95 backdrop-blur-lg transition-all duration-200 md:hidden",
          mobileOpen ? "max-h-80" : "max-h-0 border-t-0",
        )}
      >
        <div className="space-y-1 px-4 py-3">
          {navLinks.map((link) => (
            <a
              className="block rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground"
              href={link.href}
              key={link.href}
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <div className="space-y-2 pt-3">
            {isAuthenticated ? (
              <Button
                className="w-full"
                onClick={() => {
                  setMobileOpen(false);
                  onWorkspaceClick();
                }}
              >
                Workspace
              </Button>
            ) : (
              <>
                <Button
                  className="w-full"
                  onClick={() => {
                    setMobileOpen(false);
                    onGuestClick();
                  }}
                  variant="outline"
                >
                  Continue as Guest
                </Button>
                <Button
                  className="w-full"
                  onClick={() => {
                    setMobileOpen(false);
                    onWorkspaceClick();
                  }}
                >
                  Create Workspace
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
