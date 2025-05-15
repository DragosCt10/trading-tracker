import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { TradingModeProvider } from '@/context/TradingModeContext';
import { LoadingProvider } from '@/context/LoadingContext';
import Footer from '@/components/shared/Footer';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import QueryProvider from '@/context/QueryContext';


const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Trading Tracker',
  description: 'Track your trading performance and journal your trades',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <QueryProvider>
          <LoadingProvider>
            <TradingModeProvider>
              <div className="min-h-screen bg-gray-50">
                <main className="max-w-screen-xl p-4 md:px-0 mx-auto pt-32">
                  {children}
                </main>
                <Footer />
              </div>
            </TradingModeProvider>
          </LoadingProvider>
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryProvider>
      </body>
    </html>
  );
} 