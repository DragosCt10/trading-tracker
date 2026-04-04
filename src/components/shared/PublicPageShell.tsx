import { LandingNavbar } from '@/components/landing/LandingNavbar';
import { PricingHeroBackground } from '@/components/pricing/PricingHeroBackground';
import { Footer } from '@/components/shared/Footer';

interface PublicPageShellProps {
  children: React.ReactNode;
}

/**
 * Shared shell for all public pages (pricing, policies, help, contact).
 * Wraps content with LandingNavbar, PricingHeroBackground, and Footer.
 */
export function PublicPageShell({ children }: PublicPageShellProps) {
  return (
    <div className="landing-page-override w-full">
      <LandingNavbar />

      <section className="relative overflow-clip">
        <PricingHeroBackground />
        {children}
        <div className="relative [&>footer]:bg-transparent [&>footer]:border-0 [&>footer]:mt-0">
          <Footer />
        </div>
      </section>
    </div>
  );
}
