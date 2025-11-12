'use client';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Bars3Icon, ChartBarIcon, DocumentTextIcon, PlusCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { createClient } from '@/utils/supabase/client';
import { useUserDetails } from '@/hooks/useUserDetails';
import { useQueryClient } from '@tanstack/react-query';
import ActionBar from '../shared/ActionBar';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: userData, isLoading: userLoading } = useUserDetails();
  const supabase = createClient();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const queryClient = useQueryClient();
  
  // Reset isSigningOut state when user data changes or component mounts
  useEffect(() => {
    if (userData?.user) {
      setIsSigningOut(false);
    }
  }, [userData?.user]);

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await supabase.auth.signOut();
      router.replace('/');
    } catch (error) {
      console.error('Error signing out:', error);
      setIsSigningOut(false);
    }
  };

  const isActive = (path: string) => {
    return pathname === path ? 'bg-stone-100! rounded' : '';
  };


  // Don't render the navbar if there's no session and user
  // if (!userData?.session || !userData?.user) {
  //   return null;
  // }

  return (
    <nav className="fixed top-2 left-0 right-0 z-50 rounded-lg border overflow-hidden p-2 bg-white border-stone-200 shadow-stone-950/5 mx-auto w-full max-w-(--breakpoint-xl)">
      <div className="flex items-center">
        <Link href="/" className="font-sans antialiased text-sm text-current ml-2 mr-2 block py-1 font-semibold flex items-center">
          <img src="/trading-tracker-logo.png" alt="Trading Tracker Logo" className="h-10 w-10 mr-2" />
          Trading Tracker
        </Link>
        <hr className="ml-1 mr-4 hidden h-5 w-px border-l border-t-0 border-secondary-dark lg:block" />
        <div className="hidden lg:block">
          <ul className="mt-4 flex flex-col gap-x-3 gap-y-1.5 lg:mt-0 lg:flex-row lg:items-center">
            <li>
              <Link href="/analytics" className={`font-sans antialiased text-sm text-current flex items-center gap-x-2 p-2 hover:text-primary ${isActive('/analytics')}`}>
                <ChartBarIcon className="h-4 w-4" />
                Analytics
              </Link>
            </li>
            <li>
              <Link href="/trades/new" className={`font-sans antialiased text-sm text-current flex items-center gap-x-2 p-2 hover:text-primary ${isActive('/trades/new')}`}>
                <PlusCircleIcon className="h-4 w-4" />
                New Trade
              </Link>
            </li>
            <li>
              <Link href="/trades" className={`font-sans antialiased text-sm text-current flex items-center gap-x-2 p-2 hover:text-primary ${isActive('/trades')}`}>
                <DocumentTextIcon className="h-4 w-4" />
                My Trades
              </Link>
            </li>
          </ul>
        </div>

        
        
        <button
          className="cursor-pointer ml-auto mr-3 inline-flex items-center justify-center border align-middle select-none font-sans font-medium text-center duration-300 ease-in disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed focus:shadow-none text-sm py-2 px-4 shadow-sm hover:shadow-md bg-stone-200 hover:bg-stone-100 relative bg-gradient-to-b from-white to-white border-stone-200 text-stone-700 rounded-lg hover:bg-gradient-to-b hover:from-stone-50 hover:to-stone-50 hover:border-stone-200 after:absolute after:inset-0 after:rounded-[inherit] after:box-shadow after:shadow-[inset_0_1px_0px_rgba(255,255,255,0.35),inset_0_-1px_0px_rgba(0,0,0,0.20)] after:pointer-events-none transition antialiased"
          // Add your handler for creating a new account here
          onClick={() => {
            // TODO: Implement create new account action (e.g., open modal or navigate)
            alert('Create New Account clicked!');
          }}
        >
          Create New Account
        </button>
        <button
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="items-center justify-center border align-middle select-none font-sans font-medium text-center duration-300 ease-in disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed focus:shadow-none text-sm py-2 px-4 shadow-sm hover:shadow-md bg-red-500 hover:bg-error-light relative bg-linear-to-b from-red-500 to-red-600 border-red-600 text-stone-50 rounded-lg hover:bg-linear-to-b hover:from-red-600 hover:to-red-600 hover:border-red-600 after:absolute after:inset-0 after:rounded-[inherit] after:box-shadow after:shadow-[inset_0_1px_0px_rgba(255,255,255,0.35),inset_0_-2px_0px_rgba(0,0,0,0.18)] after:pointer-events-none transition antialiased hidden lg:inline-block"
        >
          {isSigningOut ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Signing out...
            </span>
          ) : (
            'Sign Out'
          )}
        </button>

        
        
        <div 
          data-dui-toggle="collapse" 
          data-dui-target="#navbarCollapse" 
          aria-expanded={mobileMenuOpen ? "true" : "false"} 
          aria-controls="navbarCollapse" 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="place-items-center border align-middle select-none font-sans font-medium text-center transition-all duration-300 ease-in disabled:opacity-50 disabled:shadow-none disabled:pointer-events-none text-sm min-w-[34px] min-h-[34px] rounded-md bg-transparent border-transparent text-stone-800 hover:bg-stone-200/10 hover:border-stone-600/10 shadow-none hover:shadow-none ml-auto grid lg:hidden cursor-pointer"
        >
          {mobileMenuOpen ? (
            <XMarkIcon className="h-4 w-4" />
          ) : (
            <Bars3Icon className="h-4 w-4" />
          )}
        </div>
      </div>

      <div>
        <ActionBar />
      </div>
      
      <div 
        className={`overflow-hidden transition-[max-height] duration-300 ease-in-out ${mobileMenuOpen ? 'max-h-96' : 'max-h-0'} lg:hidden`} 
        id="navbarCollapse"
      >
        <ul className="flex flex-col gap-y-1.5 mt-4">
          <li>
            <Link href="/analytics" className={`font-sans antialiased text-sm text-current flex items-center gap-x-2 p-2 hover:text-primary ${isActive('/analytics')}`}>
              Analytics
            </Link>
          </li>
          <li>
            <Link href="/trades/new" className={`font-sans antialiased text-sm text-current flex items-center gap-x-2 p-2 hover:text-primary ${isActive('/trades/new')}`}>
              New Trade
            </Link>
          </li>
          <li>
            <Link href="/trades" className={`font-sans antialiased text-sm text-current flex items-center gap-x-2 p-2 hover:text-primary ${isActive('/trades')}`}>
              My Trades
            </Link>
          </li>
          <li className="mt-2">
            <button
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="inline-flex w-full items-center justify-center border align-middle select-none font-sans font-medium text-center duration-300 ease-in disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed focus:shadow-none text-sm py-2 px-4 shadow-sm hover:shadow-md bg-red-500 hover:bg-error-light relative bg-linear-to-b from-red-500 to-red-600 border-red-600 text-stone-50 rounded-lg hover:bg-linear-to-b hover:from-red-600 hover:to-red-600 hover:border-red-600 after:absolute after:inset-0 after:rounded-[inherit] after:box-shadow after:shadow-[inset_0_1px_0px_rgba(255,255,255,0.35),inset_0_-2px_0px_rgba(0,0,0,0.18)] after:pointer-events-none transition antialiased"
            >
              {isSigningOut ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing out...
                </span>
              ) : (
                'Sign Out'
              )}
            </button>
          </li>
        </ul>
      </div>
    </nav>
  );
}