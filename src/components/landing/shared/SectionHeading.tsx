import { cn } from '@/lib/utils';

interface SectionHeadingProps {
  children: React.ReactNode;
  /** Extra Tailwind classes appended to the base heading style */
  className?: string;
  /** Delay for scroll-reveal animation — defaults to 100ms */
  revealDelay?: string;
  /** Gradient direction/stops — defaults to the standard section gradient */
  gradient?: string;
  /** Render as h1 instead of h2 */
  as?: 'h1' | 'h2';
}

export function SectionHeading({
  children,
  className,
  revealDelay = '100ms',
  gradient = 'linear-gradient(to bottom, var(--foreground) 40%, var(--tc-accent))',
  as: Tag = 'h2',
}: SectionHeadingProps) {
  return (
    <Tag
      className={cn(
        'scroll-reveal text-3xl sm:text-4xl lg:text-[42px] font-medium leading-[1.12] tracking-[-0.03em] bg-clip-text text-transparent',
        className,
      )}
      style={{
        backgroundImage: gradient,
        '--reveal-delay': revealDelay,
      } as React.CSSProperties}
    >
      {children}
    </Tag>
  );
}
