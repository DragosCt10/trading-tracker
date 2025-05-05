'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTradingMode } from '@/context/TradingModeContext';

export default function Navigation() {
  const pathname = usePathname();
  const { mode, setMode, activeAccount } = useTradingMode();

  return (
    <nav className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <span className="text-xl font-bold">Trading Tracker</span>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                href="/dashboard"
                className={`${
                  pathname === '/dashboard'
                    ? 'border-blue-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
              >
                Dashboard
              </Link>
              <Link
                href="/trades"
                className={`${
                  pathname === '/trades'
                    ? 'border-blue-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
              >
                Trades
              </Link>
              <Link
                href="/account-settings"
                className={`${
                  pathname === '/account-settings'
                    ? 'border-blue-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
              >
                Account Settings
              </Link>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-500">
              {activeAccount ? (
                <span>
                  {activeAccount.name} - {activeAccount.currency} {activeAccount.account_balance.toFixed(2)}
                </span>
              ) : (
                <Link href="/account-settings" className="text-blue-500 hover:text-blue-700">
                  Set up account
                </Link>
              )}
            </div>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="block w-32 py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="live">Live</option>
              <option value="demo">Demo</option>
              <option value="backtesting">Backtesting</option>
            </select>
          </div>
        </div>
      </div>
    </nav>
  );
} 