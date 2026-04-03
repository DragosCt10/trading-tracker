'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';

// --- Types ---
interface Testimonial {
  text: string;
  image: string;
  name: string;
  role: string;
}

// --- Data ---
const testimonials: Testimonial[] = [
  {
    text: 'The AI insights completely changed how I review my trades. It spotted a recurring mistake in my entries that I never would have caught on my own.',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150&h=150',
    name: 'Sarah Kowalski',
    role: 'Futures Trader',
  },
  {
    text: 'Custom stats helped me find my real edge. I discovered my win rate spikes during London session opens — now I plan my week around it.',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150&h=150',
    name: 'Marcus Torres',
    role: 'Swing Trader',
  },
  {
    text: 'The Monte Carlo simulator gave me the confidence to go for a funded account. Seeing hundreds of possible outcomes made my risk plan bulletproof.',
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=150&h=150',
    name: 'Elena Reyes',
    role: 'Prop Firm Trader',
  },
  {
    text: 'Journaling every trade used to feel like a chore. Now the daily journal is the first thing I open — it keeps me disciplined and accountable.',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150&h=150',
    name: 'James Park',
    role: 'Options Trader',
  },
  {
    text: 'The equity curve tracking keeps me motivated on drawdown days. Seeing the bigger picture reminds me my edge is real.',
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150&h=150',
    name: 'Diana Liu',
    role: 'Forex Trader',
  },
  {
    text: 'Pattern detection flagged that I was over-trading on Fridays. One small adjustment and my monthly P&L jumped significantly.',
    image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=150&h=150',
    name: 'Raj Mehta',
    role: 'Crypto Trader',
  },
  {
    text: 'The social feed is a goldmine. Following experienced traders and seeing their setups gave me ideas I never considered before.',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150&h=150',
    name: 'Farhan Siddiqui',
    role: 'Day Trader',
  },
  {
    text: 'Being able to filter stats by setup type, session, and market revealed exactly where I make money — and where I bleed it.',
    image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150&h=150',
    name: 'Olivia Walsh',
    role: 'Index Futures Trader',
  },
  {
    text: 'The AI health score keeps me honest. Watching it climb from 62 to 85 over three months was the best feedback loop I have ever had.',
    image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=150&h=150',
    name: 'Chen Huang',
    role: 'Commodities Trader',
  },
];

const firstColumn = testimonials.slice(0, 3);
const secondColumn = testimonials.slice(3, 6);
const thirdColumn = testimonials.slice(6, 9);

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
  return (
    <div className={className}>
      <motion.ul
        animate={{ translateY: '-50%' }}
        transition={{
          duration,
          repeat: Infinity,
          ease: 'linear',
          repeatType: 'loop',
        }}
        className="flex flex-col gap-6 pb-6 bg-transparent list-none m-0 p-0"
      >
        {[...new Array(2)].map((_, index) => (
          <React.Fragment key={index}>
            {items.map(({ text, image, name, role }, i) => (
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
                  <p className="text-muted-foreground leading-relaxed font-normal m-0 text-[15px]">
                    {text}
                  </p>
                  <footer className="flex items-center gap-3 mt-5">
                    <Image
                      width={40}
                      height={40}
                      src={image}
                      alt={`Avatar of ${name}`}
                      className="h-10 w-10 rounded-full object-cover ring-2 ring-white/10 group-hover:ring-[var(--tc-primary)]/30 transition-all duration-300 ease-in-out"
                    />
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
      </motion.ul>
    </div>
  );
}

// --- Main Section ---
export default function TestimonialsSection() {
  return (
    <div>
      <div className="flex justify-center gap-6 mt-10 [mask-image:linear-gradient(to_bottom,transparent,black_10%,black_90%,transparent)] max-h-[740px] overflow-hidden">
        <TestimonialsColumn testimonials={firstColumn} duration={15} />
        <TestimonialsColumn
          testimonials={secondColumn}
          className="hidden md:block"
          duration={19}
        />
        <TestimonialsColumn
          testimonials={thirdColumn}
          className="hidden lg:block"
          duration={17}
        />
      </div>
    </div>
  );
}
