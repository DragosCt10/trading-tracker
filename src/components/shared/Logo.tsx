// components/shared/Logo.tsx
// Vibrant trading-style logo with purple gradients
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
        {/* Vibrant bar gradients */}
        <linearGradient id="bar1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c084fc" />
          <stop offset="100%" stopColor="#a78bfa" />
        </linearGradient>
        
        <linearGradient id="bar2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
        
        <linearGradient id="bar3" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e879f9" />
          <stop offset="100%" stopColor="#d946ef" />
        </linearGradient>
        
        {/* Glow effect */}
        <filter id="glow">
          <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {/* Trading Chart Bars with glow */}
      <g filter="url(#glow)">
        {/* Short bar - Loss/Red alternative */}
        <rect x="130" y="280" width="80" height="140" rx="25" fill="url(#bar1)" />
        
        {/* Medium bar - Neutral */}
        <rect x="220" y="200" width="80" height="220" rx="25" fill="url(#bar2)" />
        
        {/* Tall bar - Profit/Growth */}
        <rect x="310" y="130" width="80" height="290" rx="25" fill="url(#bar3)" />
      </g>
      
      {/* Subtle shine effect on bars */}
      <rect x="130" y="280" width="80" height="60" rx="25" fill="white" opacity="0.15" />
      <rect x="220" y="200" width="80" height="80" rx="25" fill="white" opacity="0.15" />
      <rect x="310" y="130" width="80" height="100" rx="25" fill="white" opacity="0.15" />
      
      {/* Trend line overlay (optional accent) */}
      <path 
        d="M 150 320 L 170 300 L 190 310 L 220 280 L 260 260 L 290 240 L 320 200 L 350 170 L 380 160" 
        stroke="#c084fc" 
        strokeWidth="6" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        fill="none"
        opacity="0.3"
      />
    </svg>
  );
}