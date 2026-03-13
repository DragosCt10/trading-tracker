// components/shared/Logo.tsx
// Theme-aware: solid fill is white in dark mode, gradients use --tc-primary / --tc-accent / --tc-accent-end.
interface LogoProps {
  width?: number;
  height?: number;
  className?: string;
}

export default function Logo({ width, height, className, ...props }: LogoProps & React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1000 1000"
      width={width}
      height={height}
      preserveAspectRatio="xMidYMid meet"
      style={{ display: 'block' }}
      className={className ?? ''}
      aria-hidden
      {...props}
    >
      <defs>
        <linearGradient id="purpleGrad" x1="163" y1="714" x2="831" y2="270" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--tc-primary)" />
          <stop offset="100%" stopColor="var(--tc-accent)" />
        </linearGradient>
      </defs>
      {/* WHITE SHAPE */}
      <path
        d="M 219 656.5 L 498 172.5 L 608.5 369 L 545 429.5 L 496 345.5 L 383.5 546 L 335 582.5 Z"
        fill="currentColor"
        className="text-[rgb(24,24,55)] dark:text-white"
      />
      {/* ARROW */}
      <path
        d="M 163 713.5 L 157.5 713 L 242 672.5 L 366 597.5 L 463 528.5 L 533 471.5 L 617.5 390 L 667.5 333 L 633 300.5 L 789.5 270 L 763 424.5 L 730 388.5 L 673 447.5 L 611 501.5 L 549 547.5 L 473 596.5 L 413 629.5 L 314 672.5 L 232 698.5 Z"
        fill="url(#purpleGrad)"
      />
      {/* TRIANGLE */}
      <path
        d="M 831 707.5 L 341.5 707 L 448 658.5 L 530 611.5 L 637 611.5 L 599.5 543 L 690 472.5 Z"
        fill="url(#purpleGrad)"
      />
    </svg>
  );
}
