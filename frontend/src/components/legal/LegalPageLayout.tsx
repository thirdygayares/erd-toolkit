import Link from "next/link";

interface LegalSection {
  title: string;
  paragraphs: string[];
}

interface LegalPageLayoutProps {
  title: string;
  description: string;
  lastUpdated: string;
  sections: LegalSection[];
}

export function LegalPageLayout({
  title,
  description,
  lastUpdated,
  sections,
}: LegalPageLayoutProps) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              {title}
            </h1>
            <p className="text-sm text-slate-600 sm:text-base">{description}</p>
          </div>
          <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
            Last updated: {lastUpdated}
          </span>
        </div>

        <div className="mt-8 space-y-7">
          {sections.map((section) => (
            <section key={section.title} className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">
                {section.title}
              </h2>
              {section.paragraphs.map((paragraph, paragraphIndex) => (
                <p
                  className="text-sm leading-7 text-slate-700 sm:text-base"
                  key={`${section.title}-${paragraphIndex}`}
                >
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>

        <div className="mt-10 border-t border-slate-200 pt-6 text-sm text-slate-600">
          <p>
            Questions about these policies? Contact us through the product team
            channel.
          </p>
          <div className="mt-3 flex flex-wrap gap-4">
            <Link
              className="font-medium text-slate-800 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-600"
              href="/terms"
            >
              Terms and Conditions
            </Link>
            <Link
              className="font-medium text-slate-800 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-600"
              href="/privacy"
            >
              Privacy Policy
            </Link>
            <Link
              className="font-medium text-slate-800 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-600"
              href="/"
            >
              Back to ERD Toolkit
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
