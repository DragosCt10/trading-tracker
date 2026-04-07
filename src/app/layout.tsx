import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { LoadingProvider } from '@/context/LoadingContext';
import QueryProvider from '@/context/QueryContext';
import { ThemeProvider } from '@/components/ThemeProvider';
import { ThemeSync } from '@/components/ThemeSync';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import { GoogleTagManager } from '@next/third-parties/google';
import Script from 'next/script';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://alpha-stats.com'),
  title: 'AlphaStats',
  description: 'Built for traders, by traders. Stop guessing, start improving.',
  keywords: ['trading journal', 'trade tracker', 'trading analytics', 'trading statistics', 'forex journal', 'stock journal', 'crypto journal', 'trading performance'],
  authors: [{ name: 'AlphaStats', url: 'https://alpha-stats.com' }],
  creator: 'AlphaStats',
  icons: {
    icon: [
      { url: '/icon-light.png', type: 'image/png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark.png', type: 'image/png', media: '(prefers-color-scheme: dark)' },
    ],
    apple: '/apple-icon.png',
  },
  manifest: '/site.webmanifest',
  openGraph: {
    title: 'AlphaStats',
    description: 'Built for traders, by traders. Stop guessing, start improving.',
    url: 'https://alpha-stats.com',
    siteName: 'AlphaStats',
    images: [{ url: '/thumbnail.jpg', width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AlphaStats',
    description: 'Built for traders, by traders. Stop guessing, start improving.',
    images: ['/thumbnail.jpg'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (process.env.NEXT_PUBLIC_UNDER_MAINTENANCE === 'true') {
    return (
      <html lang="en" suppressHydrationWarning>
        <body className="bg-black text-white min-h-screen flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="text-6xl font-bold tracking-tight">🔧</div>
            <h1 className="text-4xl font-bold tracking-tight">Under Maintenance</h1>
            <p className="text-zinc-400 text-lg">We&apos;re performing scheduled maintenance. We&apos;ll be back shortly.</p>
          </div>
        </body>
      </html>
    );
  }

  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        {/* Consent Mode v2 - must be first */}
        <Script id="consent-default" strategy="beforeInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('consent', 'default', {
              'ad_storage': 'denied',
              'analytics_storage': 'denied',
              'wait_for_update': 500
            });
          `}
        </Script>
        {/* Apply theme before first paint to avoid flash of default theme on refresh */}
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var path = window.location.pathname;
                  var isAlwaysDark = path === '/' || path === '/pricing';
                  var isDark;
                  if (isAlwaysDark) {
                    isDark = true;
                  } else {
                    var theme = localStorage.getItem('theme');
                    var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    isDark = theme ? theme === 'dark' : systemDark;
                  }
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                    document.documentElement.style.backgroundColor = '#0d0a12';
                  } else {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.style.backgroundColor = '#ffffff';
                  }
                  var colorTheme = localStorage.getItem('color-theme');
                  if (colorTheme) {
                    document.documentElement.setAttribute('data-color-theme', colorTheme);
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <GoogleTagManager gtmId="GTM-NXXDR5MM" />
      <body className={`${inter.className} app-gradient min-h-screen relative`}>
        {/* Theme-aware gradient orbs (use --orb-1 / --orb-2 from color theme) — static, no animation */}
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden>
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] orb-bg-1 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] orb-bg-2 rounded-full blur-3xl" />
        </div>
        <ThemeProvider>
          <ThemeSync>
            <QueryProvider>
              <LoadingProvider>
                <main className="relative z-10 mx-auto p-4 sm:p-0">
                  {children}
                </main>
              </LoadingProvider>
            </QueryProvider>
          </ThemeSync>
        </ThemeProvider>
      </body>
    </html>
  );
} 