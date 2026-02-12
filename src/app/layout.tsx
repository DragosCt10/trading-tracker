import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { LoadingProvider } from '@/context/LoadingContext';
import QueryProvider from '@/context/QueryContext';

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
  // Set dark mode as default by adding "dark" to the html tag by default
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-[#f2f5fa] dark:bg-[#0c1411] bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-[#0a0f0d] dark:via-[#0d1612] dark:to-[#0a0f0d]`}>
        <QueryProvider>
          <LoadingProvider>
            <main className="mx-auto">
              {children}
            </main>
          </LoadingProvider>
        </QueryProvider>
      </body>
    </html>
  );
} 