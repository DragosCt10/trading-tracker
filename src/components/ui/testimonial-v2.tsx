'use client';

import React, { useEffect, useRef } from 'react';
import { motion, useAnimate } from 'framer-motion';
import type { AnimationPlaybackControls } from 'framer-motion';

// --- Types ---
export interface Testimonial {
  text: string;
  /** Optional avatar URL. Not currently rendered (we use letter avatars), but kept for
   *  backwards-compat with approved reviews from the DB that still carry avatar_url. */
  image?: string;
  name: string;
  role: string;
  rating?: number;
}

/**
 * Fallback testimonials shown until enough real approved reviews exist.
 * `buildTestimonialColumns` places real approved reviews first (round-robin
 * across the 3 columns) and then pads empty slots with these. That means
 * every newly-approved review automatically bumps one fallback out of the
 * grid — no manual edits required.
 *
 * Ratings are a mix of 5★ (7) and 4★ (3). Names are a balanced mix of
 * Romanian and English.
 */
export const FALLBACK_TESTIMONIALS: Testimonial[] = [
  {
    text: "Been using it about 6 weeks. The journaling part is what actually stuck for me, usually I quit these after a week. Saw I was losing on Mondays consistently and had no clue before.",
    name: 'AndreiA21',
    role: 'Forex trader',
    rating: 5,
  },
  {
    text: "Clean, simple, does what I need. Fair price too.",
    name: 'Sarah Thompson',
    role: 'Swing trader',
    rating: 5,
  },
  {
    text: "Solid journal. Only thing I'd want is more keyboard shortcuts for logging trades, I do a lot in a session. Stats are really good though.",
    name: 'Oricum88',
    role: 'Futures trader',
    rating: 4,
  },
  {
    text: "The daily notes thing is underrated. I write one line after every session and a month later those notes tell me more than any chart.",
    name: 'Ryan W.',
    role: 'Crypto trader',
    rating: 5,
  },
  {
    text: "I like that it doesn't try to be everything at once. Trades in, stats out. Recommended it to a friend who still journals on paper.",
    name: 'Greenmornings',
    role: 'Day trader',
    rating: 5,
  },
  {
    text: "AI is hit or miss but the journal and stats alone are worth it. No complaints.",
    name: 'Harris',
    role: 'Options trader',
    rating: 4,
  },
  {
    text: "Came from a spreadsheet, not going back. Saw my RRR tank on Fridays and changed how I plan the week. Never would have spotted that on my own.",
    name: 'Alexandra Vasile',
    role: 'Forex trader',
    rating: 5,
  },
  {
    text: "Pro plan is worth it if you take this seriously. I spend most of my time in the custom stats builder, I can actually answer the questions I have about my trading instead of guessing.",
    name: 'Coffeefirst14',
    role: 'Indices trader',
    rating: 5,
  },
  {
    text: "Does what I need. Mobile could be a bit more polished but desktop runs smooth.",
    name: 'Sophiec14',
    role: 'Swing trader',
    rating: 4,
  },
  {
    text: "Not much to say. Use it every day. That's probably the best review I can give.",
    name: 'Stefan Radu',
    role: 'Day trader',
    rating: 5,
  },
];

const COLUMN_COUNT = 3;
const PER_COLUMN = 4;
export const TOTAL_DISPLAYED_TESTIMONIALS = COLUMN_COUNT * PER_COLUMN;

/**
 * Distribute approved reviews round-robin across the 3 columns so that a single
 * approved review lands in column 1, the next in column 2, the next in column 3,
 * the 4th in column 1 again, and so on. Each column is then padded with unique
 * fallback testimonials (no fallback is repeated across columns) until it holds
 * `PER_COLUMN` items.
 */
function buildTestimonialColumns(
  external: Testimonial[] | undefined,
): [Testimonial[], Testimonial[], Testimonial[]] {
  const approved = external ?? [];
  const columns: Testimonial[][] = [[], [], []];

  approved.forEach((t, i) => {
    const col = i % COLUMN_COUNT;
    if (columns[col].length < PER_COLUMN) {
      columns[col].push(t);
    }
  });

  // Pad each column with a unique slice of fallbacks so the same fallback never
  // appears in more than one column.
  let fallbackIndex = 0;
  for (const col of columns) {
    while (col.length < PER_COLUMN && fallbackIndex < FALLBACK_TESTIMONIALS.length) {
      col.push(FALLBACK_TESTIMONIALS[fallbackIndex++]);
    }
  }

  return [columns[0], columns[1], columns[2]];
}

