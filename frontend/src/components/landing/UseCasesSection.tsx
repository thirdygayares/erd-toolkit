import { Code2, Laptop, Puzzle, Users } from "lucide-react";

const useCases = [
  {
    icon: Laptop,
    title: "Solo builders",
    description:
      "Plan the database clearly before building the rest of the app alone.",
    accent: "text-amber-500",
  },
  {
    icon: Users,
    title: "Startup teams",
    description:
      "Align early on the structure of the product before backend complexity increases.",
    accent: "text-sky-500",
  },
  {
    icon: Code2,
    title: "Full-stack developers",
    description:
      "Reduce schema guesswork and use the database model as a stronger reference during implementation.",
    accent: "text-emerald-500",
  },
  {
    icon: Puzzle,
    title: "Product and engineering teams",
    description:
      "Use a shared schema workspace to discuss structure more clearly before features are deeply built.",
    accent: "text-violet-500",
  },
];

export function UseCasesSection() {
  return (
    <section
      className="bg-gradient-to-b from-slate-50/60 to-white px-4 py-20 sm:px-6 sm:py-28"
      id="use-cases"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Who this is for
          </h2>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">
            Whether you work alone or with a team, ERD Toolkit supports a
            cleaner path from database thinking to implementation.
          </p>
        </div>

        <div className="mx-auto mt-16 grid max-w-5xl gap-6 sm:grid-cols-2">
          {useCases.map((useCase) => (
            <div
              className="rounded-2xl border border-border/50 bg-white p-7 transition-shadow hover:shadow-lg"
              key={useCase.title}
            >
              <useCase.icon className={`h-7 w-7 ${useCase.accent}`} />
              <h3 className="mt-4 text-lg font-semibold text-foreground">
                {useCase.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {useCase.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
