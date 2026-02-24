// components/shared/Logo.tsx
// Colors follow --tc-primary / --tc-accent / --tc-accent-end CSS variables,
// so the logo automatically adapts to both the active color theme and dark/light mode.
interface LogoProps {
  width?: number;
  height?: number;
  className?: string;
}

export default function Logo({ width = 512, height = 512, className, ...props }: LogoProps & React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="bar1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   style={{ stopColor: 'var(--tc-primary)', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: 'var(--tc-accent)',  stopOpacity: 1 }} />
        </linearGradient>

        <linearGradient id="bar2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   style={{ stopColor: 'var(--tc-accent)',     stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: 'var(--tc-accent-end)', stopOpacity: 1 }} />
        </linearGradient>

        <linearGradient id="bar3" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   style={{ stopColor: 'var(--tc-primary)',    stopOpacity: 0.9 }} />
          <stop offset="50%"  style={{ stopColor: 'var(--tc-accent)',     stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: 'var(--tc-accent-end)', stopOpacity: 1 }} />
        </linearGradient>

        <filter id="glow">
          <feGaussianBlur stdDeviation="4" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Trading Chart Bars with glow */}
      <g filter="url(#glow)">
        <rect x="130" y="280" width="80" height="140" rx="25" fill="url(#bar1)" />
        <rect x="220" y="200" width="80" height="220" rx="25" fill="url(#bar2)" />
        <rect x="310" y="130" width="80" height="290" rx="25" fill="url(#bar3)" />
      </g>

      {/* Subtle shine on bars */}
      <rect x="130" y="280" width="80" height="60"  rx="25" fill="white" opacity="0.15" />
      <rect x="220" y="200" width="80" height="80"  rx="25" fill="white" opacity="0.15" />
      <rect x="310" y="130" width="80" height="100" rx="25" fill="white" opacity="0.15" />

      {/* Trend line accent */}
      <path
        d="M 150 320 L 170 300 L 190 310 L 220 280 L 260 260 L 290 240 L 320 200 L 350 170 L 380 160"
        style={{ stroke: 'var(--tc-primary)' }}
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.3"
      />
    </svg>
  );
}
