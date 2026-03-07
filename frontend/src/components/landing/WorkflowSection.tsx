import {
  ArrowDownRight,
  CheckCircle2,
  Eye,
  FileCode2,
  Pencil,
  Rocket,
} from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Rocket,
    title: "Start in seconds",
    description:
      "Open a guest or private workspace and begin shaping the system without a heavy setup process.",
    accent: "bg-amber-50 text-amber-600",
  },
  {
    number: "02",
    icon: Pencil,
    title: "Sketch the model visually",
    description:
      "Use ERD view to place tables, inspect relationships, and understand the structure as a connected system.",
    accent: "bg-sky-50 text-sky-600",
  },
  {
    number: "03",
    icon: ArrowDownRight,
    title: "Refine the details",
    description:
      "Switch into Data Dictionary view when you need field names, types, attributes, and clearer implementation detail.",
    accent: "bg-emerald-50 text-emerald-600",
  },
  {
    number: "04",
    icon: Eye,
    title: "Review before building",
    description:
      "Catch structural issues earlier, align the schema, and reduce the guesswork that usually appears during development.",
    accent: "bg-violet-50 text-violet-600",
  },
  {
    number: "05",
    icon: FileCode2,
    title: "Move toward implementation",
    description:
      "Use export-oriented output and documented structure as a cleaner handoff into development.",
    accent: "bg-rose-50 text-rose-600",
  },
];

export function WorkflowSection() {
  return (
    <section className="bg-white px-4 py-20 sm:px-6 sm:py-28" id="workflow">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            A practical schema workflow
          </h2>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">
            ERD Toolkit should feel useful from the first minute. Start quickly,
            shape the structure visually, add field-level detail, and move
            toward implementation.
          </p>
        </div>

        <div className="relative mt-16">
          <div className="absolute left-8 top-0 hidden h-full w-px bg-gradient-to-b from-border via-border/60 to-transparent lg:left-1/2 lg:block" />

          <div className="space-y-8 lg:space-y-12">
            {steps.map((step, index) => {
              const isLeft = index % 2 === 0;
              return (
                <div
                  className={`relative flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-0 ${isLeft ? "" : "lg:flex-row-reverse"}`}
                  key={step.number}
                >
                  <div
                    className={`flex-1 ${isLeft ? "lg:pr-16 lg:text-right" : "lg:pl-16"}`}
                  >
                    <div
                      className={`inline-flex rounded-2xl border border-border/40 bg-white p-6 shadow-sm transition-shadow hover:shadow-md ${isLeft ? "lg:ml-auto" : ""}`}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${step.accent}`}
                        >
                          <step.icon className="h-5 w-5" />
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground/60">
                            Step {step.number}
                          </p>
                          <h3 className="mt-1 text-lg font-semibold text-foreground">
                            {step.title}
                          </h3>
                          <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                            {step.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="absolute left-8 top-1/2 z-10 hidden h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-amber-400 shadow-sm lg:left-1/2 lg:block" />

                  <div className="hidden flex-1 lg:block" />
                </div>
              );
            })}
          </div>
        </div>

        <div className="mx-auto mt-20 max-w-3xl rounded-2xl border border-border/40 bg-gradient-to-r from-slate-900 to-slate-800 px-8 py-8 text-center shadow-xl">
          <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400" />
          <p className="mt-4 text-lg font-medium text-white">
            Good development starts with clear data structure.
          </p>
          <p className="mt-2 text-sm text-slate-400">
            The schema should guide the system, not chase it.
          </p>
        </div>
      </div>
    </section>
  );
}
