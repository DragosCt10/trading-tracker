import { redirect } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { resolveActiveAccountFromCookies } from '@/lib/server/accounts';
import { getStrategyBySlug } from '@/lib/server/strategies';
import { getCurrencySymbolFromAccount } from '@/utils/accountOverviewHelpers';
import BacktestClient from './BacktestClient';

interface BacktestDataProps {
  user: User;
  strategySlug: string;
}

export default async function BacktestData({ user, strategySlug }: BacktestDataProps) {
  const { mode, activeAccount } = await resolveActiveAccountFromCookies(user.id);

  const strategy = strategySlug
    ? await getStrategyBySlug(user.id, strategySlug, activeAccount?.id)
    : null;

  if (strategySlug && !strategy) {
    redirect('/stats');
  }

  return (
    <BacktestClient
      strategyName={strategy?.name ?? strategySlug}
      mode={mode}
      isBacktestingMode={mode === 'backtesting'}
      accountBalance={activeAccount?.account_balance ?? 0}
      currencySymbol={getCurrencySymbolFromAccount(activeAccount ?? undefined)}
    />
  );
}
