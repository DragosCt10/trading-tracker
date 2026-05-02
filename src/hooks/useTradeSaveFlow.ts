'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import type { Trade, TradingMode } from '@/types/trade';
import type { SavedNewsItem } from '@/types/account-settings';
import type { SavedTag, TagColor } from '@/types/saved-tag';
import type { Strategy } from '@/types/strategy';
import { queryKeys } from '@/lib/queryKeys';
import { invalidateAndRefetchTradeQueries as invalidateTradeQueries } from '@/lib/tradeQueryInvalidation';
import {
  mergeNewsIntoSaved,
  mergeSetupTypeIntoSaved,
  mergeLiquidityTypeIntoSaved,
  mergeMarketIntoSaved,
  mergeNumericIntoSaved,
  normalizeNewsName,
} from '@/utils/savedFeatures';
import { updateSavedNews, updateSavedMarkets } from '@/lib/server/settings';
import {
  updateStrategySetupTypes,
  updateStrategyLiquidityTypes,
  updateStrategyNumericPool,
  syncStrategyTags,
} from '@/lib/server/strategies';

interface UseTradeSaveFlowParams {
  userId: string | undefined;
  accountId: string | undefined;
  mode: TradingMode;
  settings: { saved_news?: unknown; saved_markets?: string[] };
  currentStrategy: Strategy | undefined;
}

interface RunSyncParams {
  trade: Trade;
  strategyIds: Array<string | null | undefined>;
  /** Optional pending tag colors for newly created trades */
  pendingTagColors?: Record<string, TagColor>;
  /** Optional callback when sync errors occur (8A) */
  onSyncError?: (message: string) => void;
}

/**
 * Extracted hook that handles post-save sync operations shared between
 * NewTradeModal and TradeDetailsPanel. Deduplicates ~100 lines of identical logic.
 *
 * Handles: cache invalidation, news/setup/liquidity/market/tag sync to DB,
 * and React Query cache updates so suggestion lists show fresh data.
 */
