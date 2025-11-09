'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useTradingMode } from '@/context/TradingModeContext';
import { useUserDetails } from '@/hooks/useUserDetails';
import DashboardLayout from '@/components/shared/layout/DashboardLayout';

const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD', flag: '🇺🇸' },
  { value: 'EUR', label: 'EUR', flag: '🇪🇺' },
  { value: 'GBP', label: 'GBP', flag: '🇬🇧' },
  { value: 'JPY', label: 'JPY', flag: '🇯🇵' },
  { value: 'AUD', label: 'AUD', flag: '🇦🇺' },
  { value: 'CAD', label: 'CAD', flag: '🇨🇦' },
  { value: 'CHF', label: 'CHF', flag: '🇨🇭' },
  { value: 'CNY', label: 'CNY', flag: '🇨🇳' },
  { value: 'HKD', label: 'HKD', flag: '🇭🇰' },
  { value: 'NZD', label: 'NZD', flag: '🇳🇿' }
];

const MODES = [
  { value: 'live', label: 'Live Trading' },
  { value: 'demo', label: 'Demo Trading' },
  { value: 'backtesting', label: 'Backtesting' },
];

interface Account {
  id: string;
  name: string;
  account_balance: number;
  currency: string;
  is_active: boolean;
  mode: string;
  description?: string;
}

interface EditModalProps {
  account: Account | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (account: Partial<Account>) => Promise<void>;
  onDelete: (account: Account) => Promise<void>;
}

