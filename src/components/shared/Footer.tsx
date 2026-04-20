import { cn } from "@/lib/utils";
import Logo from "@/components/shared/Logo";
import Link from "next/link";

function XLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M389.2 48h70.6L305.6 224.2 487 464H345L233.7 318.6 106.5 464H35.8l164.9-188.5L26.8 48h145.6l100.5 132.9zm-24.8 373.8h39.1L151.1 88h-42L364.4 421.8z" />
    </svg>
  );
}

function InstagramLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 448 512" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9S339 319.5 339 255.9 287.7 141 224.1 141zm0 189.6c-41.1 0-74.7-33.5-74.7-74.7s33.5-74.7 74.7-74.7 74.7 33.5 74.7 74.7-33.6 74.7-74.7 74.7zm146.4-194.3c0 14.9-12 26.8-26.8 26.8-14.9 0-26.8-12-26.8-26.8s12-26.8 26.8-26.8 26.8 12 26.8 26.8zm76.1 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37-2.1-147.9-2.1-184.9 0-35.8 1.7-67.6 9.9-93.9 36.1s-34.4 58-36.2 93.9c-2.1 37-2.1 147.9 0 184.9 1.7 35.9 9.9 67.7 36.2 93.9s58 34.4 93.9 36.2c37 2.1 147.9 2.1 184.9 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37 2.1-147.8 0-184.8zM398.8 388c-7.8 19.6-22.9 34.7-42.6 42.6-29.5 11.7-99.5 9-132.1 9s-102.7 2.6-132.1-9c-19.6-7.8-34.7-22.9-42.6-42.6-11.7-29.5-9-99.5-9-132.1s-2.6-102.7 9-132.1c7.8-19.6 22.9-34.7 42.6-42.6 29.5-11.7 99.5-9 132.1-9s102.7-2.6 132.1 9c19.6 7.8 34.7 22.9 42.6 42.6 11.7 29.5 9 99.5 9 132.1s2.7 102.7-9 132.1z" />
    </svg>
  );
}

const SOCIAL_LINKS = [
  { label: "X", href: "https://x.com/AlphaStats_", Icon: XLogo },
  { label: "Instagram", href: "https://www.instagram.com/alpha.stats/", Icon: InstagramLogo },
] as const;

const YEAR = new Date().getFullYear();

const footerLinks = {
  product: [
    { label: "Pricing", href: "/pricing" },
    { label: "Features", href: "/#features" },
    { label: "Dashboard", href: "/" },
    { label: "Rewards", href: "/rewards" },
    { label: "Affiliates", href: "/affiliates" },
  ],
  feed: [
    { label: "Posts", href: "/feed" },
    { label: "Rules", href: "/feed/rules" },
  ],
  legal: [
    { label: "Privacy Policy", href: "/privacy-policy" },
    { label: "Terms of Service", href: "/terms-of-service" },
    { label: "Refund Policy", href: "/refund-policy" },
  ],
  support: [
    { label: "Help Center", href: "/help" },
    { label: "Contact", href: "/contact" },
  ],
};

const LINKABLE_HREFS = new Set(
  Object.values(footerLinks).flatMap((links) => links.map((l) => l.href))
);

function FooterLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  const linkClasses = cn(
    "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors text-sm",
    className
  );

  if (LINKABLE_HREFS.has(href)) {
    return (
      <Link href={href} className={linkClasses}>
        {children}
      </Link>
    );
  }

  return (
    <span className={cn(linkClasses, "cursor-default")}>{children}</span>
  );
}

function FooterSection({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-white">
        {title}
      </h3>
      <ul className="space-y-2">
        {links.map((item) => (
          <li key={item.href}>
            <FooterLink href={item.href}>{item.label}</FooterLink>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer({ constrained = false, spacious = false }: { constrained?: boolean; spacious?: boolean }) {
  return (
    <footer
      role="contentinfo"
      className={cn(
        "w-full mt-32 bg-transparent",
        "border-t border-slate-200 dark:border-border/40"
      )}
    >
      <div
        className={cn(
          "container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl",
          constrained && "sm:px-0 max-w-7xl"
        )}
      >
        <div className={spacious ? "py-10 sm:py-12 sm:px-10" : "py-10 sm:py-12"}>
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8 lg:gap-12">
            {/* Brand - left */}
            <div className="lg:max-w-xs">
              <Link
                href="/"
                className="inline-flex items-center text-lg font-semibold text-slate-900 dark:text-slate-50 tracking-widest hover:opacity-90 transition-opacity cursor-pointer"
                aria-label="AlphaStats Home"
              >
                <Logo className="flex-shrink-0 mt-1 w-10 h-10" />
                AlphaStats
              </Link>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Built for traders, by traders. Stop guessing, start improving.
              </p>
              <div className="mt-4 flex items-center gap-2">
                {SOCIAL_LINKS.map(({ label, href, Icon }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-9 w-9 rounded-lg flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 bg-slate-100/60 dark:bg-white/[0.04] hover:bg-slate-200/60 dark:hover:bg-white/[0.08] transition-colors"
                    aria-label={`Follow AlphaStats on ${label}`}
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            </div>

            {/* Categories - far right */}
            <div className="flex flex-wrap gap-8 sm:gap-10 lg:gap-12 lg:flex-shrink-0">
              <FooterSection title="Product" links={footerLinks.product} />
              <FooterSection title="Legal" links={footerLinks.legal} />
              <FooterSection title="Feed" links={footerLinks.feed} />
              <FooterSection title="Support" links={footerLinks.support} />
            </div>
          </div>

          {/* Disclaimer + copyright */}
          <div className="mt-10 pt-6 border-t border-slate-200/70 dark:border-border/40 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3">
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 pt-px">
                Disclaimer
              </span>
              <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
                AlphaStats is a trade journal and performance tracking tool. We do not provide financial advice, investment recommendations, or trading signals. Past performance does not guarantee future results. Always do your own research.
              </p>
            </div>
            <p className="text-sm text-slate-400 dark:text-slate-300 text-center">
              © {YEAR} AlphaStats. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
