'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  ChevronDown,
  Rocket,
  BookOpen,
  BarChart3,
  CreditCard,
  Shield,
  Wrench,
  MessageCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { PricingHeroBackground } from '@/components/pricing/PricingHeroBackground';
import { Footer } from '@/components/shared/Footer';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSection {
  id: string;
  title: string;
  icon: LucideIcon;
  items: FAQItem[];
}

const FAQ_SECTIONS: FAQSection[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: Rocket,
    items: [
      {
        question: 'How do I create an account?',
        answer:
          'Go to the signup page, enter your email and password, then confirm your account. You can start using the free plan immediately.',
      },
      {
        question: 'How do I set up my account?',
        answer:
          'After login, go to your dashboard. Set your account preferences, currency, and trading style. This helps you track data correctly from the start.',
      },
    ],
  },
  {
    id: 'trading-journal',
    title: 'Trading Journal',
    icon: BookOpen,
    items: [
      {
        question: 'How do I add a trade?',
        answer:
          'Go to the Analytics section and open your main strategy card. On the left side of the page, click the "New Trade" button. Enter your trade details, then save. Your statistics update automatically.',
      },
      {
        question: 'Can I edit or delete a trade?',
        answer:
          'Yes. Open the strategy where the trade is stored, then go to My Trades. Switch to table view, find your trade, and click View Details. From there you can edit or delete it. Your stats will update instantly.',
      },
      {
        question: 'Where are my trades stored?',
        answer:
          'All trades are linked to your strategy. Each strategy has its own trade history and statistics.',
      },
      {
        question: 'Can I add notes or screenshots to a trade?',
        answer:
          'Yes. When you create or edit a trade, you can add notes and upload screenshots. This helps you review your decisions later.',
      },
      {
        question: 'How can I move my trades?',
        answer:
          'Go to My Trades, switch to table view, and select the trades you want to move. Then press the Move Trade button to transfer them to a different stats board under the same account.',
      },
      {
        question: "Why don't I see my trade in statistics?",
        answer:
          'Make sure you added the trade inside the correct strategy. Check that all fields are filled correctly and the trade is saved.',
      },
    ],
  },
  {
    id: 'statistics-analytics',
    title: 'Statistics and Analytics',
    icon: BarChart3,
    items: [
      {
        question: 'How are my stats calculated?',
        answer:
          'All statistics are derived from your trade history using proven mathematical formulas. The platform processes your data automatically and presents key performance metrics so you can focus on improving your trading.',
      },
      {
        question: 'How do I interpret my stats?',
        answer:
          'Focus on the bigger picture rather than individual trades. Your statistics work together to tell a story about your trading performance over time. Look for patterns across different metrics and time periods. Consistency matters more than any single number. If your overall trends are improving, your strategy is heading in the right direction.',
      },
      {
        question: 'Why are my stats not updating?',
        answer:
          'Check if your trades are saved correctly. Refresh the page. If the issue continues, contact support.',
      },
    ],
  },
  {
    id: 'account-subscription',
    title: 'Account and Subscription',
    icon: CreditCard,
    items: [
      {
        question: 'How do I upgrade to a paid plan?',
        answer:
          'Go to the pricing page and select your plan. Complete the payment through Polar.',
      },
      {
        question: 'How do I cancel my subscription?',
        answer:
          'Go to account settings, then billing. Click cancel subscription. You keep paid features until the end of your billing period. After that, your account moves to the Starter plan which you can use forever with limited features.',
      },
      {
        question: 'What happens after I cancel?',
        answer:
          'Your account switches to the Starter plan. Your data remains safe and accessible. You can continue using the platform forever under the Starter plan with limited features.',
      },
    ],
  },
  {
    id: 'data-privacy',
    title: 'Data and Privacy',
    icon: Shield,
    items: [
      {
        question: 'Is my data secure?',
        answer:
          'Yes. Your data is encrypted and stored securely. Access is restricted.',
      },
      {
        question: 'Can I export my data?',
        answer:
          'Yes. Go to settings and export your data anytime.',
      },
      {
        question: 'Can I delete my account?',
        answer:
          'Yes. Contact us and we will process your account deletion request.',
      },
    ],
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    icon: Wrench,
    items: [
      {
        question: "I can't log in, what should I do?",
        answer:
          'Check your credentials. Reset your password if needed. If the issue continues, contact support.',
      },
      {
        question: 'The platform is not loading properly',
        answer:
          'Refresh the page or try another browser. Disable extensions if needed.',
      },
      {
        question: 'I found a bug, what should I do?',
        answer:
          'Contact support with details and screenshots. We will investigate and fix the issue.',
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  FAQ Accordion Item                                                 */
/* ------------------------------------------------------------------ */

function FAQAccordionItem({
  question,
  answer,
  isOpen,
  onToggle,
}: {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="group rounded-xl border border-border/40 bg-transparent transition-colors duration-200 hover:border-border/60">
      <button
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-4 p-5 text-left sm:p-6"
        aria-expanded={isOpen}
      >
        <span className="text-sm font-semibold leading-snug text-foreground/80 transition-colors group-hover:text-foreground sm:text-base">
          {question}
        </span>
        <span
          className={cn(
            'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center transition-transform duration-300',
            isOpen ? 'rotate-180' : 'rotate-0'
          )}
        >
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </span>
      </button>

      <div
        className={cn(
          'grid transition-all duration-300 ease-in-out',
          isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        )}
      >
        <div className="overflow-hidden">
          <div className="border-t border-border/30 px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-[0.9375rem]">
              {answer}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Category Card                                                      */
/* ------------------------------------------------------------------ */

function CategoryCard({
  icon: Icon,
  title,
  count,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center gap-3 rounded-xl border border-border/40 bg-transparent p-6 text-center transition-colors duration-200 hover:border-border/60"
    >
      <div
        className="flex h-12 w-12 items-center justify-center rounded-xl"
        style={{
          backgroundColor: 'color-mix(in oklab, var(--tc-primary) 12%, transparent)',
        }}
      >
        <Icon
          className="h-5 w-5"
          style={{ color: 'var(--tc-primary)' }}
        />
      </div>
      <span className="text-sm font-semibold text-foreground/80 group-hover:text-foreground">
        {title}
      </span>
      <span className="text-xs text-muted-foreground">
        {count} {count === 1 ? 'question' : 'questions'}
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Help Center Client                                                 */
/* ------------------------------------------------------------------ */

export function HelpCenterClient() {
  const [searchQuery, setSearchQuery] = useState('');
  const [openKey, setOpenKey] = useState<string | null>(null);

  const isSearching = searchQuery.trim().length > 0;

  const searchResults = useMemo(() => {
    if (!isSearching) return [];
    const query = searchQuery.toLowerCase();
    const results: { sectionTitle: string; item: FAQItem }[] = [];
    for (const section of FAQ_SECTIONS) {
      for (const item of section.items) {
        if (
          item.question.toLowerCase().includes(query) ||
          item.answer.toLowerCase().includes(query)
        ) {
          results.push({ sectionTitle: section.title, item });
        }
      }
    }
    return results;
  }, [searchQuery, isSearching]);

  function scrollToSection(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }

  function toggleItem(key: string) {
    setOpenKey((prev) => (prev === key ? null : key));
  }

  return (
    <div className="landing-page-override w-full">
      <LandingHeader />

      <section className="relative overflow-clip">
        <PricingHeroBackground />

        <main className="relative mx-auto max-w-4xl px-4 sm:px-6 pt-32 sm:pt-40 pb-16 sm:pb-24">
          {/* ---- Hero ---- */}
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl font-medium tracking-[-0.03em] text-white">
              How can we help you?
            </h1>
            <p className="mt-3 text-muted-foreground">
              Search our knowledge base or browse categories below.
            </p>

            {/* Search bar */}
            <div className="relative mx-auto mt-8 max-w-xl">
              <Search className="pointer-events-none absolute left-5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setOpenKey(null);
                }}
                placeholder="Start typing your search..."
                className="h-12 rounded-xl border border-border/40 bg-transparent pl-12 pr-5 text-base text-foreground placeholder:text-muted-foreground focus-visible:ring-1"
              />
            </div>
          </div>

          {/* ---- Category Quick-Links ---- */}
          {!isSearching && (
            <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3">
              {FAQ_SECTIONS.map((section) => (
                <CategoryCard
                  key={section.id}
                  icon={section.icon}
                  title={section.title}
                  count={section.items.length}
                  onClick={() => scrollToSection(section.id)}
                />
              ))}
            </div>
          )}

          {/* ---- Search Results ---- */}
          {isSearching && (
            <div className="mt-12">
              {searchResults.length > 0 ? (
                <>
                  <p className="mb-6 text-sm text-muted-foreground">
                    {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
                  </p>
                  <div className="space-y-2.5">
                    {searchResults.map(({ sectionTitle, item }, i) => {
                      const key = `search-${i}`;
                      return (
                        <div key={key}>
                          <span className="mb-1 ml-1 block text-xs font-medium text-muted-foreground">
                            {sectionTitle}
                          </span>
                          <FAQAccordionItem
                            question={item.question}
                            answer={item.answer}
                            isOpen={openKey === key}
                            onToggle={() => toggleItem(key)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="mt-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    No results found for &ldquo;{searchQuery}&rdquo;
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Try a different search or{' '}
                    <a
                      href="mailto:support@alphastats.io"
                      className="underline underline-offset-2"
                      style={{ color: 'var(--tc-primary)' }}
                    >
                      contact support
                    </a>
                    .
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ---- FAQ Sections ---- */}
          {!isSearching && (
            <div className="mt-16 space-y-14">
              {FAQ_SECTIONS.map((section) => {
                const Icon = section.icon;
                return (
                  <div key={section.id} id={section.id} className="scroll-mt-24">
                    <div className="mb-6 flex items-center gap-3">
                      <Icon
                        className="h-5 w-5"
                        style={{ color: 'var(--tc-primary)' }}
                      />
                      <h2 className="text-lg font-semibold text-white/90">
                        {section.title}
                      </h2>
                    </div>
                    <div className="space-y-2.5">
                      {section.items.map((item, i) => {
                        const key = `${section.id}-${i}`;
                        return (
                          <FAQAccordionItem
                            key={key}
                            question={item.question}
                            answer={item.answer}
                            isOpen={openKey === key}
                            onToggle={() => toggleItem(key)}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ---- Contact CTA ---- */}
          <div className="mt-16 sm:mt-20">
            <div className="rounded-2xl border border-border/40 bg-transparent p-8 text-center sm:p-10">
              <div>
                <div className="mx-auto mb-4 inline-flex items-center gap-2.5 rounded-full border border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-md shadow-slate-200/50 dark:shadow-none px-4 py-1.5 backdrop-blur-sm">
                  <MessageCircle
                    className="h-4 w-4"
                    style={{ color: 'var(--tc-primary)' }}
                  />
                </div>

                <h3 className="mb-2 text-lg font-semibold sm:text-xl">
                  Still have questions?
                </h3>
                <p className="mb-6 text-sm text-muted-foreground sm:text-base">
                  Our team is ready to help. Reach out and we will get back to you
                  as soon as possible.
                </p>

                <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Link href="mailto:support@alphastats.io">
                    <Button
                      size="default"
                      className="relative cursor-pointer overflow-hidden min-w-[160px] rounded-lg text-white font-semibold border-0 shadow-lg hover:shadow-xl transition-all duration-300 group"
                      style={{
                        background:
                          'linear-gradient(to right, var(--tc-primary), var(--tc-accent), var(--tc-accent-end))',
                        boxShadow:
                          '0 10px 15px -3px color-mix(in oklab, var(--tc-primary) 30%, transparent), 0 4px 6px -4px color-mix(in oklab, var(--tc-primary) 20%, transparent)',
                      }}
                    >
                      <span className="relative z-10 flex items-center justify-center gap-1">
                        Contact support
                      </span>
                      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700" />
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button
                      variant="outline"
                      size="default"
                      className="min-w-[140px] cursor-pointer rounded-lg"
                    >
                      Get started free
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </main>

        <div className="relative [&>footer]:bg-transparent [&>footer]:border-0 [&>footer]:mt-0">
          <Footer />
        </div>
      </section>
    </div>
  );
}
