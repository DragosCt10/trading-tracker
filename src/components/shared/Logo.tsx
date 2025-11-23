import React from 'react';

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  width?: number | string;
  height?: number | string;
}

const Logo: React.FC<LogoProps> = ({ width = 512, height = 512, ...props }) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 512 512"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#e5e7eb" />
        <stop offset="50%" stopColor="#d1d5db" />
        <stop offset="100%" stopColor="#9ca3af" />
      </linearGradient>
    </defs>

    {/* Rounded Square Background */}
    <rect width="512" height="512" rx="110" fill="url(#bg)" />

    {/* Bars */}
    <rect x="140" y="260" width="70" height="160" rx="20" fill="#6b7280" />
    <rect x="240" y="180" width="70" height="240" rx="20" fill="#4b5563" />
    <rect x="340" y="120" width="70" height="300" rx="20" fill="#374151" />
  </svg>
);

export default Logo;
