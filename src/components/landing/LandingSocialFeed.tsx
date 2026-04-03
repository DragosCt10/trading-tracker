'use client';

import {
  PenSquare,
  ArrowUpFromLine,
  Hash,
  Lock,
  UserPlus,
  MessageCircle,
  Bell,
  Search,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { BGPattern } from '@/components/ui/bg-pattern';
import { Radar, IconContainer } from '@/components/ui/radar-effect';
import type { LucideIcon } from 'lucide-react';

/* ── Feature definitions ── */
interface Feature {
  icon: LucideIcon;
  text: string;
  color: string;
}

const ROW_1: Feature[] = [
  { icon: PenSquare, text: 'Create Posts', color: '#6366f1' },
  { icon: ArrowUpFromLine, text: 'Share Trades', color: '#f59e0b' },
  { icon: Hash, text: 'Public Channels', color: '#06b6d4' },
];

const ROW_2: Feature[] = [
  { icon: Lock, text: 'Private Channels', color: '#ec4899' },
  { icon: UserPlus, text: 'Follow Traders', color: '#10b981' },
];

const ROW_3: Feature[] = [
  { icon: MessageCircle, text: 'Comments & Replies', color: '#8b5cf6' },
  { icon: Bell, text: 'Notifications', color: '#ef4444' },
  { icon: Search, text: 'Search & Discovery', color: '#3b82f6' },
];

const ALL_FEATURES = [...ROW_1, ...ROW_2, ...ROW_3];

/* ── Mobile feature card ── */
function MobileFeatureCard({ icon: Icon, text, color }: Feature) {
  return (
    <div className="relative flex items-center gap-3 rounded-xl border border-slate-300/30 dark:border-slate-700/40 bg-slate-50/30 dark:bg-slate-800/20 backdrop-blur-sm px-4 py-3.5">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-md"
        style={{
          background: `linear-gradient(135deg, ${color}, color-mix(in oklch, ${color} 70%, black))`,
        }}
      >
        <Icon className="h-5 w-5 text-white" />
      </div>
      <span className="text-sm font-medium text-foreground">{text}</span>
    </div>
  );
}

/* ── Section ── */
export function LandingSocialFeed() {
  const sectionRef = useScrollReveal<HTMLElement>();

  return (
    <section ref={sectionRef} id="social-feed" className="relative scroll-mt-20">
      {/* Top fade bridge from AI Vision section */}
      <div className="absolute inset-x-0 top-0 h-40 pointer-events-none" aria-hidden>
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to bottom, var(--av-bridge, rgba(13,10,18,0.9)) 0%, transparent 100%)',
          }}
        />
      </div>
      <style>{`
        :root { --av-bridge: rgba(255,255,255,0.85); }
        :is(.dark) { --av-bridge: rgba(13,10,18,0.9); }
      `}</style>

      {/* Background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute top-[15%] right-1/4 w-[500px] h-[500px] orb-bg-1 rounded-full blur-3xl" />
        <div className="absolute bottom-[10%] left-1/4 w-[500px] h-[500px] orb-bg-2 rounded-full blur-3xl" />
        <BGPattern variant="dots" mask="fade-edges" size={24} fill="rgba(255,255,255,0.15)" />
      </div>

      {/* Content */}
      <div className="relative z-[2] mx-auto max-w-6xl px-4 py-24 sm:py-32">
        {/* Badge */}
        <div className="flex flex-col items-center text-center">
          <div
            className="scroll-reveal inline-flex items-center gap-2 rounded-full border border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-md shadow-slate-200/50 dark:shadow-none px-4 py-1.5 backdrop-blur-sm mb-6"
            style={{ '--reveal-delay': '0ms' } as React.CSSProperties}
          >
            <span
              className="h-1.5 w-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: 'var(--tc-accent)' }}
            />
            <span className="text-sm text-muted-foreground">Social Feed</span>
          </div>

          {/* Heading */}
          <h2
            className="scroll-reveal text-3xl sm:text-4xl lg:text-[42px] font-medium leading-[1.12] tracking-[-0.03em] bg-clip-text text-transparent max-w-2xl"
            style={{
              backgroundImage:
                'linear-gradient(to bottom, var(--foreground) 40%, var(--tc-accent))',
              '--reveal-delay': '100ms',
            } as React.CSSProperties}
          >
            Connect. Share.
            <br />
            Grow Together.
          </h2>

          {/* Description */}
          <p
            className="scroll-reveal mt-5 text-base text-muted-foreground leading-relaxed max-w-lg"
            style={{ '--reveal-delay': '200ms' } as React.CSSProperties}
          >
            Join a community of traders sharing insights, analysis, and real trades.
            Follow top performers, discuss strategies in channels, and never trade alone.
          </p>

          <Link
            href="/feed"
            className="scroll-reveal mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all duration-300 group"
            style={{
              background: 'linear-gradient(to right, var(--tc-primary), var(--tc-accent))',
              boxShadow: '0 4px 20px color-mix(in oklch, var(--tc-primary) 30%, transparent)',
              '--reveal-delay': '250ms',
            } as React.CSSProperties}
          >
            Explore Now
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
          </Link>
        </div>

        {/* ── Radar visualization (desktop) ── */}
        <div
          className="scroll-reveal hidden lg:block relative mt-10"
          style={{ '--reveal-delay': '300ms' } as React.CSSProperties}
        >
          <div className="relative flex h-[500px] w-full flex-col items-center justify-center space-y-4 overflow-hidden">
            {/* Row 1 — top (items 0, 1, 2) */}
            <div className="mx-auto w-full max-w-3xl">
              <div className="flex w-full items-center justify-between">
                {ROW_1.map((f, i) => (
                  <IconContainer
                    key={f.text}
                    text={f.text}
                    icon={f.icon}
                    color={f.color}
                    delay={i * 0.5}
                  />
                ))}
              </div>
            </div>

            {/* Row 2 — middle (items 3, 4) */}
            <div className="mx-auto w-full max-w-md">
              <div className="flex w-full items-center justify-between">
                {ROW_2.map((f, i) => (
                  <IconContainer
                    key={f.text}
                    text={f.text}
                    icon={f.icon}
                    color={f.color}
                    delay={(3 + i) * 0.5}
                  />
                ))}
              </div>
            </div>

            {/* Row 3 — bottom (items 5, 6, 7) */}
            <div className="mx-auto w-full max-w-3xl">
              <div className="flex w-full items-center justify-between">
                {ROW_3.map((f, i) => (
                  <IconContainer
                    key={f.text}
                    text={f.text}
                    icon={f.icon}
                    color={f.color}
                    delay={(5 + i) * 0.5}
                  />
                ))}
              </div>
            </div>

            {/* Radar behind the icons */}
            <Radar className="absolute -bottom-12" />

            {/* Bottom gradient line */}
            <div
              className="absolute bottom-0 z-[41] h-px w-full"
              style={{
                background:
                  'linear-gradient(to right, transparent, color-mix(in oklch, var(--tc-primary, #a855f7) 40%, transparent), transparent)',
              }}
            />
          </div>
        </div>

        {/* ── Mobile fallback grid ── */}
        <div
          className="scroll-reveal mt-10 grid grid-cols-2 gap-3 lg:hidden"
          style={{ '--reveal-delay': '300ms' } as React.CSSProperties}
        >
          {ALL_FEATURES.map((f) => (
            <MobileFeatureCard key={f.text} {...f} />
          ))}
        </div>
      </div>
    </section>
  );
}
