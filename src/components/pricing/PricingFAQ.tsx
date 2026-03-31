'use client';

import { useState } from 'react';
import { ChevronDown, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const FAQS = [
  {
    question: 'What exactly can I track with Alpha Stats?',
    answer:
      'You can track every trade in detail. You see metrics like win rate, risk to reward, drawdown, profit factor, and overall performance. You get a clear view of what actually works in your trading.',
  },
  {
    question: 'How is this different from a basic trading journal?',
    answer:
      'Alpha Stats goes beyond simple logging. It turns your data into actionable statistics. You see patterns, strengths, and weaknesses based on your own performance.',
  },
  {
    question: 'Do I need broker integration to use the platform?',
    answer:
      'No. You can manually log your trades in seconds. You stay in full control of your data without relying on broker connections.',
  },
  {
    question: 'Can this actually help me improve my trading?',
    answer:
      'Yes, if you use the data consistently. Traders who track and review their performance make better decisions. You can identify what strategies work and eliminate what does not.',
  },
  {
    question: 'What happens if I cancel my subscription?',
    answer:
      'You keep access to paid features until the end of your billing period. After that, your account automatically switches to the free plan. Your data remains safe and accessible.',
  },
  {
    question: 'Is my trading data private?',
    answer:
      'Yes. Your data is private and securely stored. We do not sell or share your personal trading information.',
  },
  {
    question: 'Can I export my data?',
    answer:
      'Yes. You can export your data at any time for external analysis or backup.',
  },
  {
    question: 'Is Alpha Stats suitable for beginners?',
    answer:
      'Yes. The platform is simple to use, even if you are just starting. At the same time, it provides advanced statistics as you progress.',
  },
  {
    question: 'What do I get with the free plan?',
    answer:
      'You get access to core features so you can understand how the platform works and start tracking your performance.',
  },
  {
    question: 'What do I unlock with the paid plan?',
    answer:
      'You unlock advanced statistics, deeper performance insights, and tools designed to help you make more informed trading decisions.',
  },
];

interface FAQItemProps {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
  index: number;
}

function FAQItem({ question, answer, isOpen, onToggle }: FAQItemProps) {
  return (
    <div
      className="group rounded-xl border border-border/40 bg-transparent transition-colors duration-200 hover:border-border/60"
    >
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

      {/* Collapsible answer — CSS grid-rows trick, no JS height calc */}
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

interface PricingFAQProps {
  className?: string;
}

export function PricingFAQ({ className }: PricingFAQProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  function toggle(index: number) {
    setOpenIndex((prev) => (prev === index ? null : index));
  }

  return (
    <section className={cn('relative mx-auto w-full max-w-3xl px-4 pb-16 sm:pb-24', className)}>

      {/* Section header */}
      <div className="mb-10 text-center sm:mb-12">
        <div className="mb-3 inline-flex items-center gap-2.5 rounded-full border border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-md shadow-slate-200/50 dark:shadow-none px-4 py-1.5 backdrop-blur-sm">
          <span
            className="h-1.5 w-1.5 rounded-full animate-pulse flex-shrink-0"
            style={{ backgroundColor: 'var(--tc-primary)' }}
          />
          <span className="text-sm text-muted-foreground">
            FAQ
          </span>
        </div>
        <h2 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
          Frequently asked questions
        </h2>
        <p className="mt-3 text-sm text-muted-foreground sm:text-base">
          Everything you need to know about Alpha Stats.
        </p>
      </div>

      {/* Accordion list */}
      <div className="space-y-2.5">
        {FAQS.map((faq, index) => (
          <FAQItem
            key={index}
            index={index}
            question={faq.question}
            answer={faq.answer}
            isOpen={openIndex === index}
            onToggle={() => toggle(index)}
          />
        ))}
      </div>

      {/* Still have questions CTA */}
      <div className="mt-10 sm:mt-12">
        <div
          className="rounded-2xl border border-border/40 bg-transparent p-8 text-center sm:p-10"
        >

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
              Our team is ready to help. Reach out and we will get back to you as soon as possible.
            </p>

            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="mailto:support@alphastats.io">
                <Button
                  size="default"
                  className="relative cursor-pointer overflow-hidden min-w-[160px] rounded-lg text-white font-semibold border-0 shadow-lg hover:shadow-xl transition-all duration-300 group"
                  style={{
                    background: 'linear-gradient(to right, var(--tc-primary), var(--tc-accent), var(--tc-accent-end))',
                    boxShadow: '0 10px 15px -3px color-mix(in oklab, var(--tc-primary) 30%, transparent), 0 4px 6px -4px color-mix(in oklab, var(--tc-primary) 20%, transparent)',
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
    </section>
  );
}