// --- Sub-Components ---
function TestimonialsColumn({
  className,
  testimonials: items,
  duration = 10,
}: {
  className?: string;
  testimonials: Testimonial[];
  duration?: number;
}) {
  const [scope, animate] = useAnimate();
  const animation = useRef<AnimationPlaybackControls | null>(null);

  useEffect(() => {
    animation.current = animate(
      scope.current,
      { y: ['0%', '-50%'] },
      { duration, repeat: Infinity, ease: 'linear' }
    );
    return () => { animation.current?.cancel(); };
  }, [animate, scope, duration]);

  return (
    <div
      className={className}
      onMouseEnter={() => animation.current?.pause()}
      onMouseLeave={() => animation.current?.play()}
    >
      <ul
        ref={scope}
        className="flex flex-col gap-6 pb-6 bg-transparent list-none m-0 p-0"
      >
        {[...new Array(2)].map((_, index) => (
          <React.Fragment key={index}>
            {items.map(({ text, name, role, rating }, i) => (
              <motion.li
                key={`${index}-${i}`}
                aria-hidden={index === 1 ? 'true' : 'false'}
                tabIndex={index === 1 ? -1 : 0}
                whileHover={{
                  scale: 1.03,
                  y: -8,
                  transition: { type: 'spring', stiffness: 400, damping: 17 },
                }}
                className="p-7 rounded-2xl border border-white/[0.06] shadow-lg shadow-black/10 max-w-xs w-full bg-slate-800/20 backdrop-blur-sm transition-all duration-300 cursor-default select-none group focus:outline-none focus:ring-2 focus:ring-[var(--tc-primary)]/30"
              >
                <blockquote className="m-0 p-0">
                  {rating && (
                    <div className="flex items-center gap-0.5 mb-3">
                      {Array.from({ length: 5 }).map((_, s) => (
                        <span
                          key={s}
                          className={`text-[13px] leading-none ${s < rating ? 'text-amber-400' : 'text-slate-600/40'}`}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-muted-foreground leading-relaxed font-normal m-0 text-[15px]">
                    <span className="text-[var(--tc-primary)] opacity-40 text-lg font-serif leading-none mr-0.5">&ldquo;</span>
                    {text}
                    <span className="text-[var(--tc-primary)] opacity-40 text-lg font-serif leading-none ml-0.5">&rdquo;</span>
                  </p>
                  <footer className="flex items-center gap-3 mt-5">
                    <div
                      aria-label={`Avatar of ${name}`}
                      className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex items-center justify-center text-slate-600 dark:text-slate-300 font-semibold text-sm ring-2 ring-white/10 group-hover:ring-[var(--tc-primary)]/30 transition-all duration-300 ease-in-out"
                    >
                      {String(name ?? '?').slice(0, 1).toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                      <cite className="font-semibold not-italic tracking-tight leading-5 text-foreground">
                        {name}
                      </cite>
                      <span className="text-sm leading-5 tracking-tight text-muted-foreground mt-0.5">
                        {role}
                      </span>
                    </div>
                  </footer>
                </blockquote>
              </motion.li>
            ))}
          </React.Fragment>
        ))}
      </ul>
    </div>
  );
}

// --- Main Section ---
export default function TestimonialsSection({ testimonials: external }: { testimonials?: Testimonial[] }) {
  const [firstColumn, secondColumn, thirdColumn] = buildTestimonialColumns(external);

  return (
    <div>
      <div className="flex justify-center gap-6 mt-10 [mask-image:linear-gradient(to_bottom,transparent,black_10%,black_90%,transparent)] max-h-[740px] overflow-hidden">
        <TestimonialsColumn testimonials={firstColumn} duration={40} />
        <TestimonialsColumn
          testimonials={secondColumn}
          className="hidden md:block"
          duration={25}
        />
        <TestimonialsColumn
          testimonials={thirdColumn}
          className="hidden lg:block"
          duration={35}
        />
      </div>
    </div>
  );
}
