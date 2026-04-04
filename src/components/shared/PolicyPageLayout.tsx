import { PublicPageShell } from '@/components/shared/PublicPageShell';

interface PolicySection {
  readonly title: string;
  readonly content: React.ReactNode;
}

interface PolicyPageLayoutProps {
  title: string;
  lastUpdated: string;
  sections: readonly PolicySection[];
}

/**
 * Shared layout for policy pages (privacy, terms, refund).
 * Renders title, date, accent divider, and iterable sections.
 */
export function PolicyPageLayout({ title, lastUpdated, sections }: PolicyPageLayoutProps) {
  return (
    <PublicPageShell>
      <main className="relative mx-auto max-w-3xl px-4 sm:px-6 pt-32 sm:pt-40 pb-16 sm:pb-24">
        <h1 className="text-3xl sm:text-4xl font-medium tracking-[-0.03em] text-white">
          {title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: {lastUpdated}</p>

        {/* Divider with theme accent */}
        <div className="mt-6 mb-10 h-px w-full overflow-hidden">
          <div
            className="h-full w-full"
            style={{
              background: 'linear-gradient(90deg, var(--tc-primary), transparent 80%)',
              opacity: 0.3,
            }}
          />
        </div>

        {/* Sections */}
        <div className="space-y-10">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-lg font-semibold text-white/90 mb-3">
                {section.title}
              </h2>
              <div className="text-[15px] leading-relaxed text-muted-foreground">
                {section.content}
              </div>
            </section>
          ))}
        </div>
      </main>
    </PublicPageShell>
  );
}
