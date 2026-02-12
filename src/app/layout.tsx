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
      <body className={`${inter.className} bg-[#faf5fc] dark:bg-[#0f0a14] bg-gradient-to-br from-purple-50 via-violet-100 to-fuchsia-200 dark:from-[#0d0a12] dark:via-[#120d16] dark:to-[#0f0a14]`}>
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