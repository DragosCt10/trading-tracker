import Link from "next/link";
import { cn } from "@/lib/utils";
import Logo from "@/components/shared/Logo";

const YEAR = new Date().getFullYear();

const footerLinks = {
  product: [
    { label: "Pricing", href: "/pricing" },
    { label: "Features", href: "/#features" },
    { label: "Dashboard", href: "/" },
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

function FooterLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors text-sm",
        className
      )}
    >
      {children}
    </Link>
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
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
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

export function Footer() {
  return (
    <footer
      role="contentinfo"
      className={cn(
        "w-full mt-32 bg-transparent",
        "border-t border-slate-200 dark:border-slate-700/80"
      )}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-10 sm:py-12">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8 lg:gap-12">
            {/* Brand - left */}
            <div className="lg:max-w-xs">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-50 tracking-tight hover:opacity-90 transition-opacity"
              >
                <Logo width={37} height={37} className="flex-shrink-0" />
                QuantifyX
              </Link>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Built for traders, by traders. Track performance and journal your trades.
              </p>
            </div>

            {/* Categories - far right */}
            <div className="flex flex-wrap gap-8 sm:gap-10 lg:gap-12 lg:flex-shrink-0">
              <FooterSection title="Product" links={footerLinks.product} />
              <FooterSection title="Legal" links={footerLinks.legal} />
              <FooterSection title="Support" links={footerLinks.support} />
            </div>
          </div>

          {/* Bottom bar - copyright centered */}
          <div className="mt-10 pt-6 flex justify-center border-t border-slate-200/70 dark:border-slate-700/70">
            <p className="text-sm text-slate-400 dark:text-slate-500">
              © {YEAR} QuantifyX. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
