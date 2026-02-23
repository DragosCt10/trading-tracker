import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { LoadingProvider } from '@/context/LoadingContext';
import QueryProvider from '@/context/QueryContext';
import { ThemeProvider } from '@/components/ThemeProvider';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'QuantifyX',
  description: 'Built for traders, by traders. Track performance and journal your trades.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} app-gradient min-h-screen relative`}>
        {/* Theme-aware gradient orbs (use --orb-1 / --orb-2 from color theme) */}
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden>
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] orb-bg-1 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] orb-bg-2 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
        </div>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('theme');
                  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  const initialTheme = theme || systemTheme;
                  if (initialTheme === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        <ThemeProvider>
          <QueryProvider>
            <LoadingProvider>
              <main className="relative z-10 mx-auto">
                {children}
              </main>
            </LoadingProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
} 