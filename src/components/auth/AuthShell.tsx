import type { ReactNode } from 'react';
import Logo from '@/components/shared/Logo';
import { ThemeControls } from './ThemeControls';

const NOISE_SVG =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")";

type Props = {
  title: string;
  subtitle: ReactNode;
  /**
   * Content rendered inside the shell under the title/subtitle.
   * Typically a form or a banner sequence + form.
   */
  children: ReactNode;
};

/**
 * Shared chrome for every (auth-app) page: noise background, theme controls,
 * min-h-screen wrapper, content container with top accent line, logo block
 * with glow, and title/subtitle. Content (form + banners) passed as children.
 *
 * Previously this chrome was copy-pasted across 4 files (~1,370 LoC).
 */
export function AuthShell({ title, subtitle, children }: Props) {
  return (
    <div className="min-h-screen relative overflow-hidden flex items-start justify-center px-4 pb-4 pt-16 transition-colors duration-500">
      {/* Noise texture overlay (data-URI, single copy) */}
      <div
        className="absolute inset-0 opacity-[0.015] dark:opacity-0 mix-blend-overlay pointer-events-none"
        style={{ backgroundImage: NOISE_SVG, backgroundRepeat: 'repeat' }}
        aria-hidden="true"
      />

      <ThemeControls />

      <div className="relative z-10 w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-1000">
        {/* Top accent gradient line — theme-aware */}
        <div
          className="absolute -top-2.5 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[var(--tc-primary)] to-transparent opacity-50"
          aria-hidden="true"
        />

        <div className="relative">
          {/* Header: logo + title + subtitle */}
          <div className="flex flex-col items-center space-y-6 my-10">
            <div className="relative group">
              <div
                className="absolute -inset-3 rounded-2xl opacity-75 blur-xl group-hover:opacity-100 transition duration-500"
                style={{
                  background:
                    'linear-gradient(to right, var(--tc-primary), var(--tc-accent), var(--tc-accent-end))',
                  opacity: 0.2,
                }}
                aria-hidden="true"
              />
              <div className="relative grid h-20 w-20 place-content-center rounded-xl bg-muted/50 border border-border backdrop-blur-sm shadow-2xl">
                <Logo width={64} height={64} className="mt-2" />
              </div>
            </div>

            <div className="text-center space-y-2">
              <h1 className="text-4xl font-bold text-foreground animate-in fade-in slide-in-from-top-2 duration-700 delay-150">
                {title}
              </h1>
              <div className="text-sm text-muted-foreground font-medium animate-in fade-in slide-in-from-top-2 duration-700 delay-300">
                {subtitle}
              </div>
            </div>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