export function useTradeSaveFlow({
  userId,
  accountId,
  mode,
  settings,
  currentStrategy,
}: UseTradeSaveFlowParams) {
  const queryClient = useQueryClient();
  const router = useRouter();

  const invalidateTradeCache = useCallback(
    async (strategyIds: Array<string | null | undefined>) => {
      await invalidateTradeQueries({
        queryClient,
        strategyIds,
        mode,
        accountId,
        userId,
      });
      // Bust Next.js Router Cache so sibling routes (my-trades, daily-journal,
      // ai-vision) re-run their server fetch on next navigation instead of
      // serving the dehydrated HydrationBoundary state from before the mutation.
      router.refresh();
    },
    [queryClient, mode, accountId, userId, router],
  );

  const runPostSaveSync = useCallback(
    async ({ trade, strategyIds, pendingTagColors, onSyncError }: RunSyncParams) => {
      try {
        await invalidateTradeCache(strategyIds);

        let updatedNews: SavedNewsItem[] | undefined;
        let updatedSetups: string[] | undefined;
        let updatedLiquidity: string[] | undefined;
        let updatedMarkets: string[] | undefined;
        let updatedDisplacementSizes: string[] | undefined;
        let updatedSlSizes: string[] | undefined;
        let updatedRiskPerTrades: string[] | undefined;
        let updatedRrRatios: string[] | undefined;

        const savePromises: Promise<unknown>[] = [];

        if (trade.news_related && trade.news_name?.trim() && userId) {
          const savedNews = Array.isArray(settings.saved_news) ? settings.saved_news : [];
          updatedNews = mergeNewsIntoSaved(
            normalizeNewsName(trade.news_name),
            trade.news_intensity ?? null,
            savedNews as SavedNewsItem[],
          );
          savePromises.push(updateSavedNews(updatedNews));
        }

        if (trade.setup_type?.trim() && userId && currentStrategy) {
          updatedSetups = mergeSetupTypeIntoSaved(
            trade.setup_type,
            currentStrategy.saved_setup_types ?? [],
          );
          savePromises.push(updateStrategySetupTypes(currentStrategy.id, userId, updatedSetups));
        }

        if (trade.liquidity?.trim() && userId && currentStrategy) {
          updatedLiquidity = mergeLiquidityTypeIntoSaved(
            trade.liquidity,
            currentStrategy.saved_liquidity_types ?? [],
          );
          savePromises.push(updateStrategyLiquidityTypes(currentStrategy.id, userId, updatedLiquidity));
        }

        // Numeric saved pools — auto-merge new values into the strategy's
        // suggestion lists so the next trade gets one-tap reuse.
        if (userId && currentStrategy) {
          const next = mergeNumericIntoSaved(
            trade.displacement_size ?? null,
            currentStrategy.saved_displacement_sizes ?? [],
          );
          if (next !== (currentStrategy.saved_displacement_sizes ?? [])) {
            updatedDisplacementSizes = next;
            savePromises.push(
              updateStrategyNumericPool(currentStrategy.id, userId, 'saved_displacement_sizes', next),
            );
          }
        }
        if (userId && currentStrategy) {
          const next = mergeNumericIntoSaved(
            trade.sl_size ?? null,
            currentStrategy.saved_sl_sizes ?? [],
          );
          if (next !== (currentStrategy.saved_sl_sizes ?? [])) {
            updatedSlSizes = next;
            savePromises.push(
              updateStrategyNumericPool(currentStrategy.id, userId, 'saved_sl_sizes', next),
            );
          }
        }
        if (userId && currentStrategy) {
          const next = mergeNumericIntoSaved(
            trade.risk_per_trade ?? null,
            currentStrategy.saved_risk_per_trades ?? [],
          );
          if (next !== (currentStrategy.saved_risk_per_trades ?? [])) {
            updatedRiskPerTrades = next;
            savePromises.push(
              updateStrategyNumericPool(currentStrategy.id, userId, 'saved_risk_per_trades', next),
            );
          }
        }
        if (userId && currentStrategy) {
          const next = mergeNumericIntoSaved(
            trade.risk_reward_ratio ?? null,
            currentStrategy.saved_rr_ratios ?? [],
          );
          if (next !== (currentStrategy.saved_rr_ratios ?? [])) {
            updatedRrRatios = next;
            savePromises.push(
              updateStrategyNumericPool(currentStrategy.id, userId, 'saved_rr_ratios', next),
            );
          }
        }

        if (trade.market?.trim() && userId) {
          const savedMarkets = Array.isArray(settings.saved_markets) ? settings.saved_markets : [];
          updatedMarkets = mergeMarketIntoSaved(trade.market, savedMarkets);
          savePromises.push(updateSavedMarkets(updatedMarkets));
        }

        const tradeTags = (trade.tags ?? []).map((t: string) => t.toLowerCase().trim()).filter(Boolean);
        let updatedTags: SavedTag[] | undefined;
        if (tradeTags.length > 0 && userId && currentStrategy) {
          const tagsWithColors: SavedTag[] = tradeTags.map(name => ({
            name,
            color: pendingTagColors?.[name] ?? (currentStrategy.saved_tags ?? []).find(t => t.name === name)?.color,
          }));
          updatedTags = tagsWithColors;
          savePromises.push(syncStrategyTags(currentStrategy.id, userId, tagsWithColors));
        }

        await Promise.all(savePromises);

        // Update React Query cache so suggestion lists show fresh data without page refresh
        if (userId) {
          const settingsKey = queryKeys.settings(userId);
          queryClient.setQueryData(
            settingsKey,
            (prev: { saved_news?: unknown; saved_markets?: string[] } | undefined) => ({
              ...prev,
              saved_news: updatedNews ?? prev?.saved_news ?? [],
              saved_markets: updatedMarkets ?? prev?.saved_markets ?? [],
            }),
          );

          const numericChanged =
            updatedDisplacementSizes !== undefined ||
            updatedSlSizes !== undefined ||
            updatedRiskPerTrades !== undefined ||
            updatedRrRatios !== undefined;

          if (
            currentStrategy &&
            (updatedSetups !== undefined ||
              updatedLiquidity !== undefined ||
              updatedTags !== undefined ||
              numericChanged)
          ) {
            const strategiesKey = queryKeys.strategies(userId, accountId);
            queryClient.setQueryData(
              strategiesKey,
              (
                prev:
                  | {
                      id: string;
                      saved_setup_types?: string[];
                      saved_liquidity_types?: string[];
                      saved_displacement_sizes?: string[];
                      saved_sl_sizes?: string[];
                      saved_risk_per_trades?: string[];
                      saved_rr_ratios?: string[];
                      saved_tags?: SavedTag[];
                    }[]
                  | undefined,
              ) => {
                if (!prev) return prev;
                return prev.map((s) =>
                  s.id === currentStrategy.id
                    ? {
                        ...s,
                        saved_setup_types: updatedSetups ?? s.saved_setup_types ?? [],
                        saved_liquidity_types: updatedLiquidity ?? s.saved_liquidity_types ?? [],
                        saved_displacement_sizes:
                          updatedDisplacementSizes ?? s.saved_displacement_sizes ?? [],
                        saved_sl_sizes: updatedSlSizes ?? s.saved_sl_sizes ?? [],
                        saved_risk_per_trades:
                          updatedRiskPerTrades ?? s.saved_risk_per_trades ?? [],
                        saved_rr_ratios: updatedRrRatios ?? s.saved_rr_ratios ?? [],
                        saved_tags: updatedTags ?? s.saved_tags ?? [],
                      }
                    : s,
                );
              },
            );
          }

          // Mark cached settings/strategies stale so consumers refetch if needed
          await queryClient.invalidateQueries({ queryKey: queryKeys.settings(userId) });
          await queryClient.invalidateQueries({ queryKey: queryKeys.strategies(userId, accountId) });
        }
      } catch (syncErr) {
        console.error('Post-save trade sync failed:', syncErr);
        // Surface sync errors to user (8A) — trade itself was saved successfully
        if (onSyncError) {
          onSyncError('Trade saved, but some preferences failed to sync. They will update on next refresh.');
        }
      }
    },
    [invalidateTradeCache, userId, settings, currentStrategy, accountId, queryClient],
  );

  return { runPostSaveSync, invalidateTradeCache };
}
