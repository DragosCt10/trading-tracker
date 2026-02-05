import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { LoadingProvider } from '@/context/LoadingContext';
import Footer from '@/components/shared/Footer';
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
  return (
    <html lang="en">
      <body className={`${inter.className} bg-custom`}>
        <QueryProvider>
          <LoadingProvider>
            <main className="max-w-(--breakpoint-xl) p-4 md:px-0 mx-auto pt-32">
              {children}
            </main>
            <Footer />
          </LoadingProvider>
        </QueryProvider>
      </body>
    </html>
  );
} 