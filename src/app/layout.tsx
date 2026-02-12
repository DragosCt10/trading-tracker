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
  title: 'TI Tracker',
  description: 'Track your trading performance and journal your trades',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-[#f2f5fa] dark:bg-[#0c1411] bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-[#0a0f0d] dark:via-[#0d1612] dark:to-[#0a0f0d]`}>
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
              <main className="mx-auto">
                {children}
              </main>
            </LoadingProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
} 