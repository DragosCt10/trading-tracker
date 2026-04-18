import { z } from 'zod';

export const TRADE_MODES = ['live', 'demo', 'backtesting'] as const;
export type TradeLedgerMode = (typeof TRADE_MODES)[number];

const isoDate = z.string().refine((s) => !Number.isNaN(Date.parse(s)), {
  message: 'Must be a valid ISO date string',
});

const periodSchema = z
  .object({
    start: isoDate,
    end: isoDate,
  })
  .refine((p) => Date.parse(p.start) <= Date.parse(p.end), {
    message: 'period.start must be on or before period.end',
  });

const sectionWithPicks = z.object({
  enabled: z.boolean(),
  picks: z.array(z.string()).default([]),
});

const customStatsSection = z.object({
  enabled: z.boolean(),
  selectedIds: z.array(z.string().uuid()).default([]),
});

const sectionsSchema = z.object({
  coverPage: z.literal(true),
  accountSummary: z.literal(true),
  transactionLedger: z.literal(true),
  coreStatistics: sectionWithPicks,
  consistencyDrawdown: sectionWithPicks,
  performanceRatios: sectionWithPicks,
  tradePerformance: sectionWithPicks,
  customStats: customStatsSection,
  keyMetricsBullets: z.boolean(),
  footerNotes: z.string().max(500).nullable(),
});

const baseShape = {
  period: periodSchema,
  accountIds: z.array(z.string().uuid()).min(1),
  mode: z.enum(TRADE_MODES),
  strategyId: z.string().uuid().nullable(),
  /**
   * Optional market whitelist (e.g. ['EURUSD', 'GBPUSD']). `null` or an empty
   * array means "all markets". When set, the trade query, stats pipeline, and
   * PDF header all respect this slice so the ledger reads as a labeled
   * segment rather than a full account statement.
   */
  markets: z.array(z.string().min(1).max(50)).nullable().default(null),
  sections: sectionsSchema,
};

export const baseReportConfigSchema = z.object(baseShape);

export type ReportConfig = z.infer<typeof baseReportConfigSchema>;

export interface AccountCurrencyRecord {
  id: string;
  currency: string;
}

/**
 * Builds a Zod schema aware of account currencies so the multi-account
 * same-currency refine can run synchronously.
 *
 * Usage: const schema = createReportConfigSchema(accountsById);
 *        schema.safeParse(config);
 */
export function createReportConfigSchema(
  accountsById: Record<string, AccountCurrencyRecord>,
) {
  return baseReportConfigSchema.superRefine((cfg, ctx) => {
    const missing = cfg.accountIds.filter((id) => !accountsById[id]);
    if (missing.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['accountIds'],
        message: `Unknown accountId(s): ${missing.join(', ')}`,
      });
      return;
    }
    const currencies = new Set(
      cfg.accountIds.map((id) => accountsById[id].currency),
    );
    if (currencies.size > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['accountIds'],
        message:
          'Consolidated reports require all selected accounts to share a currency.',
      });
    }
  });
}

export function defaultReportConfig(
  accountId: string,
  mode: TradeLedgerMode,
  period: { start: string; end: string },
): ReportConfig {
  return {
    period,
    accountIds: [accountId],
    mode,
    strategyId: null,
    markets: null,
    sections: {
      coverPage: true,
      accountSummary: true,
      transactionLedger: true,
      coreStatistics: { enabled: true, picks: [] },
      consistencyDrawdown: { enabled: false, picks: [] },
      performanceRatios: { enabled: false, picks: [] },
      tradePerformance: { enabled: false, picks: [] },
      customStats: { enabled: false, selectedIds: [] },
      keyMetricsBullets: true,
      footerNotes: null,
    },
  };
}