function EditModal({ account, isOpen, onClose, onSave, onDelete }: EditModalProps) {
  const [editedAccount, setEditedAccount] = useState({
    name: '',
    account_balance: '',
    currency: 'EUR',
    description: ''
  });
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (account) {
      setEditedAccount({
        name: account.name,
        account_balance: account.account_balance.toString(),
        currency: account.currency,
        description: account.description || ''
      });
    }
  }, [account]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-800/60">
      <div className="w-full max-w-md overflow-y-auto scale-95 transition-transform duration-300 ease-out shadow-sm rounded-lg bg-white p-6">
        {!isDeleting ? (
          <>
            <div className="flex flex-row items-center justify-between border-b border-stone-200 pb-4 mb-6">
              <h2 className="font-sans antialiased text-base md:text-lg text-stone-800 font-semibold">Edit Account</h2>
              <button
                onClick={onClose}
                className="inline-grid place-items-center border align-middle select-none font-sans font-medium text-center transition-all duration-300 ease-in disabled:opacity-50 disabled:shadow-none disabled:pointer-events-none text-sm min-w-[38px] min-h-[38px] rounded-md bg-transparent border-transparent text-stone-800 hover:bg-stone-800/5 hover:border-stone-800/5 shadow-none hover:shadow-none"
                aria-label="Close"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block mb-2 text-sm font-semibold antialiased text-stone-800">
                  Account Name
                </label>
                <input
                  type="text"
                  value={editedAccount.name}
                  onChange={(e) => setEditedAccount({ ...editedAccount, name: e.target.value })}
                  className="w-full aria-disabled:cursor-not-allowed outline-none focus:outline-none text-stone-800 placeholder:text-stone-600/60 ring-transparent border border-stone-200 transition-all ease-in disabled:opacity-50 disabled:pointer-events-none select-none text-sm py-2 px-2.5 ring shadow-sm bg-white rounded-lg duration-100 hover:border-stone-300 hover:ring-none focus:border-stone-400 focus:ring-none"
                />
              </div>
              
              <div>
                <label className="block mb-2 text-sm font-semibold antialiased text-stone-800">
                  Balance
                </label>
                <input
                  type="text"
                  value={editedAccount.account_balance}
                  onChange={(e) => setEditedAccount({ ...editedAccount, account_balance: e.target.value })}
                  className="w-full aria-disabled:cursor-not-allowed outline-none focus:outline-none text-stone-800 placeholder:text-stone-600/60 ring-transparent border border-stone-200 transition-all ease-in disabled:opacity-50 disabled:pointer-events-none select-none text-sm py-2 px-2.5 ring shadow-sm bg-white rounded-lg duration-100 hover:border-stone-300 hover:ring-none focus:border-stone-400 focus:ring-none"
                />
              </div>
              
              <div>
                <label className="block mb-2 text-sm font-semibold antialiased text-stone-800">
                  Currency
                </label>
                <select
                  value={editedAccount.currency}
                  onChange={(e) => setEditedAccount({ ...editedAccount, currency: e.target.value })}
                  className="w-full aria-disabled:cursor-not-allowed outline-none focus:outline-none text-stone-800 placeholder:text-stone-600/60 ring-transparent border border-stone-200 transition-all ease-in disabled:opacity-50 disabled:pointer-events-none select-none text-sm py-2 px-2.5 ring shadow-sm bg-white rounded-lg duration-100 hover:border-stone-300 hover:ring-none focus:border-stone-400 focus:ring-none"
                >
                  {CURRENCY_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.flag} {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-2 text-sm font-semibold antialiased text-stone-800">
                  Description
                </label>
                <textarea
                  value={editedAccount.description}
                  onChange={(e) => setEditedAccount({ ...editedAccount, description: e.target.value })}
                  className="w-full aria-disabled:cursor-not-allowed outline-none focus:outline-none text-stone-800 placeholder:text-stone-600/60 ring-transparent border border-stone-200 transition-all ease-in disabled:opacity-50 disabled:pointer-events-none select-none text-sm py-2 px-2.5 ring shadow-sm bg-white rounded-lg duration-100 hover:border-stone-300 hover:ring-none focus:border-stone-400 focus:ring-none"
                  rows={3}
                  placeholder="Add a description for your account..."
                />
              </div>
            </div>

            <div className="mt-6 flex justify-between">
              <button
                onClick={() => setIsDeleting(true)}
                className="inline-flex items-center justify-center border align-middle select-none font-sans font-medium text-center duration-300 ease-in disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed focus:shadow-none text-sm py-2 px-4 shadow-sm hover:shadow-md relative bg-linear-to-b from-red-500 to-red-600 border-red-600 text-stone-50 rounded-lg hover:bg-linear-to-b hover:from-red-600 hover:to-red-600 hover:border-red-600 after:absolute after:inset-0 after:rounded-[inherit] after:box-shadow after:shadow-[inset_0_1px_0px_rgba(255,255,255,0.35),inset_0_-2px_0px_rgba(0,0,0,0.18)] after:pointer-events-none transition antialiased"
              >
                Delete Account
              </button>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="inline-flex items-center justify-center border align-middle select-none font-sans font-medium text-center transition-all ease-in disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed focus:shadow-none text-sm py-2 px-4 shadow-sm bg-transparent relative text-stone-700 hover:text-stone-700 border-stone-500 hover:bg-transparent duration-150 hover:border-stone-600 rounded-lg hover:opacity-60 hover:shadow-none"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (account) {
                      await onSave({
                        ...account,
                        name: editedAccount.name,
                        account_balance: parseFloat(editedAccount.account_balance),
                        currency: editedAccount.currency,
                        description: editedAccount.description
                      });
                      onClose();
                    }
                  }}
                  className="inline-flex items-center justify-center border align-middle select-none font-sans font-medium text-center duration-300 ease-in disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed focus:shadow-none text-sm py-2 px-4 shadow-sm hover:shadow-md relative bg-linear-to-b from-stone-700 to-stone-800 border-stone-900 text-stone-50 rounded-lg hover:bg-linear-to-b hover:from-stone-800 hover:to-stone-800 hover:border-stone-900 after:absolute after:inset-0 after:rounded-[inherit] after:box-shadow after:shadow-[inset_0_1px_0px_rgba(255,255,255,0.25),inset_0_-2px_0px_rgba(0,0,0,0.35)] after:pointer-events-none transition antialiased"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-row items-center justify-between border-b border-stone-200 pb-4 mb-6">
              <h2 className="font-sans antialiased text-base md:text-lg text-stone-800 font-semibold">Delete Account</h2>
              <button
                onClick={() => setIsDeleting(false)}
                className="inline-grid place-items-center border align-middle select-none font-sans font-medium text-center transition-all duration-300 ease-in disabled:opacity-50 disabled:shadow-none disabled:pointer-events-none text-sm min-w-[38px] min-h-[38px] rounded-md bg-transparent border-transparent text-stone-800 hover:bg-stone-800/5 hover:border-stone-800/5 shadow-none hover:shadow-none"
                aria-label="Close"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-stone-600 mb-6">
              Are you sure you want to delete the account "{account?.name}"? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsDeleting(false)}
                className="inline-flex items-center justify-center border align-middle select-none font-sans font-medium text-center transition-all ease-in disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed focus:shadow-none text-sm py-2 px-4 shadow-sm bg-transparent relative text-stone-700 hover:text-stone-700 border-stone-500 hover:bg-transparent duration-150 hover:border-stone-600 rounded-lg hover:opacity-60 hover:shadow-none"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (account) {
                    await onDelete(account);
                    onClose();
                  }
                }}
                className="inline-flex items-center justify-center border align-middle select-none font-sans font-medium text-center duration-300 ease-in disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed focus:shadow-none text-sm py-2 px-4 shadow-sm hover:shadow-md relative bg-linear-to-b from-red-500 to-red-600 border-red-600 text-stone-50 rounded-lg hover:bg-linear-to-b hover:from-red-600 hover:to-red-600 hover:border-red-600 after:absolute after:inset-0 after:rounded-[inherit] after:box-shadow after:shadow-[inset_0_1px_0px_rgba(255,255,255,0.35),inset_0_-2px_0px_rgba(0,0,0,0.18)] after:pointer-events-none transition antialiased"
              >
                Delete Account
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function Settings() {
  const { mode, setMode, activeAccount, refreshActiveAccount, isLoading: isModeLoading } = useTradingMode();
  const { data: userDetails, isLoading: isUserLoading } = useUserDetails();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [newAccount, setNewAccount] = useState({
    name: '',
    account_balance: '',
    currency: 'EUR',
    description: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!isUserLoading && userDetails?.user) {
      fetchAccounts();
    }
  }, [mode, userDetails, isUserLoading]);

  async function fetchAccounts() {
    try {
      setLoading(true);
      setError(null);
      
      // Wait for user details to be loaded
      if (isUserLoading) return;
      
      if (!userDetails?.user) {
        setError('Please sign in to view your accounts');
        return;
      }

      // Use Supabase to fetch accounts
      const { data, error } = await supabase
        .from('account_settings')
        .select('*')
        .eq('user_id', userDetails?.user.id)
        .eq('mode', mode)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setAccounts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddAccount() {
    try {
      setError(null);
      setSuccess(null);
      
      if (!newAccount.name.trim()) {
        setError('Account name is required');
        return;
      }

      if (!newAccount.account_balance || isNaN(parseFloat(newAccount.account_balance))) {
        setError('Please enter a valid account balance');
        return;
      }

      if (!userDetails?.user) throw new Error('No user found');

      const { error } = await supabase
        .from('account_settings')
        .insert({
          user_id: userDetails?.user?.id,
          name: newAccount.name.trim(),
          account_balance: parseFloat(newAccount.account_balance),
          currency: newAccount.currency,
          description: newAccount.description.trim(),
          mode: mode,
          is_active: false
        });

      if (error) throw error;

      setSuccess('Account added successfully');
      
      // Reset form
      setNewAccount({
        name: '',
        account_balance: '',
        currency: 'EUR',
        description: ''
      });
      
      await fetchAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add account');
    }
  }

  async function handleEditAccount(updatedAccount: Partial<Account>) {
    try {
      setError(null);
      setSuccess(null);

      if (!updatedAccount.name?.trim()) {
        setError('Account name is required');
        return;
      }

      if (!updatedAccount.account_balance || isNaN(updatedAccount.account_balance)) {
        setError('Please enter a valid account balance');
        return;
      }

      const { error } = await supabase
        .from('account_settings')
        .update({
          name: updatedAccount.name.trim(),
          account_balance: updatedAccount.account_balance,
          currency: updatedAccount.currency,
          description: updatedAccount.description?.trim()
        })
        .eq('id', updatedAccount.id);

      if (error) throw error;

      setSuccess('Account updated successfully');
      await fetchAccounts();
      if (updatedAccount.is_active) {
        await refreshActiveAccount();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update account');
    }
  }

  async function handleSetActive(accountId: string) {
    try {
      setError(null);
      setSuccess(null);
      if (!userDetails?.user) throw new Error('No user found');

      // Optimistically update UI
      setAccounts(prev => prev.map(acc => ({ ...acc, is_active: acc.id === accountId })));

      // First, deactivate all accounts for this mode in backend
      await supabase
        .from('account_settings')
        .update({ is_active: false })
        .eq('user_id', userDetails?.user.id)
        .eq('mode', mode);

      // Then activate the selected account in backend
      const { error } = await supabase
        .from('account_settings')
        .update({ is_active: true })
        .eq('id', accountId);

      if (error) throw error;

      setSuccess('Active account updated successfully');

      // Refresh accounts and active account
      await fetchAccounts();
      await refreshActiveAccount();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set active account');
    }
  }

  async function handleDeleteAccount(accountToDelete: Account) {
    try {
      setError(null);
      setSuccess(null);

      if (!userDetails?.user) {
        setError('No user found');
        return;
      }

      // If this is an active account, handle the active state first
      if (accountToDelete.is_active) {
        // Find another account to make active
        const { data: otherAccounts } = await supabase
          .from('account_settings')
          .select('*')
          .eq('user_id', userDetails?.user.id)
          .neq('id', accountToDelete.id)
          .order('created_at', { ascending: false });

        if (otherAccounts && otherAccounts.length > 0) {
          // Activate another account
          await supabase
            .from('account_settings')
            .update({ is_active: true })
            .eq('id', otherAccounts[0].id);

          // Update the mode to match the newly activated account
          setMode(otherAccounts[0].mode);
        }
      }

      // Delete the account
      const { error: deleteError } = await supabase
        .from('account_settings')
        .delete()
        .match({ id: accountToDelete.id, user_id: userDetails?.user.id });

      if (deleteError) {
        console.error('Error deleting account:', deleteError);
        setError('Failed to delete account');
        return;
      }

      setSuccess('Account deleted successfully');
      
      // Refresh the accounts list and active account
      await fetchAccounts();
      await refreshActiveAccount();
    } catch (err) {
      console.error('Error in handleDeleteAccount:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete account');
    }
  }

  return (
    <DashboardLayout>
      <div className="p-8 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-stone-900 mb-8">Settings</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}


        {/* Mode Selection */}
        <div className="mb-8">
          <label className="text-lg font-medium text-stone-700 block mb-2">
            Trading Mode
          </label>
          <div className="flex gap-4">
            {MODES.map((m) => (
              <button
                key={m.value}
                onClick={() => setMode(m.value)}
                className={`inline-flex items-center justify-center border align-middle select-none font-sans font-medium text-center duration-300 ease-in disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed focus:shadow-none text-sm py-2 px-4 shadow-sm hover:shadow-md ${mode === m.value ? 'bg-linear-to-b from-stone-700 to-stone-800 border-stone-900 text-stone-50 after:absolute after:inset-0 after:rounded-[inherit] after:box-shadow after:shadow-[inset_0_1px_0px_rgba(255,255,255,0.25),inset_0_-2px_0px_rgba(0,0,0,0.35)] after:pointer-events-none relative' : 'bg-white text-stone-800 border-stone-200'} rounded-lg hover:bg-stone-800/5 hover:border-stone-800/5`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Add New Account Card */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold text-stone-900 mb-4">Add New Account</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-stone-700 block mb-1">
                Account Name
              </label>
              <div className="relative w-full">
                <input
                  type="text"
                  value={newAccount.name}
                  onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                  className="w-full aria-disabled:cursor-not-allowed outline-none focus:outline-none text-stone-800 placeholder:text-stone-600/60 ring-transparent border border-stone-200 transition-all ease-in disabled:opacity-50 disabled:pointer-events-none select-none text-sm py-2 px-2.5 ring shadow-sm bg-white rounded-lg duration-100 hover:border-stone-300 hover:ring-none focus:border-stone-400 focus:ring-none peer"
                  placeholder="e.g., Main Account"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-stone-700 block mb-1">
                Balance
              </label>
              <div className="relative w-full">
                <input
                  type="text"
                  value={newAccount.account_balance}
                  onChange={(e) => setNewAccount({ ...newAccount, account_balance: e.target.value })}
                  className="w-full aria-disabled:cursor-not-allowed outline-none focus:outline-none text-stone-800 placeholder:text-stone-600/60 ring-transparent border border-stone-200 transition-all ease-in disabled:opacity-50 disabled:pointer-events-none select-none text-sm py-2 px-2.5 ring shadow-sm bg-white rounded-lg duration-100 hover:border-stone-300 hover:ring-none focus:border-stone-400 focus:ring-none peer"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-stone-700 block mb-1">
                Currency
              </label>
              <div className="relative w-full">
                <select
                  value={newAccount.currency}
                  onChange={(e) => setNewAccount({ ...newAccount, currency: e.target.value })}
                  className="w-full aria-disabled:cursor-not-allowed outline-none focus:outline-none text-stone-800 placeholder:text-stone-600/60 ring-transparent border border-stone-200 transition-all ease-in disabled:opacity-50 disabled:pointer-events-none select-none text-sm py-2 px-2.5 ring shadow-sm bg-white rounded-lg duration-100 hover:border-stone-300 hover:ring-none focus:border-stone-400 focus:ring-none peer"
                >
                  {CURRENCY_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.flag} {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <label className="text-sm font-medium text-stone-700 block mb-1">
              Description
            </label>
            <div className="relative w-full">
              <textarea
                value={newAccount.description}
                onChange={(e) => setNewAccount({ ...newAccount, description: e.target.value })}
                className="w-full aria-disabled:cursor-not-allowed outline-none focus:outline-none text-stone-800 placeholder:text-stone-600/60 ring-transparent border border-stone-200 transition-all ease-in disabled:opacity-50 disabled:pointer-events-none select-none text-sm py-2 px-2.5 ring shadow-sm bg-white rounded-lg duration-100 hover:border-stone-300 hover:ring-none focus:border-stone-400 focus:ring-none peer"
                placeholder="Add a description for your account..."
                rows={3}
              />
            </div>
          </div>
          <div className="mt-4">
            <button
              onClick={handleAddAccount}
              className="inline-flex items-center justify-center border align-middle select-none font-sans font-medium text-center duration-300 ease-in disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed focus:shadow-none text-sm py-2 px-4 shadow-sm hover:shadow-md relative bg-linear-to-b from-stone-700 to-stone-800 border-stone-900 text-stone-50 rounded-lg hover:bg-linear-to-b hover:from-stone-800 hover:to-stone-800 hover:border-stone-900 after:absolute after:inset-0 after:rounded-[inherit] after:box-shadow after:shadow-[inset_0_1px_0px_rgba(255,255,255,0.25),inset_0_-2px_0px_rgba(0,0,0,0.35)] after:pointer-events-none transition antialiased"
            >
              Add Account
            </button>
          </div>
        </div>

        {/* Accounts List Card */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-stone-900 mb-4">Your Accounts</h2>
          <div className="space-y-4">
            {loading || isUserLoading || isModeLoading ? (
              <div className="flex items-center justify-center">
                <div role="status">
                  <svg aria-hidden="true" className="w-5 h-5 text-stone-200 animate-spin fill-stone-800" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
                    <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
                  </svg>
                </div>
                <p className="ml-4 text-sm text-stone-600">Loading...</p>
              </div>
            ) : accounts.map((account) => (
              <div
                key={account.id}
                className={`p-4 border rounded-lg ${
                  activeAccount?.id === account.id ? 'border-green-500' : 'border-stone-200'
                }`}
              >
                <div className="flex flex-col space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-stone-900">{account.name}</h3>
                      <p className="text-sm text-stone-500 mb-4">
                        Balance: {CURRENCY_OPTIONS.find(c => c.value === account.currency)?.flag || ''} {account.currency} {account.account_balance.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </p>
                      <p className="text-sm text-stone-500">Description:</p>
                      {account.description && (
                        <p className="text-sm text-stone-600 mt-2 whitespace-pre-wrap">{account.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => setEditingAccount(account)}
                        className="inline-flex items-center justify-center border align-middle select-none font-sans font-medium text-center duration-300 ease-in disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed focus:shadow-none text-sm py-2 px-4 shadow-sm hover:shadow-md bg-white text-stone-800 border-stone-200 rounded-lg hover:bg-stone-800/5 hover:border-stone-800/5"
                      >
                        Edit
                      </button>
                      {activeAccount?.id === account.id ? (
                        ''
                      ) : (
                        <button
                          onClick={() => handleSetActive(account.id)}
                          className="inline-flex items-center justify-center border align-middle select-none font-sans font-medium text-center duration-300 ease-in disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed focus:shadow-none text-sm py-2 px-4 shadow-sm hover:shadow-md bg-white text-stone-800 border-stone-200 rounded-lg hover:bg-stone-800/5 hover:border-stone-800/5"
                        >
                          Set Active
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {!loading && !isUserLoading && !isModeLoading && accounts.length === 0 && (
              <p className="text-stone-500 text-center py-4">
                No accounts found for {mode} mode. Add your first account above.
              </p>
            )}
          </div>
        </div>

        {/* Edit Modal */}
        <EditModal
          account={editingAccount}
          isOpen={!!editingAccount}
          onClose={() => setEditingAccount(null)}
          onSave={handleEditAccount}
          onDelete={handleDeleteAccount}
        />
      </div>
    </DashboardLayout>
  );
} 