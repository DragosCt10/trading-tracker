import Link from 'next/link';
import type { MouseEventHandler, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { navPillButtonClass } from '@/components/shared/navPillButtonClass';

/**
 * Navbar-style pill link without `Button variant="ghost"` so styles match exactly
 * (ghost adds hover/accent tokens that can diverge from the pill look).
 */
export function NavPillLink({
  href,
  active = false,
  className,
  children,
  onClick,
}: {
  href: string;
  active?: boolean;
  className?: string;
  children: ReactNode;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'inline-flex h-8 items-center justify-center gap-2 whitespace-nowrap px-3 text-sm font-medium transition-all',
        'outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
        '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
        navPillButtonClass(active),
        className
      )}
    >
      {children}
    </Link>
  );
}
