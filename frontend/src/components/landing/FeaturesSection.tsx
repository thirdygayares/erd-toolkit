import Image from "next/image";

interface FeatureBlock {
  title: string;
  description: string;
  bullets: string[];
  image: string;
  imageAlt: string;
  imageWidth: number;
  imageHeight: number;
  caption: string;
}

const features: FeatureBlock[] = [
  {
    title: "Flexible by design: ERD view and Data Dictionary view",
    description:
      "Different stages of planning need different levels of detail. ERD view helps you understand the structure quickly. Data Dictionary view helps you review fields, types, constraints, and definitions. ERD Toolkit supports both, so the workflow stays useful from high-level thinking to implementation detail.",
    bullets: [
      "ERD view for structure and relationships",
      "Data Dictionary view for field-level detail",
      "Better for both planning and documentation",
      "Useful for solo builders and team handoff",
    ],
    image: "/image/data_disctionary_showcase.png",
    imageAlt: "Data Dictionary view showing field-level details",
    imageWidth: 1698,
    imageHeight: 953,
    caption:
      "Move from architecture-level thinking into field-level clarity without breaking the workflow.",
  },
  {
    title: "Build tables as fast as your ideas move",
    description:
      "Schema planning should feel flexible while the model is still evolving. You should be able to add tables, revise names, and refine structure without slowing down the thinking process.",
    bullets: [
      "Quickly add and revise tables",
      "Evolve the model while planning is still in motion",
      "Keep schema work lightweight enough for early-stage thinking",
    ],
    image: "/image/flexible_adding_table.png",
    imageAlt: "Adding a new table in the ERD canvas",
    imageWidth: 914,
    imageHeight: 484,
    caption:
      "Add, revise, and shape tables while the schema is still taking form.",
  },
  {
    title: "Define relationships before they become bugs",
    description:
      "Relationships are where a lot of database confusion starts. If the connection between entities is unclear, implementation gets harder and feature logic becomes more fragile. Modeling relationships early helps the system stay understandable as it grows.",
    bullets: [
      "Clarify entity connections early",
      "Make foreign key thinking more explicit",
      "Reduce broken assumptions between tables",
      "Support cleaner backend and API design later",
    ],
    image: "/image/new_relationship_showcase.png",
    imageAlt: "Creating a relationship between tables",
    imageWidth: 677,
    imageHeight: 382,
    caption:
      "Connect entities with intention instead of discovering structural problems too late.",
  },
  {
    title: "Move from planning to SQL with less friction",
    description:
      "Planning becomes more powerful when it can move closer to implementation. ERD Toolkit bridges schema design and development through SQL export, so your planning work moves into engineering execution instead of staying trapped in static diagrams.",
    bullets: [
      "Turn schema structure into development-ready output",
      "Reduce translation work between planning and coding",
      "Keep database intent visible during implementation",
      "Support smoother backend handoff",
    ],
    image: "/image/export_sql_showcase.png",
    imageAlt: "SQL export output from ERD Toolkit",
    imageWidth: 716,
    imageHeight: 562,
    caption: "A clearer path from schema design to development output.",
  },
];

export function FeaturesSection() {
  return (
    <section
      className="bg-gradient-to-b from-slate-50/80 to-white px-4 py-20 sm:px-6 sm:py-28"
      id="features"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Everything you need to plan the schema clearly
          </h2>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">
            From visual structure to field-level documentation to SQL export,
            ERD Toolkit supports the full schema planning workflow.
          </p>
        </div>

        <div className="mt-20 space-y-24 lg:space-y-32">
          {features.map((feature, index) => {
            const isReversed = index % 2 === 1;
            return (
              <div
                className={`grid items-center gap-10 lg:grid-cols-2 lg:gap-16 ${isReversed ? "lg:direction-rtl" : ""}`}
                key={feature.title}
              >
                <div className={isReversed ? "lg:order-2" : ""}>
                  <h3 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                    {feature.title}
                  </h3>
                  <p className="mt-4 text-base leading-7 text-muted-foreground">
                    {feature.description}
                  </p>
                  <ul className="mt-6 space-y-3">
                    {feature.bullets.map((bullet) => (
                      <li
                        className="flex items-start gap-3 text-sm text-muted-foreground"
                        key={bullet}
                      >
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                        {bullet}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className={isReversed ? "lg:order-1" : ""}>
                  <div className="overflow-hidden rounded-2xl border border-border/40 bg-white shadow-xl shadow-slate-900/5">
                    <Image
                      alt={feature.imageAlt}
                      className="w-full"
                      height={feature.imageHeight}
                      src={feature.image}
                      width={feature.imageWidth}
                    />
                  </div>
                  <p className="mt-3 text-center text-xs text-muted-foreground/70">
                    {feature.caption}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
