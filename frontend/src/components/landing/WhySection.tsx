import { AlertTriangle, GitBranch, Layers, Lightbulb } from "lucide-react";

const reasons = [
  {
    icon: AlertTriangle,
    title: "Reduce schema guesswork",
    description:
      "When the data model is unclear, developers spend more time guessing relationships, patching logic, and revising features.",
    accent: "text-amber-500",
  },
  {
    icon: GitBranch,
    title: "Clarify relationships earlier",
    description:
      "Weak or missing relationships create problems that spread into API design, backend logic, and frontend assumptions.",
    accent: "text-sky-500",
  },
  {
    icon: Layers,
    title: "Make backend decisions easier",
    description:
      "A visible schema plan helps the team reason about the system structure before implementation pressure takes over.",
    accent: "text-emerald-500",
  },
  {
    icon: Lightbulb,
    title: "Support cleaner feature planning",
    description:
      "Better data decisions early create smoother implementation later. The schema should guide the system, not chase it.",
    accent: "text-violet-500",
  },
];

export function WhySection() {
  return (
    <section className="bg-white px-4 py-20 sm:px-6 sm:py-28" id="why">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Why architecting data first matters
          </h2>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">
            Many development problems do not start in the UI. They start in
            unclear tables, weak relationships, and poorly defined fields. When
            the structure is wrong, the rest of the build becomes harder to
            reason about.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {reasons.map((reason) => (
            <div
              className="rounded-2xl border border-border/50 bg-gradient-to-b from-white to-slate-50/50 p-6 transition-shadow hover:shadow-lg"
              key={reason.title}
            >
              <reason.icon className={`h-6 w-6 ${reason.accent}`} />
              <h3 className="mt-4 text-base font-semibold text-foreground">
                {reason.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {reason.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-16 max-w-2xl rounded-2xl border border-amber-200/60 bg-amber-50/40 px-8 py-6 text-center">
          <p className="text-base font-medium italic text-foreground/80">
            &ldquo;The goal is simple: make the database easier to think through
            before the rest of the application becomes harder to change.&rdquo;
          </p>
        </div>
      </div>
    </section>
  );
}
