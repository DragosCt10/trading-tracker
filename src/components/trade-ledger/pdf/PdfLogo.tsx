import { Svg, Path, Defs, LinearGradient, Stop } from '@react-pdf/renderer';
import { pdfColors } from './pdfStyles';

interface PdfLogoProps {
  size?: number;
}

// react-pdf can't read CSS vars or Tailwind classes, so we mirror the
// `Logo.tsx` shapes here and pin the brand palette from `pdfColors`.
export function PdfLogo({ size = 18 }: PdfLogoProps) {
  return (
    <Svg width={size} height={size} viewBox="140 90 720 720">
      <Defs>
        <LinearGradient
          id="pdfPurpleGrad"
          x1="163"
          y1="714"
          x2="831"
          y2="270"
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0%" stopColor={pdfColors.accent} />
          <Stop offset="100%" stopColor={pdfColors.accentEnd} />
        </LinearGradient>
      </Defs>
      <Path
        d="M 219 656.5 L 498 172.5 L 608.5 369 L 545 429.5 L 496 345.5 L 383.5 546 L 335 582.5 Z"
        fill={pdfColors.ink}
      />
      <Path
        d="M 163 713.5 L 157.5 713 L 242 672.5 L 366 597.5 L 463 528.5 L 533 471.5 L 617.5 390 L 667.5 333 L 633 300.5 L 789.5 270 L 763 424.5 L 730 388.5 L 673 447.5 L 611 501.5 L 549 547.5 L 473 596.5 L 413 629.5 L 314 672.5 L 232 698.5 Z"
        fill="url(#pdfPurpleGrad)"
      />
      <Path
        d="M 831 707.5 L 341.5 707 L 448 658.5 L 530 611.5 L 637 611.5 L 599.5 543 L 690 472.5 Z"
        fill="url(#pdfPurpleGrad)"
      />
    </Svg>
  );
}
