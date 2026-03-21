import { Database } from "lucide-react";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-slate-50/50 px-4 py-10 sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Database className="h-4 w-4" />
          <span className="text-sm font-medium">ERD Toolkit</span>
          <span className="text-xs text-muted-foreground/60">
            PostgreSQL-first schema planning
          </span>
        </div>
        <nav
          aria-label="Legal links"
          className="flex items-center gap-4 text-sm"
        >
          <Link
            className="text-muted-foreground transition-colors hover:text-foreground"
            href="/terms"
          >
            Terms and Conditions
          </Link>
          <Link
            className="text-muted-foreground transition-colors hover:text-foreground"
            href="/privacy"
          >
            Privacy Policy
          </Link>
        </nav>
      </div>
    </footer>
  );
}
