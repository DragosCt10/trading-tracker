import { cn } from '@/lib/utils';

const TRUSTPILOT_REVIEW_URL = 'https://www.trustpilot.com/evaluate/alpha-stats.com';
const TRUSTPILOT_GREEN = '#00B67A';

function TrustpilotStar({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className} style={style}>
      <path d="M12 2l2.9 7.1 7.6.6-5.8 5 1.8 7.4L12 18.3 5.5 22.1l1.8-7.4-5.8-5 7.6-.6L12 2z" />
    </svg>
  );
}

interface TrustpilotWidgetProps {
  className?: string;
  /** Value forwarded to data-parallax-speed when used inside a parallax section. */
  parallaxSpeed?: number | string;
}

/**
 * Custom "Review us on Trustpilot" CTA — opens Trustpilot's review-submission flow
 * for alpha-stats.com in a new tab. No iframe, no third-party script, no CSP impact.
 */
export function TrustpilotWidget({ className, parallaxSpeed }: TrustpilotWidgetProps) {
  return (
    <div
      data-parallax-speed={parallaxSpeed}
      className={cn('w-fit will-change-transform', className)}
    >
      <a
        href={TRUSTPILOT_REVIEW_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Review AlphaStats on Trustpilot"
        className="group inline-flex items-start gap-3"
      >
        {/* Left: "Review on" */}
        <span className="text-base font-bold text-white">
          Review <span className="font-normal">on</span>
        </span>

        {/* Right: stars stacked over ★ Trustpilot */}
        <div className="flex flex-col items-start gap-1">
          <div className="flex items-center gap-0.5 mt-1" aria-hidden>
            {Array.from({ length: 5 }).map((_, i) => (
              <span
                key={i}
                className="flex h-4 w-4 items-center justify-center rounded-[2px]"
                style={{ backgroundColor: TRUSTPILOT_GREEN }}
              >
                <TrustpilotStar className="h-3 w-3 text-white" />
              </span>
            ))}
          </div>
          <span className="inline-flex items-center gap-1.5">
            <TrustpilotStar className="h-4 w-4" style={{ color: TRUSTPILOT_GREEN }} />
            <span className="font-semibold text-white tracking-tight">Trustpilot</span>
          </span>
        </div>
      </a>
    </div>
  );
}
